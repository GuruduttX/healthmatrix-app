import { z } from 'zod';

import { connectDB } from '@/server/db';
import { env } from '@/server/env';
import { BookingModel, MemberModel } from '@/server/models';
import { syncBooking } from '@/server/pod-bookings';
import { verifySignature } from '@/server/webhook-signature';

/**
 * Mobilab must hear 200 within 10 seconds or it retries (1, 2, 4, 8, 16 minutes later, then gives
 * up). Filing the results gets this long; past it the reply goes out and the next screen load
 * files them instead.
 */
const FILE_WITHIN_MS = 7_000;

const event = z.object({
  event: z.string(),
  booking_id: z.string(),
});

const ok = () => new Response(null, { status: 200 });

/**
 * Mobilab's "report ready" webhook (`booking.complete`), sent once a booking's report is
 * generated. It says which booking, nothing more: the results are fetched from Mobilab and filed
 * to the member's records, so they're there without the app open. Public, so every call must
 * carry Mobilab's signature. Repeats and bookings we don't know get a 200 and nothing else, or
 * Mobilab would keep retrying.
 */
export async function POST(request: Request) {
  const delivery = request.headers.get('x-delivery-id') ?? '-';
  let secret: string | undefined;
  try {
    secret = env().MOBILAB_WEBHOOK_SECRET;
  } catch (error) {
    console.error('[mobilab-webhook] server environment is invalid:', error);
  }
  if (!secret) {
    // Not a 200: Mobilab retries, and the deliveries aren't lost while the secret is being set.
    console.error(`[mobilab-webhook] ${delivery}: MOBILAB_WEBHOOK_SECRET is not set`);
    return new Response(null, { status: 503 });
  }

  // The raw text, before any parsing: the signature is over these exact bytes.
  const raw = await request.text();
  if (!(await verifySignature(secret, raw, request.headers.get('x-signature-sha256')))) {
    console.warn(`[mobilab-webhook] ${delivery}: signature doesn't match, turned away`);
    return new Response(null, { status: 401 });
  }

  let body: z.infer<typeof event>;
  try {
    body = event.parse(JSON.parse(raw));
  } catch {
    console.warn(`[mobilab-webhook] ${delivery}: signed but not a booking event, ignored`);
    return ok();
  }
  if (body.event !== 'booking.complete') return ok();

  try {
    await connectDB();
    const booking = await BookingModel.findOne({ 'mobilab.bookingId': body.booking_id });
    if (!booking) {
      console.warn(`[mobilab-webhook] ${delivery}: no booking ${body.booking_id}, ignored`);
      return ok();
    }
    booking.mobilab!.webhookAt = new Date();
    if (booking.result) {
      await booking.save(); // A repeat: already filed.
      return ok();
    }

    const member = await MemberModel.findById(booking.member).select('dateOfBirth');
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`not filed within ${FILE_WITHIN_MS / 1000}s`)), FILE_WITHIN_MS),
    );
    await Promise.race([syncBooking(booking, member?.dateOfBirth, 'webhook'), timeout]);
    console.log(`[mobilab-webhook] ${delivery}: filed results for ${body.booking_id}`);
  } catch (error) {
    // Still a 200: the report is ready and Mobilab has said so. Marked due, so the member's next
    // screen load fetches the results instead.
    console.error(`[mobilab-webhook] ${delivery}: filing ${body.booking_id} failed:`, error);
    await BookingModel.updateOne(
      { 'mobilab.bookingId': body.booking_id, result: { $exists: false } },
      { $set: { 'mobilab.status': 'report_generated' }, $unset: { 'mobilab.checkedAt': 1 } },
    ).catch(() => undefined);
  }
  return ok();
}
