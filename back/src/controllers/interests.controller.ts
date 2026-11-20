import type { Request, Response, NextFunction } from 'express';
import { GroupInterest } from '../models/group-interest.model.js';

export async function listInterests(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const interests = await GroupInterest.find().select('name').sort({ name: 1 }).lean();
    res.json(interests);
  } catch (error) {
    next(error);
  }
}
