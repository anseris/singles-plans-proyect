import { Schema, model } from 'mongoose';

export type UserRole = 'user' | 'admin';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    adultConfirmed: { type: Boolean, default: false, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    superusuario: { type: Boolean, default: false, required: true },
    googleId: { type: String, select: false },
    appleId: { type: String, select: false },
    facebookId: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false }
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
