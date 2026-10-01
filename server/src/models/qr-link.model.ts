import { Schema, model, type InferSchemaType } from 'mongoose';

import { QR_CARRIERS } from '../constants/index.js';

/**
 * The QR holds no medical data, only this revocable code
 * (`<EMERGENCY_BASE_URL>/<code>`). Revoking it kills every printed copy.
 */
const qrLinkSchema = new Schema(
  {
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    code: { type: String, required: true, unique: true },
    carrier: { type: String, enum: QR_CARRIERS, default: 'card' },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    revokedAt: Date,
  },
  { timestamps: true },
);

export type QrLink = InferSchemaType<typeof qrLinkSchema>;
export const QrLinkModel = model('QrLink', qrLinkSchema);
