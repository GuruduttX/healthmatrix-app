import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import {
  findOwnReminder,
  reminderInput,
  toReminderFields,
  toReminderJson,
} from '@/server/reminders';

/**
 * Changes a reminder. Send only what changed (e.g. `{ isActive: false }` to pause it); it is
 * merged onto the saved reminder and the whole is checked again.
 */
export const PATCH = handle(async (request: Request, { id }: Record<string, string>) => {
  const patch = (await request.json()) as Record<string, unknown>;
  await connectDB();
  const member = await requireMember(request);
  const reminder = await findOwnReminder(member._id, id);

  // Unknown keys such as `id` and `log` are dropped by the schema.
  const input = reminderInput.parse({ ...toReminderJson(reminder), ...patch });

  reminder.set(toReminderFields(input));
  await reminder.save();
  return Response.json({ reminder: toReminderJson(reminder) });
});

/** Deletes a reminder and its dose history. */
export const DELETE = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const member = await requireMember(request);
  const reminder = await findOwnReminder(member._id, id);
  await reminder.deleteOne();
  return new Response(null, { status: 204 });
});
