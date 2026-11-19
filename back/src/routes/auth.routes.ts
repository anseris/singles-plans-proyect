import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

function createToken(id: string, role: 'user' | 'admin'): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('Falta la variable obligatoria JWT_SECRET.');
  return jwt.sign({ role }, secret, { subject: id, expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const name = typeof req.body['name'] === 'string' ? req.body['name'].trim() : '';
    const email = typeof req.body['email'] === 'string' ? req.body['email'].trim().toLowerCase() : '';
    const password = typeof req.body['password'] === 'string' ? req.body['password'] : '';
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      res.status(400).json({ message: 'Indica nombre, email válido y contraseña de al menos 8 caracteres.' });
      return;
    }

    const existing = await User.exists({ email });
    if (existing) {
      res.status(409).json({ message: 'Ya existe una cuenta con ese email.' });
      return;
    }
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({
      token: createToken(user.id, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'Ya existe una cuenta con ese email.' });
      return;
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body['email'] === 'string' ? req.body['email'].trim().toLowerCase() : '';
    const password = typeof req.body['password'] === 'string' ? req.body['password'] : '';
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ message: 'Email o contraseña incorrectos.' });
      return;
    }
    res.json({
      token: createToken(user.id, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.auth?.userId).select('name email role');
    if (!user) {
      res.status(401).json({ message: 'La cuenta ya no existe.' });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
});

export default router;
