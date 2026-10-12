import { type Types } from 'mongoose';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { FAMILY_MEMBER_FIELDS, toFamilyMemberJson, toFamilyViewerJson } from '@/server/family';
import { handle } from '@/server/http';
import { FamilyLinkModel, type Member } from '@/server/models';

type Populated<K extends string> = {
  [key in K]: (Member & { _id: Types.ObjectId }) | null;
};

/**
 * The member's family, in the order they were added, and the people who can see the member's
 * own records (they added the member to their family), so the member can take that back.
 */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const me = await requireMember(request);

  const [mine, viewers] = await Promise.all([
    FamilyLinkModel.find({ owner: me._id })
      .sort({ createdAt: 1 })
      .populate<Populated<'member'>>('member', FAMILY_MEMBER_FIELDS),
    FamilyLinkModel.find({ member: me._id })
      .sort({ createdAt: 1 })
      .populate<Populated<'owner'>>('owner', FAMILY_MEMBER_FIELDS),
  ]);

  return Response.json({
    members: mine.flatMap((link) => (link.member ? [toFamilyMemberJson(link.member, link)] : [])),
    viewers: viewers.flatMap((link) => (link.owner ? [toFamilyViewerJson(link.owner, link)] : [])),
  });
});
