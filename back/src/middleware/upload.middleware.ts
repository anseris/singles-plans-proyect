import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const extensions = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensions.has(file.mimetype)) {
      callback(new Error('Formato de imagen no permitido. Usa JPG, PNG o WebP.'));
      return;
    }
    callback(null, true);
  },
}).single('avatar');

export function avatarFileName(mimeType: string): string {
  return `${randomUUID()}.${extensions.get(mimeType) ?? 'bin'}`;
}

export function uploadAvatar(req: Request, res: Response, next: NextFunction): void {
  avatarUpload(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'La imagen no puede superar los 2 MB.' });
      return;
    }

    const message = error instanceof Error ? error.message : 'No se pudo subir la imagen.';
    res.status(400).json({ message });
  });
}
