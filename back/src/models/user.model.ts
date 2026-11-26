import { Schema, model } from 'mongoose';

export type UserRole = 'user' | 'admin';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    avatarUrl: { type: String, trim: true, default: '' },
    aboutMe: { type: String, trim: true, maxlength: 1000, default: '' },
    showGroups: { type: Boolean, default: false },
    showMaritalStatus: { type: Boolean, default: false },
    birthDate: { type: Date, default: null },
    gender: { type: String, default: '' },
    interests: { type: [String], default: [] },
    maritalStatus: { type: String, default: '' },
    occupation: { type: String, default: '' },
    contactPermission: { type: String, default: 'miembros-grupos' },
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
