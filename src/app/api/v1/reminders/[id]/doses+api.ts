import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle } from '@/server/http';
import { doseInput, findOwnReminder, toReminderJson, trimLog } from '@/server/reminders';

/** Marks one dose taken or skipped, or clears the mark with `status: null`. */
export const PUT = handle(async (request: Request, { id }: Record<string, string>) => {
  const { date, time, status } = doseInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);
  const reminder = await findOwnReminder(member._id, id);

  const others = reminder.log
    .filter((entry) => entry.date !== date || entry.time !== time)
    .map((entry) => ({ date: entry.date, time: entry.time, status: entry.status, at: entry.at }));
  const marked = status ? [...others, { date, time, status, at: new Date() }] : others;
  reminder.set('log', trimLog(marked));
  await reminder.save();
  return Response.json({ reminder: toReminderJson(reminder) });
});
