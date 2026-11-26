import bcrypt from 'bcryptjs';
import { createHash, createSign, randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { createAppToken } from '../services/auth-token.js';

type Provider = 'google' | 'apple' | 'facebook';

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
}

interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
}

const STATE_COOKIE = 'sp_oauth_state';
const VERIFIER_COOKIE = 'sp_oauth_pkce';
const NONCE_COOKIE = 'sp_oauth_nonce';

function isProvider(value: string): value is Provider {
  return value === 'google' || value === 'apple' || value === 'facebook';
}

function providerFromParams(req: Request): Provider | null {
  const raw = req.params['provider'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && isProvider(value) ? value : null;
}

function providerLabel(provider: Provider): string {
  return { google: 'Google', apple: 'Apple', facebook: 'Facebook' }[provider];
}

function demoModeEnabled(): boolean {
  return process.env['OAUTH_DEMO'] === '1' && process.env['NODE_ENV'] !== 'production';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function demoConsentPage(provider: Provider, state: string): string {
  const label = escapeHtml(providerLabel(provider));
  const token = escapeHtml(state);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Acceso de demostración</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f6f7fb; color: #1c2130; margin: 0; display: grid; place-items: center; min-height: 100vh; }
    main { background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(20, 25, 45, .12); max-width: 420px; padding: 32px; width: calc(100% - 48px); }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    p { color: #5a6175; line-height: 1.5; }
    .warning { background: #fff4d6; border-radius: 8px; color: #6b4b00; padding: 12px; }
    label { display: block; font-weight: 600; margin-top: 16px; }
    input { box-sizing: border-box; font: inherit; margin-top: 6px; padding: 10px 12px; width: 100%; }
    button { background: #4338ca; border: 0; border-radius: 8px; color: #fff; cursor: pointer; font: inherit; font-weight: 600; margin-top: 24px; padding: 12px 18px; width: 100%; }
  </style>
</head>
<body>
  <main>
    <h1>Acceso de demostración con ${label}</h1>
    <p class="warning">Modo demo activo: no se contacta con ${label}. Introduce un correo para entrar con una cuenta local de prueba.</p>
    <form method="post" action="/api/auth/oauth/${provider}/callback">
      <input type="hidden" name="state" value="${token}">
      <input type="hidden" name="code" value="demo">
      <label for="demo-email">Correo de prueba</label>
      <input id="demo-email" name="email" type="email" required autocomplete="email" placeholder="prueba@ejemplo.com">
      <label for="demo-name">Nombre (opcional)</label>
      <input id="demo-name" name="name" type="text" autocomplete="name" placeholder="Persona de prueba">
      <button type="submit">Continuar en modo demo</button>
    </form>
  </main>
</body>
</html>`;
}

function redirectUriFor(provider: Provider, apiOrigin: string): string {
  const configured = process.env[`${provider.toUpperCase()}_REDIRECT_URI`]?.trim();
  return configured || `${apiOrigin}/api/auth/oauth/${provider}/callback`;
}

function getProviderConfig(provider: Provider): ProviderConfig | null {
  const apiOrigin = (process.env['API_ORIGIN'] ?? 'http://localhost:3000').replace(/\/+$/, '');
  const redirectUri = redirectUriFor(provider, apiOrigin);

  if (provider === 'google') {
    const clientId = process.env['GOOGLE_CLIENT_ID']?.trim() ?? '';
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET']?.trim() ?? '';
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    };
  }

  if (provider === 'facebook') {
    const clientId = process.env['FACEBOOK_APP_ID']?.trim() ?? '';
    const clientSecret = process.env['FACEBOOK_APP_SECRET']?.trim() ?? '';
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
      scope: 'email public_profile',
    };
  }

  const clientId = process.env['APPLE_CLIENT_ID']?.trim() ?? '';
  const teamId = process.env['APPLE_TEAM_ID']?.trim() ?? '';
  const keyId = process.env['APPLE_KEY_ID']?.trim() ?? '';
  const privateKey = process.env['APPLE_PRIVATE_KEY']?.trim() ?? '';
  if (!clientId || !teamId || !keyId || !privateKey) return null;
  return {
    clientId,
    clientSecret: '',
    redirectUri,
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scope: 'name email',
  };
}

function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

function setCookie(
  res: Response,
  name: string,
  value: string,
  maxAge: number,
  crossSite = false,
): void {
  const secure = process.env['NODE_ENV'] === 'production' || crossSite;
  const sameSite = crossSite ? 'None' : 'Lax';
  res.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=${sameSite}; Path=/api/auth/oauth; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
  );
}

function clearCookie(res: Response, name: string, crossSite = false): void {
  const secure = process.env['NODE_ENV'] === 'production' || crossSite;
  const sameSite = crossSite ? 'None' : 'Lax';
  res.append(
    'Set-Cookie',
    `${name}=; HttpOnly; SameSite=${sameSite}; Path=/api/auth/oauth; Max-Age=0${secure ? '; Secure' : ''}`,
  );
}

function redirectToFrontend(res: Response, params: Record<string, string>): void {
  const frontendOrigin = (process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:4200').replace(/\/+$/, '');
  const url = new URL('/cuenta/oauth/callback', frontendOrigin);
  url.hash = new URLSearchParams(params).toString();
  res.redirect(url.toString());
}

function redirectWithError(res: Response, message: string): void {
  redirectToFrontend(res, { error: message });
}

async function postForm<T>(url: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error('Respuesta inesperada del proveedor de acceso.');
  }
  if (!response.ok) throw new Error('El proveedor de acceso rechazó la solicitud.');
  return data;
}

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('No se pudo obtener el perfil del proveedor.');
  return (await response.json()) as T;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createAppleClientSecret(clientId: string): string {
  const teamId = process.env['APPLE_TEAM_ID']?.trim() ?? '';
  const keyId = process.env['APPLE_KEY_ID']?.trim() ?? '';
  const privateKey = (process.env['APPLE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n').trim();
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'ES256', kid: keyId });
  const payload = base64UrlJson({
    iss: teamId,
    iat: now,
    exp: now + 3600,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  });
  const signingInput = `${header}.${payload}`;
  const signature = createSign('SHA256')
    .update(signingInput)
    .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${signingInput}.${signature}`;
}

function decodeIdToken(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('El proveedor no devolvió un token válido.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
}

function readValue(source: unknown, key: string): string {
  if (!source || typeof source !== 'object') return '';
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function readRequestValue(req: Request, key: string): string {
  const bodyValue = readValue(req.body, key);
  if (bodyValue) return bodyValue;
  const queryValue = req.query[key];
  return typeof queryValue === 'string' ? queryValue : '';
}

async function fetchProfile(
  provider: Provider,
  config: ProviderConfig,
  code: string,
  codeVerifier: string,
  req: Request,
  expectedNonce: string,
): Promise<OAuthProfile> {
  if (provider === 'google') {
    const tokens = await postForm<{ access_token?: string }>(config.tokenUrl, {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });
    if (!tokens.access_token) throw new Error('Google no devolvió un token de acceso.');
    const profile = await fetchJson<{
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    }>('https://www.googleapis.com/oauth2/v3/userinfo', tokens.access_token);
    if (!profile.sub || !profile.email || profile.email_verified === false) {
      throw new Error('Google no devolvió un correo verificado.');
    }
    return { providerId: profile.sub, email: profile.email, name: profile.name ?? '' };
  }

  if (provider === 'facebook') {
    const tokens = await postForm<{ access_token?: string }>(config.tokenUrl, {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    });
    if (!tokens.access_token) throw new Error('Facebook no devolvió un token de acceso.');
    const profile = await fetchJson<{ id?: string; email?: string; name?: string }>(
      'https://graph.facebook.com/v20.0/me?fields=id,name,email',
      tokens.access_token,
    );
    if (!profile.id || !profile.email) {
      throw new Error('Facebook no devolvió un correo. Comprueba el permiso email.');
    }
    return { providerId: profile.id, email: profile.email, name: profile.name ?? '' };
  }

  const tokens = await postForm<{ id_token?: string }>(config.tokenUrl, {
    code,
    client_id: config.clientId,
    client_secret: createAppleClientSecret(config.clientId),
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });
  if (!tokens.id_token) throw new Error('Apple no devolvió un token de identidad.');
  const claims = decodeIdToken(tokens.id_token);
  const providerId = readValue(claims, 'sub');
  const email = readValue(claims, 'email');
  if (
    !providerId ||
    !email ||
    !expectedNonce ||
    readValue(claims, 'nonce') !== expectedNonce
  ) {
    throw new Error('Apple no devolvió una identidad válida.');
  }

  let name = email.split('@')[0];
  const rawUser = readValue(req.body, 'user');
  if (rawUser) {
    try {
      const appleUser = JSON.parse(rawUser) as { name?: { firstName?: string; lastName?: string } };
      const fullName = [appleUser.name?.firstName, appleUser.name?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fullName) name = fullName;
    } catch {
      // Apple solo envía el nombre la primera vez; si no viene, usamos el correo.
    }
  }
  return { providerId, email, name };
}

async function findOrCreateUser(provider: Provider, profile: OAuthProfile) {
  const email = profile.email.trim().toLowerCase();
  if (!email) throw new Error('El proveedor no devolvió un correo válido.');
  const providerField = `${provider}Id`;

  let user = await User.findOne({ email });
  if (!user) {
    const query: Record<string, string> = { [providerField]: profile.providerId };
    user = await User.findOne(query);
  }

  if (!user) {
    user = new User({
      name: profile.name.trim() || email.split('@')[0],
      email,
      passwordHash: await bcrypt.hash(randomBytes(32).toString('base64url'), 12),
      location: '',
      adultConfirmed: true,
      role: 'user',
      superusuario: false,
      [providerField]: profile.providerId,
    });
    await user.save();
    return user;
  }

  const linkedId = user.get(providerField) as string | undefined;
  if (!linkedId) {
    user.set(providerField, profile.providerId);
    await user.save();
  }
  return user;
}

export function startOAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const provider = providerFromParams(req);
    if (!provider) {
      res.status(404).json({ message: 'Proveedor de acceso desconocido.' });
      return;
    }
    const state = randomBytes(24).toString('base64url');

    if (demoModeEnabled()) {
      setCookie(res, STATE_COOKIE, state, 600);
      res.type('html').send(demoConsentPage(provider, state));
      return;
    }

    const config = getProviderConfig(provider);
    if (!config) {
      res.status(503).json({ message: `El acceso con ${providerLabel(provider)} aún no está configurado.` });
      return;
    }

    const crossSite = provider === 'apple';
    setCookie(res, STATE_COOKIE, state, 600, crossSite);

    const url = new URL(config.authorizeUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('scope', config.scope);
    url.searchParams.set('state', state);

    if (provider === 'google') {
      const verifier = randomBytes(32).toString('base64url');
      setCookie(res, VERIFIER_COOKIE, verifier, 600);
      url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('prompt', 'select_account');
      url.searchParams.set('access_type', 'online');
    }

    if (provider === 'apple') {
      const nonce = randomBytes(24).toString('base64url');
      setCookie(res, NONCE_COOKIE, nonce, 600, true);
      url.searchParams.set('nonce', nonce);
      url.searchParams.set('response_mode', 'form_post');
    }

    res.redirect(url.toString());
  } catch (error) {
    next(error);
  }
}

export async function oauthCallback(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const provider = providerFromParams(req);
  if (!provider) {
    redirectWithError(res, 'Proveedor de acceso desconocido.');
    return;
  }

  const demo = demoModeEnabled();
  let config: ProviderConfig | null = null;
  if (!demo) {
    config = getProviderConfig(provider);
    if (!config) {
      redirectWithError(res, `El acceso con ${providerLabel(provider)} aún no está configurado.`);
      return;
    }
  }

  const crossSite = !demo && provider === 'apple';
  const cookies = parseCookies(req);
  const code = readRequestValue(req, 'code');
  const state = readRequestValue(req, 'state');
  if (!code || !state || !cookies[STATE_COOKIE] || state !== cookies[STATE_COOKIE]) {
    clearCookie(res, STATE_COOKIE, crossSite);
    clearCookie(res, VERIFIER_COOKIE);
    clearCookie(res, NONCE_COOKIE, crossSite);
    redirectWithError(res, 'La solicitud de acceso no es válida. Vuelve a intentarlo.');
    return;
  }

  clearCookie(res, STATE_COOKIE, crossSite);
  const codeVerifier = provider === 'google' ? cookies[VERIFIER_COOKIE] ?? '' : '';
  if (provider === 'google') clearCookie(res, VERIFIER_COOKIE);
  const expectedNonce = provider === 'apple' ? cookies[NONCE_COOKIE] ?? '' : '';
  if (provider === 'apple') clearCookie(res, NONCE_COOKIE, crossSite);

  try {
    let profile: OAuthProfile;
    if (demo) {
      const email = readRequestValue(req, 'email').trim().toLowerCase();
      if (code !== 'demo' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        redirectWithError(res, 'Introduce un correo de prueba válido para continuar.');
        return;
      }
      const name = readRequestValue(req, 'name').trim();
      profile = {
        providerId: `demo:${email}`,
        email,
        name: name || email.split('@')[0],
      };
    } else {
      if (!config) throw new Error('La configuración del proveedor no está disponible.');
      profile = await fetchProfile(provider, config, code, codeVerifier, req, expectedNonce);
    }

    const user = await findOrCreateUser(provider, profile);
    redirectToFrontend(res, {
      token: createAppToken(user.id, user.role),
      provider,
    });
  } catch (error) {
    console.error(`OAuth ${provider} error:`, error);
    redirectWithError(res, `No se pudo completar el acceso con ${providerLabel(provider)}. Vuelve a intentarlo.`);
  }
}
