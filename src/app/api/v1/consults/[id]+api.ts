import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { ConsultModel } from '@/server/models';

const change = z.object({ status: z.literal('cancelled', 'Only cancelling is supported') });

/** Cancels one of the member's upcoming consults, which frees the slot for others. */
export const PATCH = handle(async (request: Request, { id }: Record<string, string>) => {
  change.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const consult = await ConsultModel.findOne({ _id: id, member: member._id });
  if (!consult) throw new HttpError(404, 'This appointment no longer exists');
  if (consult.status !== 'scheduled' || consult.scheduledAt <= new Date()) {
    throw new HttpError(400, 'This appointment can no longer be cancelled');
  }

  consult.status = 'cancelled';
  consult.cancelledAt = new Date();
  consult.cancelledBy = 'member';
  await consult.save();
  return new Response(null, { status: 204 });
});
