import { resolve } from 'node:path';
import cors from 'cors';
import express from 'express';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import eventsRoutes from './routes/events.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import interestsRoutes from './routes/interests.routes.js';

const app = express();

app.disable('etag');
app.use(cors({ origin: process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:4200' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(
  '/uploads/avatars',
  express.static(resolve(process.cwd(), 'uploads', 'avatars'), { maxAge: '1h' }),
);

app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Singles Plans API is running.' }));
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/interests', interestsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API error:', error);
  res.status(500).json({ message: 'Ha ocurrido un error interno. Inténtalo de nuevo más tarde.' });
});

export default app;
