import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/event.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Group } from '../models/group.model.js';
import { eventFields, isValidEventInput } from '../services/event-input.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function listGroups(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await Group.find().sort({ name: 1 }).lean();
    res.json(groups);
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params['id'])) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }
    const hasEvents = await Event.exists({ group: req.params['id'] });
    if (hasEvents) {
      res.status(409).json({ message: 'No puedes eliminar un grupo que ya tiene experiencias.' });
      return;
    }
    const group = await Group.findByIdAndDelete(req.params['id']);
    if (!group) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as Record<string, unknown>;
    if (!isValidEventInput(input, ['excursion', 'trip', 'event'])) {
      res.status(400).json({ message: 'Revisa los datos, selecciona un grupo existente y comprueba las fechas, el precio y el aforo.' });
      return;
    }
    if (!(await Group.exists({ _id: input['groupId'] }))) {
      res.status(400).json({ message: 'El grupo seleccionado ya no existe. Crea o selecciona otro grupo.' });
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
}

export async function listEvents(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await Event.find().populate('createdBy', 'name email').populate('group', 'name city').sort({ createdAt: -1 }).lean();
    const counts = await Enrollment.aggregate([
      { $match: { event: { $in: events.map((event) => event._id) } } },
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]);
    const countByEvent = new Map(counts.map((entry) => [String(entry['_id']), entry['count'] as number]));
    res.json(events.map((event) => ({ ...event, enrolledCount: countByEvent.get(String(event['_id'])) ?? 0 })));
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params['id'])) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    const update: Record<string, unknown> = {};
    for (const field of ['title', 'description', 'type', 'location', 'startsAt', 'endsAt', 'price', 'capacity', 'imageUrl']) {
      if (field in req.body) update[field] = req.body[field];
    }
    if ('groupId' in req.body) {
      if (!mongoose.isValidObjectId(req.body['groupId']) || !(await Group.exists({ _id: req.body['groupId'] }))) {
        res.status(400).json({ message: 'Selecciona un grupo existente.' });
        return;
      }
      update['group'] = req.body['groupId'];
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
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
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
}
