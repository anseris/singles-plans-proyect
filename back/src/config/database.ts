import mongoose from 'mongoose';
import { Enrollment } from '../models/enrollment.model.js';
import { Event } from '../models/event.model.js';
import { Group } from '../models/group.model.js';
import { GroupMembership } from '../models/group-membership.model.js';
import { GroupInterest } from '../models/group-interest.model.js';
import { User } from '../models/user.model.js';

export async function connectDatabase(): Promise<void> {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('Falta la variable obligatoria MONGODB_URI.');
  }

  await mongoose.connect(uri);
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error('MongoDB conectó, pero no se pudo abrir la base de datos configurada.');
  }

  const existingCollections = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name)
  );
  for (const collectionName of ['users', 'groups', 'groupmemberships', 'groupinterests', 'events', 'enrollments']) {
    if (!existingCollections.has(collectionName)) {
      await database.createCollection(collectionName);
    }
  }

  await Promise.all([
    User.createIndexes(),
    Group.createIndexes(),
    GroupInterest.createIndexes(),
    GroupMembership.createIndexes(),
    Event.createIndexes(),
    Enrollment.createIndexes()
  ]);
  console.log('Conectado a MongoDB.');
}
