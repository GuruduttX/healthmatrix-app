import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { handle, HttpError } from '@/server/http';
import { ConsultModel } from '@/server/models';
import { DEFAULT_CONSULT_MINUTES } from '@/server/schedule';
import {
  ensureRoom,
  JOIN_GRACE_MS,
  JOIN_OPENS_MS,
  memberIdentity,
  roomNameFor,
  videoToken,
} from '@/server/video';

/**
 * The consult's waiting room. The app calls this every few seconds while the member waits, which
 * tells the console they are there. Once the doctor starts the consult in the console it answers
 * with the room to join and a token for it. Matches `JoinResult` in `features/consult-call`.
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

  const now = Date.now();
  const start = consult.scheduledAt.getTime();
  if (consult.status === 'scheduled') {
    if (now < start - JOIN_OPENS_MS) {
      throw new HttpError(400, 'The waiting room opens 5 minutes before your consult');
    }
    const minutes = consult.durationMinutes ?? DEFAULT_CONSULT_MINUTES;
    if (now > start + minutes * 60_000 + JOIN_GRACE_MS) {
      throw new HttpError(410, 'The doctor did not start this consult. Please book another slot.');
    }
  }

  // A targeted update, so it never overwrites the console starting the consult at the same time.
  await ConsultModel.updateOne({ _id: consult._id }, { $set: { memberLobbyAt: new Date(now) } });

  if (consult.status === 'scheduled') return Response.json({ state: 'waiting' });

  const roomName = roomNameFor(String(consult._id));
  await ensureRoom(String(consult._id));
  return Response.json({
    state: 'live',
    roomName,
    token: await videoToken(memberIdentity(String(member._id)), roomName),
    startedAt: consult.startedAt?.toISOString(),
  });
});

/** The member left the waiting room, so the console stops showing them as waiting. */
export const DELETE = handle(async (request: Request, { id }: Record<string, string>) => {
  await connectDB();
  const member = await requireMember(request);
  await ConsultModel.updateOne({ _id: id, member: member._id }, { $unset: { memberLobbyAt: 1 } });
  return new Response(null, { status: 204 });
});
