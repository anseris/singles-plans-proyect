import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Event } from '../models/event.model.js';
import { Enrollment } from '../models/enrollment.model.js';
import { Group } from '../models/group.model.js';
import { GroupMembership } from '../models/group-membership.model.js';
import { GroupInterest } from '../models/group-interest.model.js';

export async function listAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await Group.find().select('name description city ageRange imageUrl interests createdAt').sort({ createdAt: -1 }).lean();
    res.json(groups);
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
    const [memberships, enrollments] = await Promise.all([
      GroupMembership.find({ user: userId }).distinct('group'),
      Enrollment.find({ user: userId }).distinct('event')
    ]);
    const enrolledGroups = enrollments.length
      ? await Event.find({ _id: { $in: enrollments }, type: 'event' }).distinct('group')
      : [];
    const groupIds = [...new Set([...memberships, ...enrolledGroups].map(String))];
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
    const description = typeof req.body['description'] === 'string' ? req.body['description'].trim() : '';
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
    const knownInterestCount = uniqueInterests.length
      ? await GroupInterest.countDocuments({ name: { $in: uniqueInterests } })
      : 0;
    const validInterests = validInterestValues && knownInterestCount === uniqueInterests.length;
    const validImage =
      imageUrl === '' ||
      (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl) &&
        Math.floor((imageUrl.length - imageUrl.indexOf(',') - 1) * 3 / 4) <= 2 * 1024 * 1024);
    if (!name || !description || name.length > 100 || description.length > 1500 || city.length > 120 || !validAgeRange || !validInterests || !validImage) {
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
      createdBy: req.auth?.userId
    });
    res.status(201).json(group);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(409).json({ message: 'Ya existe un grupo con ese nombre.' });
      return;
    }
    next(error);
  }
}
