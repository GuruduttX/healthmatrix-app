import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { ConsultRequestModel } from '@/server/models';

const change = z.object({ status: z.literal('withdrawn', 'Only withdrawing is supported') });

/** Withdraws one of the member's requests the doctor hasn't answered yet. */
export const PATCH = handle(async (request: Request, { id }: Record<string, string>) => {
  change.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  // Conditional, so a doctor approving at the same moment wins cleanly: then this matches nothing.
  const result = await ConsultRequestModel.updateOne(
    { _id: id, member: member._id, status: 'pending' },
    { $set: { status: 'withdrawn', respondedAt: new Date() } },
  );
  if (!result.modifiedCount) {
    throw new HttpError(409, 'The doctor has already answered this request. Pull down to refresh.');
  }
  return new Response(null, { status: 204 });
});
