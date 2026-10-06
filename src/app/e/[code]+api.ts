import { connectDB } from '@/server/db';
import { emergencyPageHtml, notFoundPageHtml } from '@/server/emergency-page';
import { handle } from '@/server/http';
import { EmergencyProfileModel, MemberModel, QrLinkModel, ScanLogModel } from '@/server/models';

/**
 * The public page an emergency QR opens: plain HTML, no app and no JavaScript, so it loads fast
 * on any phone camera. It shows only the fields the member chose to make visible.
 */
export const GET = handle(async (request: Request, { code }: Record<string, string>) => {
  await connectDB();
  const link = await QrLinkModel.findOne({ code: code.toUpperCase(), status: 'active' });
  const member = link && (await MemberModel.findById(link.member));
  if (!link || !member) return page(notFoundPageHtml(), 404);

  const profile = await EmergencyProfileModel.findOne({ member: member._id });

  // A failed log must never keep the page from a responder.
  await ScanLogModel.create({
    member: member._id,
    qrLink: link._id,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent') ?? undefined,
  }).catch((error: unknown) => console.error('[scan-log]', error));

  return page(emergencyPageHtml(member, profile));
});

function page(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Medical details: never cached, indexed, or leaked to the next site through the referrer.
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
    },
  });
}
