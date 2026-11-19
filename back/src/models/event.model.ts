import { Schema, model } from 'mongoose';

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    type: { type: String, enum: ['excursion', 'trip', 'event'], required: true },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    price: { type: Number, min: 0, default: 0 },
    capacity: { type: Number, min: 1, required: true },
    enrolledCount: { type: Number, min: 0, default: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected', 'cancelled'],
      default: 'pending',
      required: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, startsAt: 1 });

export const Event = model('Event', eventSchema);
