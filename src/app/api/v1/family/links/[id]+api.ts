import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { FamilyLinkModel } from '@/server/models';

/**
 * Ends one family link. Either side may: the person who added a member removes them from their
 * family, or the member stops them seeing their records. Adding them again needs a new OTP.
 */
export const DELETE = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const me = await requireMember(request);
  const link = await FamilyLinkModel.findOne({
    _id: id,
    $or: [{ owner: me._id }, { member: me._id }],
  });
  if (!link) throw new HttpError(404, 'This family link no longer exists');
  await link.deleteOne();
  return new Response(null, { status: 204 });
});
