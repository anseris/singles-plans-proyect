import { Schema, model } from 'mongoose';

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1500 },
    city: { type: String, trim: true, maxlength: 120, default: '' },
    ageRange: {
      min: { type: Number, min: 18, max: 100, required: true },
      max: { type: Number, min: 18, max: 100, required: true }
    },
    imageUrl: { type: String, maxlength: 3_000_000, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

groupSchema.index({ name: 1 }, { unique: true });

export const Group = model('Group', groupSchema);
