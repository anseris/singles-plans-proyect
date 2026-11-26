import type { Response } from 'express';

export type TurnstileVerification = 'valid' | 'invalid' | 'unconfigured';

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerification> {
  const secret = process.env['TURNSTILE_SECRET_KEY']?.trim();
  if (!secret) return 'unconfigured';
  if (!token) return 'invalid';

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Turnstile respondió con el estado ${response.status}.`);
  }

  const result = (await response.json()) as { success?: unknown };
  return result.success === true ? 'valid' : 'invalid';
}

export async function requireHumanVerification(
  token: string,
  remoteIp: string | undefined,
  res: Response,
): Promise<boolean> {
  const result = await verifyTurnstile(token, remoteIp);
  if (result === 'unconfigured') {
    res.status(503).json({ message: 'La verificación de seguridad aún no está configurada.' });
    return false;
  }
  if (result === 'invalid') {
    res.status(400).json({ message: 'Marca la casilla «Soy humano» para continuar.' });
    return false;
  }
  return true;
}
