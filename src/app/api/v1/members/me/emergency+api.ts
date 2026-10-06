import { z } from 'zod';

import { PHONE_PATTERN, requireMember, toMemberJson } from '@/server/auth';
import { BLOOD_GROUPS, EMERGENCY_FIELDS } from '@/server/constants';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { EmergencyProfileModel, type EmergencyProfile, type Member } from '@/server/models';

/** The emergency profile as the app sees it. Matches `EmergencyProfile` in `features/card`. */
function toEmergencyJson(member: Member, profile: EmergencyProfile | null) {
  return {
    bloodGroup: member.bloodGroup ?? undefined,
    allergies: profile?.allergies ?? [],
    conditions: profile?.conditions ?? [],
    medicines: profile?.medicines ?? [],
    emergencyContacts: (profile?.emergencyContacts ?? []).map((contact) => ({
      name: contact.name,
      relation: contact.relation ?? undefined,
      phone: contact.phone,
    })),
    organDonor: profile?.organDonor ?? undefined,
    insurance: profile?.insurance?.provider
      ? { provider: profile.insurance.provider, policyNumber: profile.insurance.policyNumber ?? undefined }
      : undefined,
    visibleFields: profile?.visibleFields ?? [...EMERGENCY_FIELDS],
  };
}

/** The signed-in member's emergency profile. Members who never saved one get an empty one. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const profile = await EmergencyProfileModel.findOne({ member: member._id });
  return Response.json({ profile: toEmergencyJson(member, profile) });
});

const items = (what: string) =>
  z
    .array(z.string().trim().min(1).max(80, `Keep each ${what} under 80 letters`))
    .max(20, `Add up to 20 ${what}s`);

/** "+91 98765-43210" -> "9876543210" */
const phone = z
  .string()
  .transform((value) => value.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(PHONE_PATTERN, 'Enter a 10-digit mobile number for each contact'));

const update = z
  .object({
    bloodGroup: z.enum(BLOOD_GROUPS).nullable(),
    allergies: items('allergy'),
    conditions: items('condition'),
    medicines: items('medicine'),
    emergencyContacts: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Enter a name for each contact').max(60),
          relation: z.string().trim().max(30).optional(),
          phone,
        }),
      )
      .max(5, 'Add up to 5 contacts'),
    organDonor: z.boolean().nullable(),
    insurance: z
      .object({
        provider: z.string().trim().min(1, 'Enter the insurer’s name').max(60),
        policyNumber: z.string().trim().max(40).optional(),
      })
      .nullable(),
    visibleFields: z.array(z.enum(EMERGENCY_FIELDS)),
  })
  .partial();

/** Changes any part of the emergency profile. `null` clears a field. */
export const PATCH = handle(async (request: Request) => {
  const { bloodGroup, organDonor, insurance, ...lists } = update.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  // Blood group lives on the member: it is printed on the card as well.
  if (bloodGroup !== undefined) {
    member.bloodGroup = bloodGroup ?? undefined;
    await member.save();
  }

  const $set: Record<string, unknown> = { ...lists };
  const $unset: Record<string, 1> = {};
  if (organDonor === null) $unset.organDonor = 1;
  else if (organDonor !== undefined) $set.organDonor = organDonor;
  if (insurance === null) $unset.insurance = 1;
  else if (insurance !== undefined) $set.insurance = insurance;

  const profile = await EmergencyProfileModel.findOneAndUpdate(
    { member: member._id },
    { $set, ...(Object.keys($unset).length && { $unset }) },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  return Response.json({ profile: toEmergencyJson(member, profile), member: toMemberJson(member) });
});
