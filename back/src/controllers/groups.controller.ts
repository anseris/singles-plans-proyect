import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Event } from '../models/event.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Group } from '../models/group.model.js';
import { GroupMembership } from '../models/group-membership.model.js';
import { User } from '../models/user.model.js';
import { PlanSettings } from '../models/plan-settings.model.js';
import { GROUP_DESCRIPTION_MAX, isValidDescription, sanitizeDescription } from '../services/description.js';

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

export async function listAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await Group.find().select('name description city ageRange imageUrl interests createdAt').sort({ createdAt: -1 }).lean();
    res.json(groups);
  } catch (error) {
    next(error);
  }
}

export async function getGroupDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'];
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }

    const group = await Group.findById(id).lean();
    if (!group) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }

    const now = new Date();
    const [organizer, upcomingEvents, pastEvents, members, memberCount] = await Promise.all([
      User.findById(group.createdBy).select('name avatarUrl').lean(),
      Event.find({ group: group._id, status: 'published', endsAt: { $gte: now } })
        .populate('group', 'name city')
        .sort({ startsAt: 1 })
        .lean(),
      Event.find({ group: group._id, status: 'published', endsAt: { $lt: now } })
        .populate('group', 'name city')
        .sort({ startsAt: -1 })
        .lean(),
      GroupMembership.find({ group: group._id })
        .populate('user', 'name avatarUrl')
        .sort({ createdAt: 1 })
        .lean(),
      GroupMembership.countDocuments({ group: group._id })
    ]);

    res.json({
      group,
      createdById: String(group.createdBy),
      createdByName: organizer?.name ?? '',
      createdByAvatarUrl: organizer?.avatarUrl ?? '',
      upcomingEvents,
      pastEvents,
      members: members.flatMap((membership) => {
        const user = membership.user as { _id?: unknown; name?: string; avatarUrl?: string } | null;
        return user
          ? [{ id: String(user._id), name: user.name ?? '', avatarUrl: user.avatarUrl ?? '' }]
          : [];
      }),
      memberCount
    });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await Group.find({ createdBy: req.auth?.userId }).sort({ createdAt: -1 }).lean();
    res.json(groups);
  } catch (error) {
    next(error);
  }
}

export async function listInterests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth?.userId;
    const groupIds = await GroupMembership.find({ user: userId }).distinct('group');
    const groups = await Group.find({ _id: { $in: groupIds } }).sort({ createdAt: -1 }).lean();
    res.json(groups);
  } catch (error) {
    next(error);
  }
}

export async function joinGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params['id'])) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }
    const group = await Group.findById(req.params['id']);
    if (!group) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }
    try {
      await GroupMembership.updateOne(
        { group: group._id, user: req.auth?.userId },
        { $setOnInsert: { group: group._id, user: req.auth?.userId } },
        { upsert: true }
      );
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) {
        throw error;
      }
    }
    res.status(200).json({ message: `Ya formas parte de «${group.name}».` });
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const name = typeof req.body['name'] === 'string' ? req.body['name'].trim() : '';
    const description = isValidDescription(req.body['description'], GROUP_DESCRIPTION_MAX)
      ? sanitizeDescription(req.body['description'])
      : '';
    const city = typeof req.body['city'] === 'string' ? req.body['city'].trim() : '';
    const minAge = req.body['minAge'];
    const maxAge = req.body['maxAge'];
    const imageUrl = typeof req.body['imageUrl'] === 'string' ? req.body['imageUrl'] : '';
    const hasAgeRange = minAge !== undefined || maxAge !== undefined;
    const validAgeRange = !hasAgeRange || (
      Number.isInteger(minAge) &&
      Number.isInteger(maxAge) &&
      Number(minAge) >= 18 &&
      Number(maxAge) <= 100 &&
      Number(minAge) <= Number(maxAge)
    );
    const interests = req.body['interests'] ?? [];
    const validInterestValues = Array.isArray(interests) &&
      interests.every((interest: unknown) => typeof interest === 'string' && interest.length <= 40);
    const uniqueInterests = validInterestValues ? [...new Set(interests as string[])] : [];
    const validInterests = validInterestValues && uniqueInterests.every((interest) => interest.trim().length > 0);
    const validImage =
      imageUrl === '' ||
      (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl) &&
        Math.floor((imageUrl.length - imageUrl.indexOf(',') - 1) * 3 / 4) <= 2 * 1024 * 1024);
    if (!name || !description || name.length > 100 || description.length > 10000 || city.length > 120 || !validAgeRange || !validInterests || !validImage) {
      res.status(400).json({ message: 'Revisa el nombre, la descripción, los intereses seleccionados y que la imagen sea válida (máximo 2 MB).' });
      return;
    }

    const group = await Group.create({
      name,
      description,
      city,
      ...(hasAgeRange ? { ageRange: { min: Number(minAge), max: Number(maxAge) } } : {}),
      imageUrl,
      interests: uniqueInterests,
      createdBy: req.auth?.userId,
      plan: req.body['plan'] === 'pro' ? 'pro' : 'standard'
    });
    await User.updateOne(
      { _id: req.auth?.userId, superusuario: { $ne: true } },
      { $set: { superusuario: true } }
    );
    res.status(201).json(group);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'Ya existe un grupo con ese nombre.' });
      return;
    }
    next(error);
  }
}

export async function updateGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'];
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }
    if (String(group.createdBy) !== req.auth?.userId && req.auth?.role !== 'admin') {
      res.status(403).json({ message: 'Solo quien creó el grupo puede editarlo.' });
      return;
    }

    const name = typeof req.body['name'] === 'string' ? req.body['name'].trim() : '';
    const description = isValidDescription(req.body['description'], GROUP_DESCRIPTION_MAX)
      ? sanitizeDescription(req.body['description'])
      : '';
    const city = typeof req.body['city'] === 'string' ? req.body['city'].trim() : '';
    const imageUrl = typeof req.body['imageUrl'] === 'string' ? req.body['imageUrl'] : '';
    const interests = req.body['interests'] ?? [];
    const validInterests = Array.isArray(interests) &&
      interests.every((interest: unknown) => typeof interest === 'string' && interest.trim().length > 0 && interest.length <= 40);
    const uniqueInterests = validInterests ? [...new Set(interests as string[])] : [];
    const validImage =
      imageUrl === '' ||
      (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl) &&
        Math.floor((imageUrl.length - imageUrl.indexOf(',') - 1) * 3 / 4) <= 2 * 1024 * 1024);
    const hasAgeRange = 'ageRange' in req.body;
    const ageRange = req.body['ageRange'];
    const validAgeRange = !hasAgeRange || ageRange === null || (
      typeof ageRange === 'object' &&
      ageRange !== null &&
      'min' in ageRange &&
      'max' in ageRange &&
      Number.isInteger(ageRange.min) &&
      Number.isInteger(ageRange.max) &&
      Number(ageRange.min) >= 18 &&
      Number(ageRange.max) <= 100 &&
      Number(ageRange.min) <= Number(ageRange.max)
    );
    if (!name || !description || name.length > 100 || description.length > 10000 || city.length > 120 || !validInterests || !validImage || !validAgeRange) {
      res.status(400).json({ message: 'Revisa el nombre, la descripción, los intereses seleccionados y que la imagen sea válida (máximo 2 MB).' });
      return;
    }

    group.name = name;
    group.description = description;
    group.city = city;
    group.imageUrl = imageUrl;
    group.interests = uniqueInterests;
    group.plan = req.body['plan'] === 'pro' ? 'pro' : 'standard';
    if (hasAgeRange) group.set('ageRange', ageRange ?? undefined);
    await group.save();
    res.json(group);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'Ya existe un grupo con ese nombre.' });
      return;
    }
    next(error);
  }
}

export async function deleteGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'];
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }

    const group = await Group.findById(id).select('createdBy');
    if (!group) {
      res.status(404).json({ message: 'No se encontró el grupo.' });
      return;
    }
    if (String(group.createdBy) !== req.auth?.userId && req.auth?.role !== 'admin') {
      res.status(403).json({ message: 'Solo quien creó el grupo puede eliminarlo.' });
      return;
    }
    if (await Event.exists({ group: group._id })) {
      res.status(409).json({ message: 'No se puede eliminar el grupo mientras tenga eventos. Elimina primero sus eventos asociados.' });
      return;
    }

    await Promise.all([
      Group.deleteOne({ _id: group._id }),
      GroupMembership.deleteMany({ group: group._id })
    ]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
