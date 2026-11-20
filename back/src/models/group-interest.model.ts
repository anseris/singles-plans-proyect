import { Schema, model } from 'mongoose';

const groupInterestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    key: { type: String, required: true, trim: true, unique: true }
  },
  { timestamps: true }
);

groupInterestSchema.index({ name: 1 });

export const GroupInterest = model('GroupInterest', groupInterestSchema);
