import { z } from 'zod';

import { hashOtp, OTP_RESEND_MS, OTP_TTL_MS, PHONE_PATTERN } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { MemberModel, OtpChallengeModel } from '@/server/models';
import { sendOtp } from '@/server/otp';

const phone = z.string().regex(PHONE_PATTERN, 'Enter a valid 10-digit mobile number');

/** "login" needs an existing account; "signup" needs a free number and the member's name. */
const body = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('login'), phone }),
  z.object({
    intent: z.literal('signup'),
    phone,
    name: z.string({ error: 'Enter your name' }).trim().min(2, 'Enter your name').max(60),
  }),
]);

/** Step 1 of sign-in: send a one-time code to the phone. */
export const POST = handle(async (request: Request) => {
  const input = body.parse(await request.json());
  const { phone } = input;
  await connectDB();

  const hasAccount = Boolean(await MemberModel.exists({ phone }));
  if (input.intent === 'login' && !hasAccount) {
    throw new HttpError(404, 'No account uses this number. Create an account instead.');
  }
  if (input.intent === 'signup' && hasAccount) {
    throw new HttpError(409, 'An account already uses this number. Log in instead.');
  }

  const recent = await OtpChallengeModel.findOne({ phone }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_MS) {
    throw new HttpError(429, 'Please wait a few seconds before asking for another code');
  }

  // Send first, so a failed SMS leaves no challenge behind to block a retry.
  const delivery = await sendOtp(phone);
  await OtpChallengeModel.deleteMany({ phone });
  await OtpChallengeModel.create({
    phone,
    name: input.intent === 'signup' ? input.name : undefined,
    codeHash: delivery.provider === 'dev' ? await hashOtp(phone, delivery.code) : undefined,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return Response.json({
    sent: true,
    isNewMember: !hasAccount,
    // Only when no SMS provider is set up, which `sendOtp` refuses in production.
    ...(delivery.provider === 'dev' && { devCode: delivery.code }),
  });
});
