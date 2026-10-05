import { type InferSchemaType } from 'mongoose';

import { SPECIALTIES } from '../constants';
import { defineModel, mongoose } from '../mongoose';

const doctorSchema = new mongoose.Schema(
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
export const DoctorModel = defineModel('Doctor', doctorSchema);
