import { type InferSchemaType } from 'mongoose';

import { defineModel, mongoose } from '../mongoose';

/** Every QR scan is logged with time and place, and the family is alerted. */
const scanLogSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    qrLink: { type: mongoose.Schema.Types.ObjectId, ref: 'QrLink', required: true },
    scannedAt: { type: Date, default: Date.now },

    /** GeoJSON point, [longitude, latitude]. Absent if the scanner denied location. */
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined },
    },
    ip: String,
    userAgent: String,

    alertedContacts: [{ phone: String, channel: { type: String, enum: ['sms', 'whatsapp'] } }],
  },
  { timestamps: true },
);

scanLogSchema.index({ member: 1, scannedAt: -1 });

export type ScanLog = InferSchemaType<typeof scanLogSchema>;
export const ScanLogModel = defineModel('ScanLog', scanLogSchema);
