import { env } from './env';
import { HttpError } from './http';

/**
 * Twilio Video for consults. Each consult has its own two-person room, named `consult-<id>`,
 * which both this server and the doctor console create on demand, so whichever side gets there
 * first opens it. The console ends it when the doctor ends the consult.
 */

/** The waiting room opens this long before the slot starts. */
export const JOIN_OPENS_MS = 5 * 60 * 1000;
/** A doctor running late can still start the consult this long after the slot ends. */
export const JOIN_GRACE_MS = 30 * 60 * 1000;
/** Access tokens last this long; Twilio caps them at 24 hours. */
const TOKEN_TTL_S = 4 * 60 * 60;
/** Twilio's India media region, closest to members and doctors. */
const MEDIA_REGION = 'in1';

export const roomNameFor = (consultId: string) => `consult-${consultId}`;
/** Identities as the two sides see each other in the room. Mirrored in the console. */
export const memberIdentity = (memberId: string) => `member-${memberId}`;

function videoConfig() {
  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET } = env();
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET) {
    console.error(
      '[video] Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET for consults',
    );
    throw new HttpError(503, 'Video consults are not set up yet');
  }
  return {
    accountSid: TWILIO_ACCOUNT_SID,
    keySid: TWILIO_API_KEY_SID,
    keySecret: TWILIO_API_KEY_SECRET,
  };
}

const encoder = new TextEncoder();

function base64Url(input: string | ArrayBuffer) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * A Twilio access token that lets `identity` join one room, signed with Web Crypto so it runs the
 * same in the dev server and on EAS Hosting. Format: twilio.com/docs/iam/access-tokens.
 */
export async function videoToken(identity: string, roomName: string) {
  const { accountSid, keySid, keySecret } = videoConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' };
  const payload = {
    jti: `${keySid}-${now}`,
    iss: keySid,
    sub: accountSid,
    iat: now,
    exp: now + TOKEN_TTL_S,
    grants: { identity, video: { room: roomName } },
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned));
  return `${unsigned}.${base64Url(signature)}`;
}

type TwilioRoom = { sid: string; status: string };

async function roomsApi(path: string, form?: Record<string, string>) {
  const { keySid, keySecret } = videoConfig();
  return fetch(`https://video.twilio.com/v1/${path}`, {
    method: form ? 'POST' : 'GET',
    headers: {
      authorization: `Basic ${btoa(`${keySid}:${keySecret}`)}`,
      ...(form && { 'content-type': 'application/x-www-form-urlencoded' }),
    },
    body: form && new URLSearchParams(form).toString(),
  });
}

/** The consult's live room, opening it if neither side has yet. */
export async function ensureRoom(consultId: string) {
  const name = roomNameFor(consultId);
  const find = async () => {
    // Looking a room up by its name finds it only while it is in progress.
    const response = await roomsApi(`Rooms/${name}`);
    return response.ok ? ((await response.json()) as TwilioRoom) : null;
  };

  const existing = await find();
  if (existing) return existing;

  const created = await roomsApi('Rooms', {
    UniqueName: name,
    Type: 'group',
    MaxParticipants: '2',
    MediaRegion: MEDIA_REGION,
    // Kept open briefly when both leave, so a dropped call can rejoin the same room.
    EmptyRoomTimeout: '10',
    UnusedRoomTimeout: '10',
  });
  if (created.ok) return (await created.json()) as TwilioRoom;

  // The console opened it at the same moment.
  const raced = await find();
  if (raced) return raced;

  const error = (await created.json().catch(() => ({}))) as { code?: number; message?: string };
  console.error(`[video] Could not open room ${name}: ${error.code} ${error.message}`);
  throw new HttpError(503, 'We couldn’t start the video call. Try again in a moment.');
}
