import { Schema, model } from 'mongoose';

const planSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'group-plans' },
    standardPrice: { type: Number, required: true, default: 2, min: 0 },
    standardFreeEvents: { type: Number, required: true, default: 3, min: 0 },
    proMonthlyPrice: { type: Number, required: true, default: 15, min: 0 }
  },
  { timestamps: true }
);

export const PlanSettings = model('PlanSettings', planSettingsSchema);
