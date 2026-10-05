import { type InferSchemaType } from 'mongoose';

import { POD_SITE_TYPES, POD_TIERS } from '../constants';
import { defineModel, mongoose } from '../mongoose';

/** A Cloudspital Arc screening pod. */
const podSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Sector 1 clubhouse"
    tier: { type: String, enum: POD_TIERS, required: true },
    siteType: { type: String, enum: POD_SITE_TYPES },
    address: String,
    hours: String, // "open till 8 pm"

    /** GeoJSON point, [longitude, latitude]. */
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

podSchema.index({ location: '2dsphere' });

export type Pod = InferSchemaType<typeof podSchema>;
export const PodModel = defineModel('Pod', podSchema);
