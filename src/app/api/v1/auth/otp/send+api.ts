import { z } from 'zod';

import { generateOtp, hashOtp, OTP_RESEND_MS, OTP_TTL_MS, PHONE_PATTERN } from '@/server/auth';
import { connectDB } from '@/server/db';
import { isProduction } from '@/server/env';
import { handle, HttpError } from '@/server/http';
import { MemberModel, OtpChallengeModel } from '@/server/models';

const body = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  phone: z.string().regex(PHONE_PATTERN, 'Enter a valid 10-digit mobile number'),
});

/** Step 1 of sign-in: send a one-time code to the phone. */
export const POST = handle(async (request: Request) => {
  const { name, phone } = body.parse(await request.json());
  await connectDB();

  const recent = await OtpChallengeModel.findOne({ phone }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_MS) {
    throw new HttpError(429, 'Please wait a few seconds before asking for another code');
  }

  const code = generateOtp();
  await OtpChallengeModel.deleteMany({ phone });
  await OtpChallengeModel.create({
    phone,
    name,
    codeHash: await hashOtp(phone, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  // No SMS provider is connected yet. Outside production the code is logged and returned so
  // sign-in can be tested; in production we refuse rather than leak it.
  if (isProduction()) {
    throw new HttpError(503, 'Sign-in by SMS is not set up yet');
  }
  console.info(`[auth] OTP for ${phone}: ${code}`);

  const isNewMember = !(await MemberModel.exists({ phone }));
  return Response.json({ sent: true, isNewMember, devCode: code });
});
