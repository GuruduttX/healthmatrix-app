import { Schema, model, type InferSchemaType } from 'mongoose';

import { SPECIALTIES } from '../constants/index.js';

const doctorSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    qualifications: String, // "MBBS, MD (Medicine)"
    registrationNumber: { type: String, required: true },
    specialties: { type: [String], enum: SPECIALTIES, default: ['general_medicine'] },
    photoUrl: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type Doctor = InferSchemaType<typeof doctorSchema>;
export const DoctorModel = model('Doctor', doctorSchema);
