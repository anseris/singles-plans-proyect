import type { EventItem } from '../../events/models/event.model';

export interface InterestItem {
  _id: string;
  name: string;
}

export type GroupStatus = 'active' | 'cancelled';

export interface GroupItem {
  _id: string;
  name: string;
  description: string;
  city: string;
  ageRange?: { min: number; max: number };
  imageUrl?: string;
  interests?: string[];
  plan?: 'standard' | 'pro';
  status?: GroupStatus;
}

export interface CreateGroupInput extends Omit<GroupItem, '_id' | 'ageRange' | 'imageUrl' | 'interests' | 'status'> {
  imageUrl: string;
  interests: string[];
  plan: 'standard' | 'pro';
}

export interface PlanSettings {
  standardPrice: number;
  standardFreeEvents: number;
  proMonthlyPrice: number;
}

export interface GroupMember {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface GroupDetails {
  group: GroupItem;
  createdById: string;
  createdByName: string;
  createdByAvatarUrl?: string;
  upcomingEvents: EventItem[];
  pastEvents: EventItem[];
  members: GroupMember[];
  memberCount: number;
}
