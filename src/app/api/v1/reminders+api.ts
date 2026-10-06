import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { ReminderModel } from '@/server/models';
import { reminderInput, toReminderFields, toReminderJson } from '@/server/reminders';

/** How many medicine reminders a member can keep. */
const MAX_REMINDERS = 50;

/** The signed-in member's medicine reminders, oldest first. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  const member = await requireMember(request);
  const reminders = await ReminderModel.find({ member: member._id, kind: 'medicine' }).sort({
    createdAt: 1,
  });
  return Response.json({ reminders: reminders.map(toReminderJson) });
});

/** Adds a medicine reminder. */
export const POST = handle(async (request: Request) => {
  const input = reminderInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);

  const count = await ReminderModel.countDocuments({ member: member._id, kind: 'medicine' });
  if (count >= MAX_REMINDERS) {
    throw new HttpError(400, `You can keep up to ${MAX_REMINDERS} medicines. Remove one first.`);
  }

  const reminder = await ReminderModel.create({
    member: member._id,
    kind: 'medicine',
    ...toReminderFields(input),
  });
  return Response.json({ reminder: toReminderJson(reminder) }, { status: 201 });
});
