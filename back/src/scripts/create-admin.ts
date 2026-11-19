import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';

async function createAdmin(): Promise<void> {
  const email = process.env['ADMIN_EMAIL']?.trim().toLowerCase();
  const password = process.env['ADMIN_PASSWORD'];
  const name = process.env['ADMIN_NAME']?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Define ADMIN_EMAIL con una dirección de correo válida.');
  }
  await connectDatabase();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = 'admin';
    if (name) existingUser.name = name;
    await existingUser.save();
    console.log(`La cuenta ${email} ya puede acceder a Administración. Su contraseña no se ha cambiado.`);
    return;
  }

  if (!password || password.length < 12) {
    throw new Error('La cuenta no existe. Define ADMIN_PASSWORD con al menos 12 caracteres para crearla.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name: name || 'Administración', email, passwordHash, role: 'admin' });
  console.log(`Cuenta administradora creada para ${email}.`);
}

createAdmin()
  .catch((error: unknown) => {
    console.error('No se pudo crear el administrador:', error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
