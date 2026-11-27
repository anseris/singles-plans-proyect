import { Schema, model } from 'mongoose';

export type EventType = 'excursion' | 'trip' | 'event';
export type EventTimeOfDay = 'afternoon' | 'night' | 'all-day';

const meetingPointSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    placeId: { type: String, trim: true, maxlength: 200, default: '' },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null }
  },
  { _id: false }
);

const ageRangeSchema = new Schema(
  {
    min: { type: Number, min: 18, max: 100, required: true },
    max: { type: Number, min: 18, max: 100, required: true }
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 30000 },
    type: { type: String, enum: ['excursion', 'trip', 'event'], required: true },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    meetingPoint: { type: meetingPointSchema, required: false },
    interests: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    ageRange: { type: ageRangeSchema, required: false, default: null },
    timeOfDay: { type: String, enum: ['afternoon', 'night', 'all-day'], default: 'afternoon' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    price: { type: Number, min: 0, default: 0 },
    capacity: { type: Number, min: 1, required: true },
    enrolledCount: { type: Number, min: 0, default: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
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
