import { Schema, model } from 'mongoose';

const enrollmentSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

enrollmentSchema.index({ event: 1, user: 1 }, { unique: true });

export const Enrollment = model('Enrollment', enrollmentSchema);
