import { Schema, model } from 'mongoose';

export type UserRole = 'user' | 'admin';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true }
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
