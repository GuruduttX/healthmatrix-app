import { Schema, model, type InferSchemaType } from 'mongoose';

import { BLOOD_GROUPS, PLAN_IDS } from '../constants/index.js';

const memberSchema = new Schema(
  {
    /** Twelve digits, shown as "HM 4829 1057 3316". */
    memberId: { type: String, required: true, unique: true, match: /^\d{12}$/ },
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    photoUrl: String,
    bloodGroup: { type: String, enum: BLOOD_GROUPS },

    abha: {
      number: String,
      address: String,
      linkedAt: Date,
    },

    plan: { type: String, enum: PLAN_IDS, default: 'essential' },
    memberSince: { type: Date, default: Date.now },
    validThru: Date,

    family: { type: Schema.Types.ObjectId, ref: 'Family' },
  },
  { timestamps: true },
);

export type Member = InferSchemaType<typeof memberSchema>;
export const MemberModel = model('Member', memberSchema);
