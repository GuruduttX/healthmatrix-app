import { Schema, model, type InferSchemaType } from 'mongoose';

/** A slot booked at a pod for specific tests. */
const bookingSchema = new Schema(
  {
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    pod: { type: Schema.Types.ObjectId, ref: 'Pod', required: true },
    tests: { type: [String], required: true }, // ["hba1c"]
    slotAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no_show'],
      default: 'booked',
    },

    /** Set when a doctor ordered the tests, so results flow back to them. */
    orderedByConsult: { type: Schema.Types.ObjectId, ref: 'Consult' },
    result: { type: Schema.Types.ObjectId, ref: 'HealthRecord' },
  },
  { timestamps: true },
);

bookingSchema.index({ member: 1, slotAt: -1 });
bookingSchema.index({ pod: 1, slotAt: 1 });

export type Booking = InferSchemaType<typeof bookingSchema>;
export const BookingModel = model('Booking', bookingSchema);
