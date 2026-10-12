import { type Types } from 'mongoose';

import { HttpError } from './http';
import { FamilyLinkModel, MemberModel, type FamilyLink, type Member } from './models';

/** How many family members one person can add. */
export const MAX_FAMILY = 10;

/** The member fields a family view needs. Never the phone. */
export const FAMILY_MEMBER_FIELDS = 'name memberId photoKey gender bloodGroup dateOfBirth';

type MemberDoc = Pick<
  Member,
  'name' | 'memberId' | 'photoKey' | 'gender' | 'bloodGroup' | 'dateOfBirth'
> & { _id: Types.ObjectId };
type LinkDoc = Pick<FamilyLink, 'relation' | 'relationName'> & {
  _id: Types.ObjectId;
  createdAt?: Date;
};

/** The relation's own name, kept only for "other". */
const relationNameOf = (link: LinkDoc) =>
  link.relation === 'other' ? (link.relationName ?? undefined) : undefined;

/** Whole years since `dateOfBirth`, or undefined when it isn't known. */
function ageOf(dateOfBirth?: Date | null) {
  if (!dateOfBirth) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const birthday = new Date(now.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate());
  if (now < birthday) age -= 1;
  return age >= 0 ? age : undefined;
}

/** Someone in the member's family. Matches `FamilyMember` in `features/family/types.ts`. */
export function toFamilyMemberJson(member: MemberDoc, link: LinkDoc) {
  return {
    linkId: String(link._id),
    id: String(member._id),
    name: member.name,
    memberId: member.memberId,
    relation: link.relation ?? 'other',
    relationName: relationNameOf(link),
    /** Relative to the API base URL. */
    photoUrl: member.photoKey ? `/photos/${member.photoKey}` : undefined,
    gender: member.gender ?? undefined,
    bloodGroup: member.bloodGroup ?? undefined,
    age: ageOf(member.dateOfBirth),
    addedAt: link.createdAt?.toISOString(),
  };
}

/**
 * Someone who can see the member's records, because they added the member to their family.
 * Matches `FamilyViewer` in `features/family/types.ts`.
 */
export function toFamilyViewerJson(owner: MemberDoc, link: LinkDoc) {
  return {
    linkId: String(link._id),
    id: String(owner._id),
    name: owner.name,
    photoUrl: owner.photoKey ? `/photos/${owner.photoKey}` : undefined,
    relation: link.relation ?? 'other',
    relationName: relationNameOf(link),
    addedAt: link.createdAt?.toISOString(),
  };
}

/**
 * The family member `memberId` and the link that lets `viewerId` see them, or a 404. The 404 is
 * the same whether or not the member exists, so it never reveals who has an account.
 */
export async function requireFamilyMember(viewerId: Types.ObjectId, memberId: string) {
  const missing = () => new HttpError(404, 'This person isn’t in your family any more');
  if (!/^[a-f\d]{24}$/i.test(memberId)) throw missing();
  const link = await FamilyLinkModel.findOne({ owner: viewerId, member: memberId });
  if (!link) throw missing();
  const member = await MemberModel.findById(memberId).select(FAMILY_MEMBER_FIELDS);
  if (!member) throw missing();
  return { link, member };
}
