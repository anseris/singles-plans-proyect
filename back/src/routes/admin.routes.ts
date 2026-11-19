import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAdmin, requireAuth, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Event } from '../models/event.model.js';
import { Enrollment } from '../models/enrollment.model.js';

const router = Router();
router.use(requireAuth, requireAdmin);
const eventTypes = ['excursion', 'trip', 'event'] as const;

function isValidEventInput(input: Record<string, unknown>): boolean {
  const startsAt = new Date(String(input['startsAt']));
  const endsAt = new Date(String(input['endsAt']));
  return (
    typeof input['title'] === 'string' &&
    input['title'].trim().length > 0 &&
    typeof input['description'] === 'string' &&
    input['description'].trim().length > 0 &&
    eventTypes.includes(input['type'] as (typeof eventTypes)[number]) &&
    typeof input['location'] === 'string' &&
    input['location'].trim().length > 0 &&
    Number.isFinite(startsAt.getTime()) &&
    Number.isFinite(endsAt.getTime()) &&
    startsAt > new Date() &&
    endsAt >= startsAt &&
    Number.isFinite(Number(input['price'])) &&
    Number(input['price']) >= 0 &&
    Number.isInteger(Number(input['capacity'])) &&
    Number(input['capacity']) > 0 &&
    (input['imageUrl'] === undefined || typeof input['imageUrl'] === 'string')
  );
}

function eventFields(input: Record<string, unknown>) {
  return {
    title: String(input['title']).trim(),
    description: String(input['description']).trim(),
    type: input['type'] as (typeof eventTypes)[number],
    location: String(input['location']).trim(),
    startsAt: new Date(String(input['startsAt'])),
    endsAt: new Date(String(input['endsAt'])),
    price: Number(input['price']),
    capacity: Number(input['capacity']),
    imageUrl: typeof input['imageUrl'] === 'string' ? input['imageUrl'].trim() : ''
  };
}

router.post('/events', async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = req.body as Record<string, unknown>;
    if (!isValidEventInput(input)) {
      res.status(400).json({ message: 'Revisa los datos: las fechas deben ser futuras y el aforo y precio válidos.' });
      return;
    }

    const event = await Event.create({
      ...eventFields(input),
      status: 'published',
      createdBy: req.auth?.userId
    });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.get('/events', async (_req, res, next) => {
  try {
    const events = await Event.find().populate('createdBy', 'name email').sort({ createdAt: -1 }).lean();
    const counts = await Enrollment.aggregate([
      { $match: { event: { $in: events.map((event) => event._id) } } },
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]);
    const countByEvent = new Map(counts.map((entry) => [String(entry['_id']), entry['count'] as number]));
    res.json(events.map((event) => ({ ...event, enrolledCount: countByEvent.get(String(event['_id'])) ?? 0 })));
  } catch (error) {
    next(error);
  }
});

router.patch('/events/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params['id'])) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    const update: Record<string, unknown> = {};
    for (const field of ['title', 'description', 'type', 'location', 'startsAt', 'endsAt', 'price', 'capacity', 'imageUrl']) {
      if (field in req.body) update[field] = req.body[field];
    }
    const currentEvent = await Event.findById(req.params['id']);
    if (!currentEvent) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    const nextCapacity = Number(update['capacity'] ?? currentEvent.capacity);
    if (!Number.isInteger(nextCapacity) || nextCapacity < currentEvent.enrolledCount) {
      res.status(400).json({ message: 'El aforo no puede ser inferior al número de plazas reservadas.' });
      return;
    }
    if ('status' in req.body) {
      if (!['pending', 'published', 'rejected', 'cancelled'].includes(req.body['status'])) {
        res.status(400).json({ message: 'Estado de publicación no válido.' });
        return;
      }
      update['status'] = req.body['status'];
    }
    const event = await Event.findByIdAndUpdate(req.params['id'], update, { new: true, runValidators: true });
    if (!event) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.delete('/events/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params['id'])) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    const event = await Event.findByIdAndDelete(req.params['id']);
    if (!event) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    await Enrollment.deleteMany({ event: event.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
