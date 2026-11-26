import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { avatarFileName } from '../middleware/upload.middleware.js';
import { User } from '../models/user.model.js';
import { createAppToken } from '../services/auth-token.js';
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from '../services/password-reset-email.js';
import { requireHumanVerification } from '../services/turnstile.js';

const ALLOWED_GENDERS = new Set([
  '',
  'mujer',
  'hombre',
  'no-binario',
  'otro',
  'prefiero-no-decirlo',
]);
const ALLOWED_MARITAL_STATUSES = new Set([
  '',
  'soltero',
  'en-pareja',
  'casado',
  'divorciado',
  'viudo',
  'prefiero-no-decirlo',
]);
const ALLOWED_OCCUPATIONS = new Set([
  '',
  'tecnologia',
  'sanidad',
  'educacion',
  'marketing',
  'finanzas',
  'hosteleria',
  'arte-diseno',
  'deporte',
  'estudiante',
  'jubilado',
  'otro',
  'prefiero-no-decirlo',
]);
const ALLOWED_CONTACT_PERMISSIONS = new Set([
  'organizadores',
  'miembros-grupos',
  'cualquiera',
]);
const ALLOWED_INTERESTS = [
  'Viajes',
  'Cine',
  'Música',
  'Senderismo',
  'Gastronomía',
  'Fotografía',
  'Deporte',
  'Lectura',
  'Arte',
  'Tecnología',
  'Mascotas',
  'Cocina',
];
const MAX_ABOUT_ME = 1000;
const MAX_INTERESTS = 10;

function readString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function readBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function canonicalInterest(value: string): string | null {
  return (
    ALLOWED_INTERESTS.find((interest) => interest.toLowerCase() === value.toLowerCase()) ?? null
  );
}

function parseInterests(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;

  const interests: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const interest = canonicalInterest(item.trim());
    if (interest && !interests.includes(interest) && interests.length < MAX_INTERESTS) {
      interests.push(interest);
    }
  }
  return interests;
}

function parseBirthDate(value: string): { valid: boolean; date: Date | null } {
  if (!value) return { valid: true, date: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { valid: false, date: null };

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { valid: false, date: null };
  }

  const adultLimit = new Date();
  adultLimit.setUTCFullYear(adultLimit.getUTCFullYear() - 18);
  if (date > adultLimit) return { valid: false, date: null };

  return { valid: true, date };
}

function formatBirthDate(value?: Date | string | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

interface PublicUserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  superusuario: boolean;
  location?: string;
  avatarUrl?: string;
  createdAt?: Date | string;
  aboutMe?: string;
  showGroups?: boolean;
  showMaritalStatus?: boolean;
  birthDate?: Date | string | null;
  gender?: string;
  interests?: string[];
  maritalStatus?: string;
  occupation?: string;
  contactPermission?: string;
}

function publicUser(user: PublicUserData) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    superusuario: user.superusuario,
    location: user.location ?? '',
    avatarUrl: user.avatarUrl ?? '',
    aboutMe: user.aboutMe ?? '',
    showGroups: user.showGroups ?? false,
    showMaritalStatus: user.showMaritalStatus ?? false,
    birthDate: formatBirthDate(user.birthDate),
    gender: user.gender ?? '',
    interests: user.interests ?? [],
    maritalStatus: user.maritalStatus ?? '',
    occupation: user.occupation ?? '',
    contactPermission: user.contactPermission ?? 'miembros-grupos',
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined
  };
}

function avatarDirectory(): string {
  return resolve(process.cwd(), 'uploads', 'avatars');
}

async function deleteStoredAvatar(url: string): Promise<void> {
  const prefix = '/uploads/avatars/';
  if (!url.startsWith(prefix)) return;
  const filename = basename(url);
  if (!filename || filename.includes('..') || filename === 'avatars') return;
  try {
    await unlink(join(avatarDirectory(), filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('No se pudo eliminar el avatar anterior:', error);
    }
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const name = typeof req.body['name'] === 'string' ? req.body['name'].trim() : '';
    const email = typeof req.body['email'] === 'string' ? req.body['email'].trim().toLowerCase() : '';
    const password = typeof req.body['password'] === 'string' ? req.body['password'] : '';
    const location = typeof req.body['location'] === 'string' ? req.body['location'].trim() : '';
    const adultConfirmed = req.body['adultConfirmed'] === true;
    if (
      !name ||
      name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 8 ||
      password.length > 72 ||
      location.length < 2 ||
      location.length > 120 ||
      !adultConfirmed
    ) {
      res.status(400).json({
        message: 'Revisa tus datos, confirma que tienes 18 años o más y usa una contraseña de 8 a 72 caracteres.'
      });
      return;
    }
    if (!(await requireHumanVerification(String(req.body['captchaToken'] ?? ''), req.ip, res))) {
      return;
    }

    const existing = await User.exists({ email });
    if (existing) {
      res.status(409).json({ message: 'Ya existe una cuenta con ese email.' });
      return;
    }
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      location,
      adultConfirmed
    });
    res.status(201).json({
      token: createAppToken(user.id, user.role),
      user: publicUser(user)
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'Ya existe una cuenta con ese email.' });
      return;
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body['email'] === 'string' ? req.body['email'].trim().toLowerCase() : '';
    const password = typeof req.body['password'] === 'string' ? req.body['password'] : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      res.status(400).json({ message: 'Indica un email y una contraseña válidos.' });
      return;
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ message: 'Email o contraseña incorrectos.' });
      return;
    }
    const rememberMe = req.body['rememberMe'] === true;
    res.json({
      token: createAppToken(user.id, user.role, rememberMe),
      rememberMe,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = typeof req.body['email'] === 'string' ? req.body['email'].trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ message: 'Indica un email válido.' });
      return;
    }
    if (!(await requireHumanVerification(String(req.body['captchaToken'] ?? ''), req.ip, res))) {
      return;
    }

    if (!isPasswordResetEmailConfigured()) {
      res.status(503).json({ message: 'La recuperación por correo aún no está configurada.' });
      return;
    }

    const user = await User.findOne({ email });
    if (user) {
      const token = randomBytes(32).toString('base64url');
      user.passwordResetTokenHash = createHash('sha256').update(token).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      try {
        await sendPasswordResetEmail(email, token);
      } catch (error) {
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();
        throw error;
      }
    }

    res.json({
      message: 'Si existe una cuenta con ese email, recibirás instrucciones para restablecer la contraseña.'
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = typeof req.body['token'] === 'string' ? req.body['token'] : '';
    const password = typeof req.body['password'] === 'string' ? req.body['password'] : '';
    if (!token || password.length < 8 || password.length > 72) {
      res.status(400).json({ message: 'El enlace o la contraseña no son válidos.' });
      return;
    }
    if (!(await requireHumanVerification(String(req.body['captchaToken'] ?? ''), req.ip, res))) {
      return;
    }

    const user = await User.findOne({
      passwordResetTokenHash: createHash('sha256').update(token).digest('hex'),
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) {
      res.status(400).json({ message: 'El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.json({
      message: 'Tu contraseña se ha actualizado. Ya has iniciado sesión.',
      token: createAppToken(user.id, user.role),
      rememberMe: false,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

export async function currentUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.auth?.userId).select(
      'name email role superusuario location avatarUrl aboutMe showGroups showMaritalStatus birthDate gender interests maritalStatus occupation contactPermission createdAt'
    );
    if (!user) {
      res.status(401).json({ message: 'La cuenta ya no existe.' });
      return;
    }
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const user = await User.findById(req.auth?.userId);
    if (!user) {
      res.status(401).json({ message: 'La cuenta ya no existe.' });
      return;
    }

    const name = readString(body, 'name') ?? '';
    const location = readString(body, 'location') ?? '';
    if (
      !name ||
      name.length > 100 ||
      location.length > 120 ||
      (location.length > 0 && location.length < 2)
    ) {
      res.status(400).json({ message: 'Revisa tu nombre y tu localización.' });
      return;
    }

    const aboutMe = readString(body, 'aboutMe');
    if (aboutMe !== undefined && aboutMe.length > MAX_ABOUT_ME) {
      res.status(400).json({ message: 'Sobre mí no puede superar los 1000 caracteres.' });
      return;
    }

    let parsedBirthDate: Date | null | undefined;
    const rawBirthDate = readString(body, 'birthDate');
    if (rawBirthDate !== undefined) {
      const parsed = parseBirthDate(rawBirthDate);
      if (!parsed.valid) {
        res.status(400).json({
          message: 'Indica una fecha de nacimiento válida y ser mayor de 18 años.',
        });
        return;
      }
      parsedBirthDate = parsed.date;
    }

    const gender = readString(body, 'gender');
    if (gender !== undefined && !ALLOWED_GENDERS.has(gender)) {
      res.status(400).json({ message: 'Revisa el género seleccionado.' });
      return;
    }

    const maritalStatus = readString(body, 'maritalStatus');
    if (maritalStatus !== undefined && !ALLOWED_MARITAL_STATUSES.has(maritalStatus)) {
      res.status(400).json({ message: 'Revisa el estado civil seleccionado.' });
      return;
    }

    const occupation = readString(body, 'occupation');
    if (occupation !== undefined && !ALLOWED_OCCUPATIONS.has(occupation)) {
      res.status(400).json({ message: 'Revisa la ocupación seleccionada.' });
      return;
    }

    const contactPermission = readString(body, 'contactPermission');
    if (contactPermission !== undefined && !ALLOWED_CONTACT_PERMISSIONS.has(contactPermission)) {
      res.status(400).json({ message: 'Revisa quién puede contactar contigo.' });
      return;
    }

    const interests = parseInterests(body['interests']);
    const showGroups = readBoolean(body, 'showGroups');
    const showMaritalStatus = readBoolean(body, 'showMaritalStatus');
    const removeAvatar = body['removeAvatar'] === true || body['removeAvatar'] === 'true';

    const previousAvatarUrl = user.avatarUrl ?? '';
    if (req.file) {
      const directory = avatarDirectory();
      await mkdir(directory, { recursive: true });
      const filename = avatarFileName(req.file.mimetype);
      await writeFile(join(directory, filename), req.file.buffer);
      user.avatarUrl = `/uploads/avatars/${filename}`;
    } else if (removeAvatar) {
      user.avatarUrl = '';
    }

    user.name = name;
    user.location = location;
    if (aboutMe !== undefined) user.aboutMe = aboutMe;
    if (showGroups !== undefined) user.showGroups = showGroups;
    if (showMaritalStatus !== undefined) user.showMaritalStatus = showMaritalStatus;
    if (parsedBirthDate !== undefined) user.birthDate = parsedBirthDate;
    if (gender !== undefined) user.gender = gender;
    if (interests !== undefined) user.interests = interests;
    if (maritalStatus !== undefined) user.maritalStatus = maritalStatus;
    if (occupation !== undefined) user.occupation = occupation;
    if (contactPermission !== undefined) user.contactPermission = contactPermission;

    await user.save();

    if (req.file || removeAvatar) await deleteStoredAvatar(previousAvatarUrl);
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
}
