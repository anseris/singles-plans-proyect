import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/event.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Group } from '../models/group.model.js';
import { GroupInterest } from '../models/group-interest.model.js';
import { areValidInterests, eventFields, isValidEventInput } from '../services/event-input.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PlanSettings } from '../models/plan-settings.model.js';

export async function getPlanSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await PlanSettings.findOneAndUpdate(
      { key: 'group-plans' },
      { $setOnInsert: { standardPrice: 2, standardFreeEvents: 3, proMonthlyPrice: 15 } },
      { upsert: true, new: true }
    ).lean();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updatePlanSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const standardPrice = Number(req.body['standardPrice']);
    const standardFreeEvents = Number(req.body['standardFreeEvents']);
    const proMonthlyPrice = Number(req.body['proMonthlyPrice']);
    if (!Number.isFinite(standardPrice) || standardPrice < 0 ||
        !Number.isInteger(standardFreeEvents) || standardFreeEvents < 0 ||
        !Number.isFinite(proMonthlyPrice) || proMonthlyPrice < 0) {
      res.status(400).json({ message: 'Indica valores numéricos válidos para los planes.' });
      return;
    }
    const settings = await PlanSettings.findOneAndUpdate(
      { key: 'group-plans' },
      { standardPrice, standardFreeEvents, proMonthlyPrice },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function listGroups(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await Group.find().sort({ name: 1 }).lean();
    res.json(groups);
  } catch (error) {
    next(error);
  }
}

export async function listGroupInterests(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const interests = await GroupInterest.find().sort({ name: 1 }).lean();
    res.json(interests);
  } catch (error) {
    next(error);
  }
}

export async function createGroupInterest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const name = typeof req.body['name'] === 'string' ? req.body['name'].trim() : '';
    if (!name || name.length > 40) {
      res.status(400).json({ message: 'El interés debe tener entre 1 y 40 caracteres.' });
      return;
    }

    const key = name.toLocaleLowerCase('es');
    const existing = await GroupInterest.findOne({ key });
    if (existing) {
      res.status(409).json({ message: 'Ese interés ya está registrado.' });
      return;
    }

    const interest = await GroupInterest.create({ name, key });
    res.status(201).json(interest);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'Ese interés ya está registrado.' });
      return;
    }
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
    if (!isValidEventInput(input, ['excursion', 'trip', 'event']) || !areValidInterests(input)) {
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
    const events = await Event.find().populate('createdBy', 'name email avatarUrl').populate('group', 'name city').sort({ createdAt: -1 }).lean();
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
    for (const field of ['title', 'description', 'type', 'location', 'meetingPoint', 'interests', 'ageRange', 'timeOfDay', 'startsAt', 'endsAt', 'price', 'capacity', 'imageUrl']) {
      if (field in req.body) update[field] = req.body[field];
    }
    if ('interests' in req.body && !areValidInterests({ interests: req.body['interests'] })) {
      res.status(400).json({ message: 'Revisa los intereses seleccionados.' });
      return;
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
