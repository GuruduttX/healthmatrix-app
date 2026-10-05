import { Schema, model, type InferSchemaType } from 'mongoose';

import { READING_FLAGS, RECORD_SOURCES, RECORD_TYPES } from '../constants/index.js';

const valueSchema = new Schema(
  {
    name: { type: String, required: true }, // "LDL cholesterol"
    code: String, // stable key for trends, e.g. "ldl"
    value: { type: Number, required: true },
    unit: String,
    referenceRange: { low: Number, high: Number, text: String },
    flag: { type: String, enum: READING_FLAGS },
  },
  { _id: false },
);

/** One entry on the records timeline: pod result, lab PDF, prescription or vaccine. */
const healthRecordSchema = new Schema(
  {
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    type: { type: String, enum: RECORD_TYPES, required: true },
    source: { type: String, enum: RECORD_SOURCES, required: true },
    title: { type: String, required: true },
    recordedAt: { type: Date, required: true },

    /** Where it came from: pod name, lab, or doctor. */
    provider: String,
    pod: { type: Schema.Types.ObjectId, ref: 'Pod' },
    consult: { type: Schema.Types.ObjectId, ref: 'Consult' },

    files: [{ url: String, mimeType: String, pages: Number }],
    values: [valueSchema],

    /** Ekaay's plain-language note on this record. */
    ekaayNote: String,
  },
  { timestamps: true },
);

healthRecordSchema.index({ member: 1, recordedAt: -1 });
healthRecordSchema.index({ member: 1, 'values.code': 1, recordedAt: 1 });

export type HealthRecord = InferSchemaType<typeof healthRecordSchema>;
export const HealthRecordModel = model('HealthRecord', healthRecordSchema);
