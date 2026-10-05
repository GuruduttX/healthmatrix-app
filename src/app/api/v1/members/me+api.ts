import { z } from 'zod';

import { requireMember, toMemberJson } from '@/server/auth';
import { GENDERS } from '@/server/constants';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';

/** The signed-in member. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ member: toMemberJson(member) });
});

const profile = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60, 'Keep your name under 60 letters'),
  /** An empty string clears the email. */
  email: z.union([z.literal(''), z.email('Enter a valid email address').max(120)]).optional(),
  gender: z.enum(GENDERS).nullable().optional(),
});

/** Updates the signed-in member's profile. The phone number is the login, so it is not editable. */
export const PATCH = handle(async (request: Request) => {
  const { name, email, gender } = profile.partial().parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  if (name !== undefined) member.name = name;
  if (email !== undefined) member.email = email || undefined;
  if (gender !== undefined) member.gender = gender ?? undefined;
  await member.save();

  return Response.json({ member: toMemberJson(member) });
});
