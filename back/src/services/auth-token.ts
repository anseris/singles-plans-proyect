import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/user.model.js';

export function createAppToken(id: string, role: UserRole, rememberMe = false): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('Falta la variable obligatoria JWT_SECRET.');
  return jwt.sign({ role }, secret, { subject: id, expiresIn: rememberMe ? '30d' : '7d' });
}
