import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

async function startServer(): Promise<void> {
  const secret = process.env['JWT_SECRET'];
  if (!secret || secret.length < 32) {
    throw new Error('Configura JWT_SECRET con al menos 32 caracteres antes de iniciar.');
  }
  await connectDatabase();

  const port = Number(process.env['PORT'] ?? 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Singles Plans API listening on port ${port}.`));
}

startServer().catch((error: unknown) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});
