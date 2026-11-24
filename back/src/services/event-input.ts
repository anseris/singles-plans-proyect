import mongoose from 'mongoose';
import type { EventTimeOfDay, EventType } from '../models/event.model.js';

const eventTypes: readonly EventType[] = ['excursion', 'trip', 'event'];

interface MeetingPointInput {
  name: string;
  address: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
}

interface AgeRangeInput {
  min: number;
  max: number;
}

export function isValidEventInput(input: Record<string, unknown>, allowedTypes: readonly EventType[]): boolean {
  const startsAt = new Date(String(input['startsAt']));
  const endsAt = new Date(String(input['endsAt']));
  const meetingPoint = input['meetingPoint'];
  const ageRange = input['ageRange'];
  const validAgeRange = ageRange === null || ageRange === undefined || (
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
  const validMeetingPoint = typeof meetingPoint === 'object' &&
    meetingPoint !== null &&
    'name' in meetingPoint &&
    typeof meetingPoint.name === 'string' &&
    meetingPoint.name.trim().length > 0 &&
    meetingPoint.name.length <= 160 &&
    'address' in meetingPoint &&
    typeof meetingPoint.address === 'string' &&
    meetingPoint.address.trim().length > 0 &&
    meetingPoint.address.length <= 300 &&
    'placeId' in meetingPoint &&
    typeof meetingPoint.placeId === 'string' &&
    meetingPoint.placeId.length <= 200 &&
    'latitude' in meetingPoint &&
    (meetingPoint.latitude === null || (typeof meetingPoint.latitude === 'number' && Number.isFinite(meetingPoint.latitude) && meetingPoint.latitude >= -90 && meetingPoint.latitude <= 90)) &&
    'longitude' in meetingPoint &&
    (meetingPoint.longitude === null || (typeof meetingPoint.longitude === 'number' && Number.isFinite(meetingPoint.longitude) && meetingPoint.longitude >= -180 && meetingPoint.longitude <= 180));
  const interests = input['interests'] ?? [];
  return (
    typeof input['title'] === 'string' &&
    input['title'].trim().length > 0 &&
    typeof input['description'] === 'string' &&
    input['description'].trim().length > 0 &&
    eventTypes.includes(input['type'] as EventType) &&
    allowedTypes.includes(input['type'] as EventType) &&
    typeof input['location'] === 'string' &&
    input['location'].trim().length > 0 &&
    validMeetingPoint &&
    validAgeRange &&
    Array.isArray(interests) &&
    interests.every((interest) => typeof interest === 'string' && interest.length <= 40) &&
    (input['timeOfDay'] === undefined || ['afternoon', 'night', 'all-day'].includes(String(input['timeOfDay']))) &&
    mongoose.isValidObjectId(input['groupId']) &&
    Number.isFinite(startsAt.getTime()) &&
    Number.isFinite(endsAt.getTime()) &&
    startsAt > new Date() &&
    endsAt >= startsAt &&
    Number.isFinite(Number(input['price'])) &&
    Number(input['price']) >= 0 &&
    Number.isInteger(Number(input['capacity'])) &&
    Number(input['capacity']) > 0 &&
    (input['imageUrl'] === undefined || typeof input['imageUrl'] === 'string')
  );
}

export function areValidInterests(input: Record<string, unknown>): boolean {
  const interests = input['interests'] ?? [];
  return Array.isArray(interests) &&
    interests.every((interest) =>
      typeof interest === 'string' && interest.trim().length > 0 && interest.trim().length <= 40
    );
}

export function eventFields(input: Record<string, unknown>) {
  const interests = Array.isArray(input['interests'])
    ? input['interests'].filter((interest): interest is string => typeof interest === 'string')
    : [];
  return {
    title: String(input['title']).trim(),
    description: String(input['description']).trim(),
    type: input['type'] as EventType,
    location: String(input['location']).trim(),
    meetingPoint: input['meetingPoint'] as MeetingPointInput,
    interests,
    ageRange: (input['ageRange'] as AgeRangeInput | null | undefined) ?? null,
    timeOfDay: (input['timeOfDay'] as EventTimeOfDay | undefined) ?? 'afternoon',
    startsAt: new Date(String(input['startsAt'])),
    endsAt: new Date(String(input['endsAt'])),
    price: Number(input['price']),
    capacity: Number(input['capacity']),
    group: new mongoose.Types.ObjectId(String(input['groupId'])),
    imageUrl: typeof input['imageUrl'] === 'string' ? input['imageUrl'].trim() : ''
  };
}
