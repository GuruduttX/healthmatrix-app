import { type InferSchemaType } from 'mongoose';

import { BLOOD_GROUPS, GENDERS, PLAN_IDS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

const memberSchema = new mongoose.Schema(
  {
    /** Twelve digits, shown as "HM 4829 1057 3316". */
    memberId: { type: String, required: true, unique: true, match: /^\d{12}$/ },
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    dateOfBirth: Date,
    gender: { type: String, enum: GENDERS },

    /**
     * Profile photo, a small JPEG kept on the member. It is served at /photos/<photoKey>; the key
     * is random and changes on every upload, so the URL is unguessable and safe to cache.
     */
    photoKey: { type: String, unique: true, sparse: true },
    photoData: { type: Buffer, select: false },
    photoMimeType: { type: String, select: false },
    bloodGroup: { type: String, enum: BLOOD_GROUPS },

    abha: {
      number: String,
      address: String,
      linkedAt: Date,
    },

    plan: { type: String, enum: PLAN_IDS, default: 'essential' },
    memberSince: { type: Date, default: Date.now },
    validThru: Date,

    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  },
  { timestamps: true },
);

export type Member = InferSchemaType<typeof memberSchema>;
export const MemberModel = defineModel('Member', memberSchema);
