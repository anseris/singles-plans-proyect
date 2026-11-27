import { Schema, model } from 'mongoose';

const ageRangeSchema = new Schema(
  {
    min: { type: Number, min: 18, max: 100, required: true },
    max: { type: Number, min: 18, max: 100, required: true }
  },
  { _id: false }
);

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    city: { type: String, trim: true, maxlength: 120, default: '' },
    ageRange: { type: ageRangeSchema, required: false },
    imageUrl: { type: String, maxlength: 3_000_000, default: '' },
    interests: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    plan: { type: String, enum: ['standard', 'pro'], default: 'standard', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

groupSchema.index({ name: 1 }, { unique: true });

export const Group = model('Group', groupSchema);
