import cors from 'cors';
import express from 'express';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import eventsRoutes from './routes/events.routes.js';

const app = express();

app.use(cors({ origin: process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Singles Plans API is running.' }));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API error:', error);
  res.status(500).json({ message: 'Ha ocurrido un error interno. Inténtalo de nuevo más tarde.' });
});

export default app;
