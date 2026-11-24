import type { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/event.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Group } from '../models/group.model.js';
import { areValidInterests, eventFields, isValidEventInput } from '../services/event-input.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { GroupMembership } from '../models/group-membership.model.js';

export async function listPublic(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const type = req.query['type'];
    const section = req.query['section'];
    const filter: Record<string, unknown> = { status: 'published', startsAt: { $gte: new Date() } };
    if (section === 'events') {
      filter['type'] = 'event';
    } else if (section === 'trips') {
      filter['type'] = { $in: ['trip', 'excursion'] };
    } else if (typeof type === 'string' && ['excursion', 'trip', 'event'].includes(type)) {
      filter['type'] = type;
    }
    const events = await Event.find(filter).populate('group', 'name city').sort({ startsAt: 1 }).lean();
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

export async function listMine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [created, enrollments] = await Promise.all([
      Event.find({ createdBy: req.auth?.userId }).populate('group', 'name city').sort({ createdAt: -1 }).lean(),
      Enrollment.find({ user: req.auth?.userId }).populate({ path: 'event', populate: { path: 'group', select: 'name city' } }).sort({ createdAt: -1 }).lean()
    ]);
    res.json({ created, enrollments });
  } catch (error) {
    next(error);
  }
}

export async function getEventDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'];
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ message: 'No se encontró el evento.' });
      return;
    }
    const event = await Event.findById(id)
      .populate('group', 'name city')
      .populate('createdBy', 'name')
      .lean();
    if (!event) {
      res.status(404).json({ message: 'No se encontró el evento.' });
      return;
    }
    const creator = event.createdBy as { _id?: unknown } | null;
    const isCreator = !!req.auth?.userId && String(creator?._id) === req.auth.userId;
    if (event.status !== 'published' && !isCreator && req.auth?.role !== 'admin') {
      res.status(404).json({ message: 'No se encontró el evento.' });
      return;
    }
    const [enrollment, enrolledCount] = await Promise.all([
      req.auth?.userId ? Enrollment.exists({ event: event._id, user: req.auth.userId }) : null,
      Enrollment.countDocuments({ event: event._id })
    ]);
    res.json({
      ...event,
      enrolledCount,
      isCreator,
      isEnrolled: !!enrollment
    });
  } catch (error) {
    next(error);
  }
}

export async function createCommunityEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as Record<string, unknown>;
    if (!isValidEventInput(input, ['event']) || !areValidInterests(input)) {
      res.status(400).json({ message: 'Para crear un evento, selecciona tu grupo y comprueba los datos. Los viajes y excursiones solo los organiza SinglesPlans.' });
      return;
    }

    const group = await Group.findOne({ _id: input['groupId'], createdBy: req.auth?.userId });
    if (!group) {
      res.status(403).json({ message: 'Solo puedes crear eventos dentro de un grupo que hayas creado.' });
      return;
    }

    const event = await Event.create({
      ...eventFields(input),
      status: 'pending',
      createdBy: req.auth?.userId
    });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

export async function enroll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params['id'])) {
      res.status(404).json({ message: 'No se encontró el plan.' });
      return;
    }
    const event = await Event.findOne({
      _id: req.params['id'],
      status: 'published',
      startsAt: { $gt: new Date() }
    });
    if (!event) {
      res.status(404).json({ message: 'Este plan ya no está disponible.' });
      return;
    }
    const reserved = await Event.findOneAndUpdate(
      { _id: event.id, status: 'published', $expr: { $lt: ['$enrolledCount', '$capacity'] } },
      { $inc: { enrolledCount: 1 } },
      { new: true }
    );
    if (!reserved) {
      res.status(409).json({ message: 'No quedan plazas para este plan.' });
      return;
    }
    let enrollmentCreated = false;
    try {
      await Enrollment.create({ event: event.id, user: req.auth?.userId });
      enrollmentCreated = true;
      if (req.body['joinGroup'] === true) {
        await GroupMembership.updateOne(
          { group: event.group, user: req.auth?.userId },
          { $setOnInsert: { group: event.group, user: req.auth?.userId } },
          { upsert: true }
        );
      }
    } catch (error) {
      if (enrollmentCreated) await Enrollment.deleteOne({ event: event.id, user: req.auth?.userId });
      await Event.updateOne({ _id: event.id }, { $inc: { enrolledCount: -1 } });
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        res.status(409).json({ message: 'Ya tienes una plaza en este plan.' });
        return;
      }
      throw error;
    }
    res.status(201).json({
      message: req.body['joinGroup'] === true
        ? '¡Plaza reservada! Ya formas parte del grupo.'
        : '¡Plaza reservada! Te esperamos.',
      joinedGroup: req.body['joinGroup'] === true
    });
  } catch (error) {
    next(error);
  }
}
