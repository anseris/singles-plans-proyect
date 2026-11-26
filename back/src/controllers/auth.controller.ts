import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/user.model.js';
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from '../services/password-reset-email.js';
import { requireHumanVerification } from '../services/turnstile.js';

function createToken(id: string, role: 'user' | 'admin', rememberMe = false): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('Falta la variable obligatoria JWT_SECRET.');
  return jwt.sign({ role }, secret, { subject: id, expiresIn: rememberMe ? '30d' : '7d' });
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  superusuario: boolean;
  location?: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    superusuario: user.superusuario,
    location: user.location
  };
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
      token: createToken(user.id, user.role),
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
      token: createToken(user.id, user.role, rememberMe),
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
      token: createToken(user.id, user.role),
      rememberMe: false,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
}

export async function currentUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.auth?.userId).select('name email role superusuario location');
    if (!user) {
      res.status(401).json({ message: 'La cuenta ya no existe.' });
      return;
    }
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
}
