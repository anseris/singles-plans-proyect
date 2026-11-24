import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/user.model.js';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string; role: UserRole };
}

function getSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('Falta la variable obligatoria JWT_SECRET.');
  }
  return secret;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ message: 'Inicia sesión para continuar.' });
    return;
  }

  try {
    const claims = jwt.verify(token, getSecret());
    if (typeof claims === 'string' || typeof claims['sub'] !== 'string' || !['user', 'admin'].includes(String(claims['role']))) {
      res.status(401).json({ message: 'La sesión no es válida.' });
      return;
    }
    req.auth = { userId: claims['sub'], role: claims['role'] as UserRole };
    next();
  } catch {
    res.status(401).json({ message: 'La sesión ha caducado o no es válida.' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    next();
    return;
  }
  try {
    const claims = jwt.verify(token, getSecret());
    if (typeof claims !== 'string' && typeof claims['sub'] === 'string' && ['user', 'admin'].includes(String(claims['role']))) {
      req.auth = { userId: claims['sub'], role: claims['role'] as UserRole };
    }
    next();
  } catch {
    next();
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.auth?.role !== 'admin') {
    res.status(403).json({ message: 'Esta sección está reservada a administración.' });
    return;
  }
  next();
}
