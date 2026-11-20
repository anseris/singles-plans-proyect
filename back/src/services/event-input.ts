import mongoose from 'mongoose';
import type { EventType } from '../models/event.model.js';

const eventTypes: readonly EventType[] = ['excursion', 'trip', 'event'];

export function isValidEventInput(input: Record<string, unknown>, allowedTypes: readonly EventType[]): boolean {
  const startsAt = new Date(String(input['startsAt']));
  const endsAt = new Date(String(input['endsAt']));
  return (
    typeof input['title'] === 'string' &&
    input['title'].trim().length > 0 &&
    typeof input['description'] === 'string' &&
    input['description'].trim().length > 0 &&
    eventTypes.includes(input['type'] as EventType) &&
    allowedTypes.includes(input['type'] as EventType) &&
    typeof input['location'] === 'string' &&
    input['location'].trim().length > 0 &&
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

export function eventFields(input: Record<string, unknown>) {
  return {
    title: String(input['title']).trim(),
    description: String(input['description']).trim(),
    type: input['type'] as EventType,
    location: String(input['location']).trim(),
    startsAt: new Date(String(input['startsAt'])),
    endsAt: new Date(String(input['endsAt'])),
    price: Number(input['price']),
    capacity: Number(input['capacity']),
    group: new mongoose.Types.ObjectId(String(input['groupId'])),
    imageUrl: typeof input['imageUrl'] === 'string' ? input['imageUrl'].trim() : ''
  };
}
