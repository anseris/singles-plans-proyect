import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Group } from '../models/group.model.js';

export async function listMine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter = req.auth?.role === 'admin' ? {} : { createdBy: req.auth?.userId };
    const groups = await Group.find(filter).sort({ createdAt: -1 }).lean();
    res.json(groups);
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
    const validAgeRange =
      Number.isInteger(minAge) &&
      Number.isInteger(maxAge) &&
      Number(minAge) >= 18 &&
      Number(maxAge) <= 100 &&
      Number(minAge) <= Number(maxAge);
    const validImage =
      imageUrl === '' ||
      (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl) &&
        Math.floor((imageUrl.length - imageUrl.indexOf(',') - 1) * 3 / 4) <= 2 * 1024 * 1024);
    if (!name || !description || name.length > 100 || description.length > 1500 || city.length > 120 || !validAgeRange || !validImage) {
      res.status(400).json({ message: 'Revisa el nombre, la descripción, el rango de edad y que la imagen sea válida (máximo 2 MB).' });
      return;
    }

    const group = await Group.create({
      name,
      description,
      city,
      ageRange: { min: Number(minAge), max: Number(maxAge) },
      imageUrl,
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
