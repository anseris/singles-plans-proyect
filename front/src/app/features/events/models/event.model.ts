import type { GroupItem } from '../../groups/models/group.model';

export type EventType = 'excursion' | 'trip' | 'event';
export type EventStatus = 'pending' | 'published' | 'rejected' | 'cancelled';

export interface EventItem {
  _id: string;
  title: string;
  description: string;
  type: EventType;
  location: string;
  startsAt: string;
  endsAt: string;
  price: number;
  capacity: number;
  imageUrl: string;
  groupId?: string;
  group?: GroupItem | null;
  status: EventStatus;
  enrolledCount?: number;
  createdBy?: { name: string; email: string };
}
