import nodemailer from 'nodemailer';

export function isPasswordResetEmailConfigured(): boolean {
  return !!(
    process.env['SMTP_HOST'] &&
    process.env['SMTP_USER'] &&
    process.env['SMTP_PASSWORD'] &&
    process.env['SMTP_FROM']
  );
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const host = process.env['SMTP_HOST'];
  const user = process.env['SMTP_USER'];
  const password = process.env['SMTP_PASSWORD'];
  const from = process.env['SMTP_FROM'];
  const port = Number(process.env['SMTP_PORT'] ?? 587);
  if (!host || !user || !password || !from || !Number.isInteger(port) || port < 1) {
    throw new Error('Configura SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM y SMTP_PORT.');
  }

  const frontendOrigin = (process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:4200').replace(
    /\/+$/,
    '',
  );
  const resetUrl = new URL('/cuenta/restablecer', frontendOrigin);
  resetUrl.hash = `token=${encodeURIComponent(token)}`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Restablece tu contraseña de SinglesPlans',
    text: `Para elegir una nueva contraseña, abre este enlace (válido durante una hora): ${resetUrl.toString()}`,
    html: `<p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p><p><a href="${resetUrl.toString()}">Elegir una nueva contraseña</a></p><p>El enlace caduca en una hora. Si no solicitaste este cambio, ignora este correo.</p>`,
  });
}
