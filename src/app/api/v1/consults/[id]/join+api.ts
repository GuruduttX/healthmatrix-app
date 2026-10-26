import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { ConsultModel } from '@/server/models';
import { isMissed, LATE_START_MINUTES } from '@/server/schedule';
import {
  ensureRoom,
  JOIN_OPENS_MS,
  memberIdentity,
  roomNameFor,
  videoToken,
} from '@/server/video';

/**
 * Opens the consult's Twilio room for the member, called once when they enter the waiting room
 * (and again only if the call drops). The member joins the room without camera or mic, which is
 * how the doctor's console sees them waiting; the doctor's Admit publishes the doctor's media,
 * and that is the app's cue to turn its own on. `admitted` is true once the doctor has started
 * the consult, so a member rejoining goes straight into the call. Matches `JoinResult` in
 * `features/consult-call/consult-call-api.ts`.
 */
export const POST = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const member = await requireMember(request);
  const consult = await ConsultModel.findOne({ _id: id, member: member._id });
  if (!consult) throw new HttpError(404, 'This consult no longer exists');

  if (consult.status === 'cancelled') {
    throw new HttpError(
      410,
      consult.cancelledBy === 'doctor'
        ? `The doctor cancelled this consult. ${consult.cancelReason ?? 'Please book another slot.'}`
        : 'This consult was cancelled',
    );
  }
  if (consult.status === 'completed') {
    return Response.json({ state: 'ended', endedAt: consult.endedAt?.toISOString() });
  }

  if (consult.status === 'scheduled') {
    const now = Date.now();
    const start = consult.scheduledAt.getTime();
    if (now < start - JOIN_OPENS_MS) {
      throw new HttpError(400, 'The waiting room opens 5 minutes before your consult');
    }
    // Either side may be up to `LATE_START_MINUTES` late; not started by then, it's missed.
    if (isMissed(consult, new Date(now))) {
      throw new HttpError(
        410,
        `The doctor didn’t start this consult within ${LATE_START_MINUTES} minutes of its time, so it has moved to your past consults. Please book another slot.`,
      );
    }
  }

  const roomName = roomNameFor(String(consult._id));
  await ensureRoom(String(consult._id));
  return Response.json({
    state: 'ready',
    roomName,
    token: await videoToken(memberIdentity(String(member._id)), roomName),
    admitted: consult.status === 'in_progress',
    startedAt: consult.startedAt?.toISOString(),
  });
});
