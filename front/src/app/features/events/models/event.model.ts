import type { GroupItem } from '../../groups/models/group.model';

export type EventType = 'excursion' | 'trip' | 'event';
export type EventStatus = 'pending' | 'published' | 'rejected' | 'cancelled';
export type EventTimeOfDay = 'afternoon' | 'night' | 'all-day';

export interface EventMeetingPoint {
  name: string;
  address: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
}

export interface EventItem {
  _id: string;
  title: string;
  description: string;
  type: EventType;
  location: string;
  meetingPoint?: EventMeetingPoint;
  interests?: string[];
  ageRange?: { min: number; max: number } | null;
  timeOfDay?: EventTimeOfDay;
  startsAt: string;
  endsAt: string;
  price: number;
  capacity: number;
  imageUrl: string;
  groupId?: string;
  group?: GroupItem | null;
  status: EventStatus;
  enrolledCount?: number;
  createdBy?: { _id?: string; id?: string; name: string; email?: string };
}

export interface EventDetails extends EventItem {
  isCreator: boolean;
  isEnrolled: boolean;
}

export interface EventCreateInput {
  title: string;
  description: string;
  type: EventType;
  location: string;
  meetingPoint: EventMeetingPoint;
  interests: string[];
  ageRange: { min: number; max: number } | null;
  timeOfDay: EventTimeOfDay;
  startsAt: string;
  endsAt: string;
  price: number;
  capacity: number;
  imageUrl: string;
  groupId: string;
}
