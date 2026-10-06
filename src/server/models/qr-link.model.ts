import { type InferSchemaType } from 'mongoose';

import { QR_CARRIERS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/**
 * The QR holds no medical data, only this revocable code
 * (`<EMERGENCY_BASE_URL>/<code>`). Revoking it kills every printed copy.
 */
const qrLinkSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    code: { type: String, required: true, unique: true },
    carrier: { type: String, enum: QR_CARRIERS, default: 'card' },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    revokedAt: Date,
  },
  { timestamps: true },
);

/** One active code per member and carrier; revoked ones are kept for the scan history. */
qrLinkSchema.index(
  { member: 1, carrier: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export type QrLink = InferSchemaType<typeof qrLinkSchema>;
export const QrLinkModel = defineModel('QrLink', qrLinkSchema);
