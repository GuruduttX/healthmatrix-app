import { type HydratedDocument, type Types } from 'mongoose';

import { HttpError } from './http';
import {
  findMobilabBooking,
  getMobilabResults,
  labCatalog,
  type MobilabRange,
  type MobilabReading,
} from './mobilab';
import { BookingModel, HealthRecordModel, type Booking } from './models';
import { istDate } from './vaccinations';

type BookingDoc = Booking & { _id: Types.ObjectId; createdAt: Date };
type Tone = 'neutral' | 'success' | 'warning' | 'danger';

/** Letters and digits that can't be misread when said aloud at a pod: no 0/O, 1/I/L. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Our reference for a booking, e.g. "HM-7K4QX9PA". The member can read it out at the pod. */
export function newBookingId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `HM-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

/**
 * What Mobilab is sent for the chosen checks and single tests. A check with a code goes as a
 * profile; one without (some have none) goes as its tests. Mobilab turns down a booking where a
 * test appears twice, so overlaps are refused here with a clearer message.
 */
export async function selectTests(profileIds: string[], testCodes: string[]) {
  const { tests, profiles } = await labCatalog();
  const known = new Set(tests.map((test) => test.code));

  const chosen = profileIds.map((id) => {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) throw new HttpError(400, 'That health check is no longer offered');
    return profile;
  });
  for (const code of testCodes) {
    if (!known.has(code)) throw new HttpError(400, 'One of those tests is no longer offered');
  }

  const all = [...chosen.flatMap((profile) => profile.tests.map((test) => test.code)), ...testCodes];
  if (!all.length) throw new HttpError(400, 'Choose at least one test');
  if (new Set(all).size !== all.length) {
    throw new HttpError(400, 'A test is in more than one of your choices. Remove one and try again.');
  }

  return {
    profileCodes: chosen.flatMap((profile) => (profile.code ? [profile.code] : [])),
    testCodes: [
      ...chosen.flatMap((profile) => (profile.code ? [] : profile.tests.map((test) => test.code))),
      ...testCodes,
    ],
    profileNames: chosen.map((profile) => profile.name),
    allTests: all,
  };
}

/** What each Mobilab status means to the member, as a flag on their booking. */
export function progressOf(status?: string | null): { label: string; tone: Tone } {
  switch (status) {
    case 'in_progress':
      return { label: 'Testing now', tone: 'neutral' };
    case 'completed':
    case 'in_review':
    case 'review_completed':
      return { label: 'Results being checked', tone: 'neutral' };
    case 'report_generated':
      return { label: 'Results ready', tone: 'success' };
    case 'retest_required':
      return { label: 'Retest needed', tone: 'warning' };
    case 'rejected':
      return { label: 'Cancelled by the pod', tone: 'danger' };
    case 'archived':
      return { label: 'Closed', tone: 'neutral' };
    default:
      return { label: 'Waiting for you at the pod', tone: 'neutral' };
  }
}

/** Only before the pod starts on it: once a sample is taken the booking stays where it is. */
export function canChangePod(booking: Pick<BookingDoc, 'status' | 'mobilab'>) {
  const status = booking.mobilab?.status;
  return booking.status === 'booked' && (!status || status === 'pending');
}

/** A pod booking as the app sees it. Matches `PodBooking` in `features/care/types.ts`. */
export function toPodBookingJson(booking: BookingDoc) {
  return {
    id: String(booking._id),
    reference: booking.mobilab!.bookingId,
    pod: { id: booking.pod!.id, name: booking.pod!.name },
    profiles: booking.profiles,
    testCount: booking.tests.length,
    /** Every test code booked, the checks' tests included. */
    tests: booking.tests,
    status: booking.status,
    progress: progressOf(booking.mobilab?.status),
    /** Still waiting for the member at the pod, so it can move to another pod. */
    canChangePod: canChangePod(booking),
    /** The pod screening record, once results are in. */
    recordId: booking.result ? String(booking.result) : undefined,
    /** India-time day it was booked, "2026-10-14". */
    date: istDate(booking.createdAt),
    createdAt: booking.createdAt.toISOString(),
  };
}

/** How often a booking's status is asked for while it waits; the webhook will replace this. */
const CHECK_EVERY_MS = 60_000;

/** "35.0 - 79.5", "< 130", "> 40" -> min and max; anything else is kept as words. */
function parseRange(text: string): MobilabRange & { text?: string } {
  const between = /^\s*(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)\s*$/.exec(text);
  if (between) return { min: Number(between[1]), max: Number(between[2]) };
  const below = /^\s*<=?\s*([\d.]+)\s*$/.exec(text);
  if (below) return { max: Number(below[1]) };
  const above = /^\s*>=?\s*([\d.]+)\s*$/.exec(text);
  if (above) return { min: Number(above[1]) };
  return { text: text.trim() };
}

/**
 * The range that applies to this person: Mobilab lists one per sex, sometimes per age band.
 * Ranges for the other sex are skipped; one with no sex or age applies to everyone.
 */
function rangeFor(reading: MobilabReading, sex: string, age?: number) {
  const raw = reading.normal_range;
  const ranges = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((range) =>
    typeof range === 'string' ? parseRange(range) : range,
  );
  const fits = (range: MobilabRange) =>
    (!range.gender || range.gender === sex) &&
    (age === undefined ||
      ((range.age_min == null || age >= range.age_min) &&
        (range.age_max == null || age <= range.age_max)));
  const range = ranges.find(fits) ?? ranges.find((r) => !r.gender || r.gender === sex);
  return {
    low: range?.min ?? undefined,
    high: range?.max ?? undefined,
    text: range && 'text' in range ? range.text : undefined,
  };
}

/** "Liver Function Test", "Liver Function Test + 1 more", or "Pod screening". */
function screeningTitle(profiles: string[], readings: MobilabReading[]) {
  if (profiles.length) {
    return profiles.length === 1 ? profiles[0]! : `${profiles[0]} + ${profiles.length - 1} more`;
  }
  return readings.length === 1 ? readings[0]!.test_name.trim() : 'Pod screening';
}

/**
 * Files a booking's results as a pod screening record. Readings without a value, or that the lab
 * rejected, are left out. Safe to call twice: one record per booking.
 */
async function fileResults(booking: HydratedDocument<BookingDoc>, dateOfBirth?: Date | null) {
  const results = await getMobilabResults(booking.mobilab!.bookingId);
  const age = dateOfBirth
    ? Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : undefined;

  const readings = results.tests.filter(
    (reading) => reading.value !== null && reading.status !== 'rejected',
  );
  const values = readings.map((reading) => {
    const { low, high, text } = rangeFor(reading, booking.sex, age);
    const value = reading.value!;
    return {
      name: reading.test_name.trim(),
      code: reading.test_code,
      value,
      unit: reading.unit ?? undefined,
      referenceRange: { low, high, text },
      flag:
        low !== undefined && value < low
          ? 'low'
          : high !== undefined && value > high
            ? 'high'
            : 'normal',
      method: reading.method ?? undefined,
      group: reading.profile_name?.trim() || undefined,
    };
  });

  try {
    const record = await HealthRecordModel.create({
      member: booking.member,
      type: 'pod_screening',
      source: 'pod',
      title: screeningTitle(booking.profiles, readings),
      recordedAt: new Date(),
      provider: booking.pod!.name,
      values,
      booking: booking._id,
      remarks: results.remarks?.trim() || undefined,
      disclaimers: results.disclaimers?.length ? results.disclaimers : undefined,
      isSample: results.is_test_mode || undefined,
    });
    booking.result = record._id;
  } catch (error) {
    // Another request filed it first.
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await HealthRecordModel.findOne({ booking: booking._id }).select('_id');
    booking.result = existing?._id;
  }
  booking.status = 'completed';
}

/**
 * Asks Mobilab where one booking is, and files its results once the report is out. `via` records
 * what filed them, so a missing webhook shows up as bookings filed by the app instead.
 */
export async function syncBooking(
  booking: HydratedDocument<BookingDoc>,
  dateOfBirth?: Date | null,
  via: 'webhook' | 'app' = 'app',
) {
  const found = await findMobilabBooking(booking.mobilab!.bookingId);
  booking.mobilab!.checkedAt = new Date();
  if (found) booking.mobilab!.status = found.status;

  if (found?.status === 'report_generated' && !booking.result) {
    await fileResults(booking, dateOfBirth);
    booking.mobilab!.filedVia = via;
  } else if (found?.status === 'rejected') {
    booking.status = 'cancelled';
  }
  await booking.save();
}

/**
 * Brings the member's open bookings up to date, at most once a minute each. A booking that can't
 * be checked keeps its last known status; the others still update.
 */
export async function syncMemberBookings(member: { _id: Types.ObjectId; dateOfBirth?: Date | null }) {
  const due = await BookingModel.find({
    member: member._id,
    status: 'booked',
    $or: [
      { 'mobilab.checkedAt': { $exists: false } },
      { 'mobilab.checkedAt': { $lt: new Date(Date.now() - CHECK_EVERY_MS) } },
    ],
  });
  await Promise.all(
    due.map((booking) =>
      syncBooking(booking as HydratedDocument<BookingDoc>, member.dateOfBirth).catch((error) =>
        console.error(`[pod-bookings] sync ${booking.mobilab?.bookingId} failed:`, error),
      ),
    ),
  );
}
