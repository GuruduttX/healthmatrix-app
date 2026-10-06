import { type InferSchemaType } from 'mongoose';

import { SPECIALTIES } from '../constants';
import { defineModel, mongoose } from '../mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    qualifications: String, // "MBBS, MD (Medicine)"
    registrationNumber: { type: String, required: true },
    /** The medical council that issued the registration. */
    council: String,
    specialties: { type: [String], enum: SPECIALTIES, default: ['general_medicine'] },
    languages: [String],
    city: String,
    state: String,
    photoUrl: String,
    telemedicineConsentAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type Doctor = InferSchemaType<typeof doctorSchema>;
export const DoctorModel = defineModel('Doctor', doctorSchema);
