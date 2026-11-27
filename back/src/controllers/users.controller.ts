import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { GroupMembership } from '../models/group-membership.model.js';
import { User } from '../models/user.model.js';

interface PublicGroup {
  id: string;
  name: string;
  city: string;
  imageUrl: string;
}

interface PublicUser {
  id: string;
  name: string;
  avatarUrl: string;
  location: string;
  aboutMe: string;
  interests: string[];
  memberSince: string;
  maritalStatus?: string;
  groups: PublicGroup[];
}

export async function getPublicUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'];
    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    const user = await User.findById(id)
      .select('name avatarUrl location aboutMe interests showGroups showMaritalStatus maritalStatus createdAt')
      .lean();
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    const result: PublicUser = {
      id: String(user._id),
      name: user.name,
      avatarUrl: user.avatarUrl ?? '',
      location: user.location ?? '',
      aboutMe: user.aboutMe ?? '',
      interests: user.interests ?? [],
      memberSince: user.createdAt ? new Date(user.createdAt).toISOString() : '',
      groups: [],
    };

    if (user.showMaritalStatus && user.maritalStatus && user.maritalStatus !== 'prefiero-no-decirlo') {
      result.maritalStatus = user.maritalStatus;
    }

    if (user.showGroups) {
      const memberships = await GroupMembership.find({ user: user._id })
        .populate('group', 'name city imageUrl')
        .limit(30)
        .lean();
      result.groups = memberships
        .map((membership) => membership.group as unknown as {
          _id: mongoose.Types.ObjectId;
          name: string;
          city?: string;
          imageUrl?: string;
        } | null)
        .filter((group): group is {
          _id: mongoose.Types.ObjectId;
          name: string;
          city?: string;
          imageUrl?: string;
        } => !!group)
        .map((group) => ({
          id: String(group._id),
          name: group.name,
          city: group.city ?? '',
          imageUrl: group.imageUrl ?? '',
        }));
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}
