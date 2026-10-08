import { type mongo, type Types } from 'mongoose';
import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { ReminderModel, VaccinationModel } from '@/server/models';
import { loadVaccinations } from '@/server/records';
import { dateKey } from '@/server/reminders';
import { istDate, istMidnight, toVaccinationJson } from '@/server/vaccinations';

const body = z.object({
  given: z.boolean(),
  /** The day it was given, India time. Defaults to today. */
  givenOn: dateKey.optional(),
});

/**
 * Marks one dose given (or not). Only `givenAt` on that dose changes, with a targeted update, so
 * nothing the doctor console wrote is touched. The dose's reminder is paused while it is marked
 * given, and its log tells the console the dose was given.
 */
export const PUT = handle(async (request: Request, { id, number }: Record<string, string>) => {
  const { given, givenOn } = body.parse(await request.json());
  const doseNumber = Number(number);
  if (!Number.isInteger(doseNumber) || doseNumber < 1) throw new HttpError(404, 'No such dose');

  await connectDB();
  const member = await requireMember(request);

  const vaccination = await VaccinationModel.findOne({ _id: id, member: member._id });
  if (!vaccination) throw new HttpError(404, 'This vaccine no longer exists');
  const dose = vaccination.doses.find((d) => d.number === doseNumber);
  if (!dose) throw new HttpError(404, 'No such dose');

  const today = istDate(new Date());
  const day = givenOn ?? today;
  if (given && day > today) throw new HttpError(400, 'A dose cannot be marked given in the future');

  await VaccinationModel.updateOne(
    { _id: vaccination._id, member: member._id, 'doses.number': doseNumber },
    given
      ? { $set: { 'doses.$.givenAt': istMidnight(day) } }
      : { $unset: { 'doses.$.givenAt': 1 } },
  );
  if (dose.reminder) {
    // The doctor console reads a dose as given from its reminder's log: an entry with
    // `takenAt`. Those entries are shaped `{ dueAt, takenAt }`, unlike the app's medicine dose
    // marks, so they are written to the collection directly instead of through this app's schema.
    const reminders = ReminderModel.collection as unknown as mongo.Collection<{
      member: Types.ObjectId;
      isActive: boolean;
      updatedAt: Date;
      log: { dueAt?: Date; takenAt?: Date }[];
    }>;
    const filter = { _id: dose.reminder, member: member._id };
    await reminders.updateOne(filter, {
      $set: { isActive: !given, updatedAt: new Date() },
      $pull: { log: { takenAt: { $exists: true } } },
    });
    if (given) {
      await reminders.updateOne(filter, {
        $push: { log: { dueAt: dose.dueOn, takenAt: istMidnight(day) } },
      });
    }
  }

  const [fresh] = await loadVaccinations(member._id, { _id: vaccination._id });
  return Response.json({ vaccination: toVaccinationJson(fresh!.vaccination, fresh!.doctor) });
});
