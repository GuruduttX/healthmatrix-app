import { type Types } from 'mongoose';

import { env } from './env';
import { HttpError } from './http';
import { EkaayUsageModel, type Member } from './models';

// Ekaay costs money on every question and every spoken answer, so each member gets a daily
// allowance by plan, quick bursts are slowed down, and the whole app has a daily ceiling. The
// counters live in MongoDB so they hold across server instances, and expire on their own.

const IST_MS = 330 * 60 * 1000;
const MINUTE_MS = 60_000;
/** How many of a member's latest answers can be read aloud. */
const SAID_KEPT = 30;

let indexed: Promise<unknown> | undefined;
/** The expiry index, made once per server instance: production doesn't build indexes on boot. */
const ensureIndex = () =>
  (indexed ??= EkaayUsageModel.createIndexes().catch((error: unknown) => {
    indexed = undefined;
    console.error('[ekaay-limits] could not create the expiry index:', String(error));
  }));

/** Today in India, where the limits reset at midnight, and when that midnight is. */
function today() {
  const ist = new Date(Date.now() + IST_MS);
  const day = ist.toISOString().slice(0, 10);
  const resetAt = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - IST_MS,
  );
  return { day, resetAt };
}

/** Adds `by` to a counter and returns its new value. */
async function add(key: string, by: number, exp: Date) {
  const doc = await EkaayUsageModel.findOneAndUpdate(
    { _id: key },
    { $inc: { n: by }, $setOnInsert: { exp } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  return doc?.n ?? by;
}

export type EkaayUse = 'ask' | 'hear' | 'speak';

/** An answer can be played again, so reading aloud gets more room than asking. */
const SPEAK_PER_ANSWER = 3;

const BURST = 'You’re asking Ekaay very quickly. Wait a minute, then try again.';
const BUSY = 'Ekaay is very busy today. Try again later, or talk to a doctor.';

/**
 * Counts one use of Ekaay by the member: `ask` for a question, `hear` for a spoken question
 * written down, `speak` for an answer read aloud. Throws a 429 the member can read once they're over a limit. Call `refund` when
 * the answer couldn't be given, so a failure doesn't use up the day.
 */
export async function takeEkaay(member: Member & { _id: Types.ObjectId }, use: EkaayUse) {
  await ensureIndex();
  const { EKAAY_FREE_PER_DAY, EKAAY_PAID_PER_DAY, EKAAY_PER_MINUTE, EKAAY_APP_PER_DAY } = env();
  const id = String(member._id);
  const { day, resetAt } = today();
  const minute = Math.floor(Date.now() / MINUTE_MS);
  const dayExp = new Date(resetAt.getTime() + 60 * MINUTE_MS);
  const paid = member.plan !== 'essential';
  const perDay =
    (paid ? EKAAY_PAID_PER_DAY : EKAAY_FREE_PER_DAY) * (use === 'speak' ? SPEAK_PER_ANSWER : 1);

  // Every attempt counts against the burst limit, so hammering the endpoint stays blocked.
  const burst = await add(`${use}:min:${id}:${minute}`, 1, new Date((minute + 2) * MINUTE_MS));
  if (burst > EKAAY_PER_MINUTE) throw new HttpError(429, BURST);

  // A spoken question is written down, then asked: allow as many as questions, not more.
  const own = await add(`${use}:day:${id}:${day}`, 1, dayExp);
  if (own > perDay) {
    await add(`${use}:day:${id}:${day}`, -1, dayExp);
    if (use === 'speak') {
      throw new HttpError(429, 'Ekaay has read a lot aloud today. You can still read its answers.');
    }
    throw new HttpError(
      429,
      `You’ve asked Ekaay ${perDay} questions today, the most for ${
        paid ? 'your plan' : 'the free plan'
      }. It resets at midnight.${paid ? '' : ' Plus members get more each day.'} For anything urgent, talk to a doctor.`,
    );
  }

  if (use === 'ask') {
    const all = await add(`ask:app:${day}`, 1, dayExp);
    if (all > EKAAY_APP_PER_DAY) {
      await Promise.all([add(`ask:app:${day}`, -1, dayExp), add(`ask:day:${id}:${day}`, -1, dayExp)]);
      console.error(`[ekaay-limits] the app's ${EKAAY_APP_PER_DAY} questions for ${day} are used up`);
      throw new HttpError(429, BUSY);
    }
  }

  return {
    refund: () =>
      Promise.all([
        add(`${use}:day:${id}:${day}`, -1, dayExp),
        use === 'ask' ? add(`ask:app:${day}`, -1, dayExp) : null,
      ]).catch(() => undefined),
  };
}

async function hashOf(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Remembers an answer Ekaay gave the member, so it can be read aloud. */
export async function rememberAnswer(member: { _id: Types.ObjectId }, text: string) {
  await ensureIndex();
  await EkaayUsageModel.updateOne(
    { _id: `said:${String(member._id)}` },
    {
      $push: { said: { $each: [await hashOf(text)], $slice: -SAID_KEPT } },
      $set: { exp: new Date(Date.now() + 7 * 24 * 60 * MINUTE_MS) },
    },
    { upsert: true },
  );
}

/** Whether `text` is one of Ekaay's recent answers to this member. Nothing else is read aloud. */
export async function isEkaayAnswer(member: { _id: Types.ObjectId }, text: string) {
  return Boolean(
    await EkaayUsageModel.exists({ _id: `said:${String(member._id)}`, said: await hashOf(text) }),
  );
}
