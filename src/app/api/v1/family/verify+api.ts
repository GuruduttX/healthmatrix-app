import { z } from 'zod';

import {
  generateMemberId,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  PHONE_PATTERN,
  requireMember,
} from '@/server/auth';
import { connectDB } from '@/server/db';
import { ensureQrLink } from '@/server/emergency';
import { MAX_FAMILY, toFamilyMemberJson } from '@/server/family';
import { handle, HttpError } from '@/server/http';
import { FamilyInviteModel, FamilyLinkModel, MemberModel } from '@/server/models';
import { checkTwilioOtp } from '@/server/otp';

const body = z.object({
  phone: z.string().regex(PHONE_PATTERN, 'Enter a valid 10-digit mobile number'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

/**
 * Step 2 of adding a family member: checks the code sent to their phone, then adds them. A number
 * with no HealthMatrix account gets one, in the name given in step 1; they can sign in to it
 * later with the same number.
 */
export const POST = handle(async (request: Request) => {
  const { phone, code } = body.parse(await request.json());
  await connectDB();
  const me = await requireMember(request);

  const invite = await FamilyInviteModel.findOne({
    owner: me._id,
    phone,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!invite) throw new HttpError(400, 'This code has expired. Ask for a new one.');

  // An invite without a hash was sent by Twilio Verify, which checks its own codes.
  const check = invite.codeHash
    ? invite.codeHash === (await hashOtp(phone, code))
      ? 'approved'
      : 'wrong'
    : await checkTwilioOtp(phone, code);
  if (check === 'expired') {
    await invite.deleteOne();
    throw new HttpError(400, 'This code has expired. Ask for a new one.');
  }
  if (check === 'wrong') {
    invite.attempts += 1;
    if (invite.attempts >= OTP_MAX_ATTEMPTS) {
      await invite.deleteOne();
      throw new HttpError(400, 'Too many wrong codes. Ask for a new one.');
    }
    await invite.save();
    throw new HttpError(400, 'That code isn’t right. Check it with them and try again.');
  }
  await invite.deleteOne();

  if ((await FamilyLinkModel.countDocuments({ owner: me._id })) >= MAX_FAMILY) {
    throw new HttpError(400, `You can add up to ${MAX_FAMILY} family members.`);
  }

  let member = await MemberModel.findOne({ phone });
  if (!member) {
    member = await MemberModel.create({
      phone,
      name: invite.name,
      memberId: await generateMemberId(),
    });
    // Every account gets its emergency QR straight away, as on sign-up.
    await ensureQrLink(member._id);
  }
  if (member._id.equals(me._id)) throw new HttpError(400, 'That’s your own number.');

  const link = await FamilyLinkModel.findOneAndUpdate(
    { owner: me._id, member: member._id },
    { $setOnInsert: { relation: invite.relation } },
    { upsert: true, new: true },
  );
  return Response.json({ member: toFamilyMemberJson(member, link) }, { status: 201 });
});
