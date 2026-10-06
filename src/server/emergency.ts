import { type Types } from 'mongoose';

import { env } from './env';
import { QrLinkModel } from './models';

/** No 0/O or 1/I, so a code printed under the QR can be read out over the phone. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 12;

/** Twelve characters from 32, about 60 bits: too many to guess by scanning codes in order. */
function generateQrCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** The member's active card QR, created on first use. Every member has exactly one. */
export function ensureQrLink(member: Types.ObjectId) {
  return QrLinkModel.findOneAndUpdate(
    { member, carrier: 'card', status: 'active' },
    { $setOnInsert: { code: generateQrCode() } },
    { upsert: true, returnDocument: 'after' },
  ).orFail();
}

/** The public link a QR opens: EMERGENCY_BASE_URL followed by the code. */
export function emergencyUrl(code: string) {
  return `${env().EMERGENCY_BASE_URL.replace(/\/+$/, '')}/${code}`;
}
