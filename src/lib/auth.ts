import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db, isDatabaseConfigured } from './db';
import type { Role, User } from './types';

export const SESSION_COOKIE = 'tnw_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const ROLES: readonly Role[] = ['admin', 'operations', 'sales', 'viewer'];
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const DUMMY_HASH = `scrypt$v1$16384$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'AuthError'; }
}

export function privateJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

export function authResponse(error: unknown): Response {
  if (error instanceof AuthError) return privateJson({ error: error.message }, error.status);
  // Do not expose database URLs, queries, stack traces or credentials in API responses/logs.
  console.error('[tnw] operation unavailable', error instanceof Error ? error.name : 'UnknownError');
  return privateJson({ error: 'No se pudo completar la operación. Intentá nuevamente.' }, 503);
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePassword(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw new AuthError(400, 'La contraseña debe tener entre 12 y 128 caracteres.');
  }
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(16);
  const digest = await derive(password, salt);
  return `scrypt$v1$16384$8$1$${salt.toString('hex')}$${digest.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length > 128) return false;
  const match = /^scrypt\$v1\$16384\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  const actual = await derive(password, Buffer.from(match[1], 'hex'));
  return timingSafeEqual(actual, Buffer.from(match[2], 'hex'));
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_SECONDS };
}

/** Every request resolves current role and active status from PostgreSQL. */
export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  if (!isDatabaseConfigured()) throw new AuthError(503, 'La base de datos no está configurada.');
  try {
    const rows = await db()<User[]>`
      SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now() AND u.active = true LIMIT 1
    `;
    return rows[0] ?? null;
  } catch { throw new AuthError(503, 'No se pudo verificar tu sesión. Intentá nuevamente.'); }
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new AuthError(401, 'Iniciá sesión para continuar.');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError(403, 'No tenés permiso para esta operación.');
  return user;
}

/** Recover the browser-facing origin when Next reconstructs URL from its bind address. */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  // Next's local server may reconstruct request.url with its bind address
  // (0.0.0.0) instead of the browser's Host. Browsers cannot forge Host on fetch.
  const host = request.headers.get('host');
  if (host && /^[a-zA-Z0-9.\-:[\]]+$/.test(host)) {
    try {
      const actual = new URL(`${url.protocol}//${host}`);
      if (actual.host.toLowerCase() === host.toLowerCase()) return actual.origin;
    } catch { /* Malformed Host never grants access. */ }
  }
  return url.origin;
}

/** Adapted from Chat IEB safe-json-request: a cookie alone never authorizes cross-origin writes. */
export function assertOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const allowed = new Set([new URL(request.url).origin, requestOrigin(request)]);
  for (const value of [process.env.NEXT_PUBLIC_APP_URL, process.env.AUTH_URL]) {
    if (value) { try { allowed.add(new URL(value).origin); } catch { /* Invalid configuration cannot grant access. */ } }
  }
  if (!origin || !allowed.has(origin) || (site && site !== 'same-origin' && site !== 'none')) {
    throw new AuthError(403, 'Origen de la solicitud no permitido.');
  }
}

/** Stream cap also works when Content-Length is missing or dishonest. */
export async function readJson(request: Request, maxBytes = 16384): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    throw new AuthError(415, 'Se esperaba JSON.');
  }
  if (!request.body) throw new AuthError(400, 'Falta el contenido de la solicitud.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new AuthError(413, 'La solicitud supera el tamaño permitido.'); }
      chunks.push(value);
    }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not_object');
    return value;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(400, 'El contenido JSON no es válido.');
  }
}

/** Atomic fixed windows in PostgreSQL work across Vercel instances. */
export async function consumeLoginLimit(email: string, request: Request): Promise<void> {
  const rawIp = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')
    : request.headers.get('x-forwarded-for');
  const ip = (rawIp ?? 'unknown').split(',')[0].trim().slice(0, 128);
  const keys = [{ key: `login:email:${hashToken(email)}`, max: 10 }, { key: `login:ip:${hashToken(ip)}`, max: 50 }];
  for (const { key, max } of keys) {
    const rows = await db()<{ count: number }[]>`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, now() + interval '15 minutes')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE LEAST(rate_limits.count + 1, ${max + 1}) END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN now() + interval '15 minutes' ELSE rate_limits.reset_at END
      RETURNING count
    `;
    if (rows[0].count > max) throw new AuthError(429, 'Demasiados intentos. Esperá 15 minutos antes de volver a probar.');
  }
}

export async function login(email: string, password: string, request: Request): Promise<User> {
  if (!isDatabaseConfigured()) throw new AuthError(503, 'El espacio de trabajo todavía no tiene base de datos configurada.');
  await consumeLoginLimit(email, request);
  const rows = await db()<(User & { password_hash: string; active: boolean })[]>`
    SELECT id, name, email, role, password_hash, active FROM users WHERE email = ${email} LIMIT 1
  `;
  const candidate = rows[0];
  const valid = await verifyPassword(password, candidate?.password_hash ?? DUMMY_HASH);
  if (!candidate || !candidate.active || !valid) throw new AuthError(401, 'El correo o la contraseña no son correctos.');
  const token = randomBytes(32).toString('hex');
  // Lock and recheck prevents a concurrent password reset/deactivation from creating a session with stale credentials.
  const user = await db().begin(async (sql) => {
    const fresh = await sql<(User & { password_hash: string; active: boolean })[]>`
      SELECT id, name, email, role, password_hash, active FROM users WHERE id = ${candidate.id} FOR UPDATE
    `;
    const current = fresh[0];
    if (!current?.active || current.password_hash !== candidate.password_hash) throw new AuthError(401, 'El correo o la contraseña no son correctos.');
    await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${hashToken(token)}, ${current.id}, now() + interval '7 days')`;
    await sql`DELETE FROM sessions WHERE expires_at <= now()`;
    await sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`;
    await sql`INSERT INTO audit (actor, action, kind, entity_id) VALUES (${current.email}, 'login', 'users', ${current.id})`;
    return { id: current.id, name: current.name, email: current.email, role: current.role };
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
  return user;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token) && isDatabaseConfigured()) {
    await db()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }
  jar.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

export function validateUserPatch(actorId: string, target: User & { active: boolean }, patch: { role?: Role; active?: boolean }, activeAdmins: number): void {
  const removesAdmin = target.role === 'admin' && target.active && ((patch.role !== undefined && patch.role !== 'admin') || patch.active === false);
  if (target.id === actorId && (patch.active === false || (patch.role !== undefined && patch.role !== 'admin'))) {
    throw new AuthError(409, 'No podés desactivar tu acceso ni quitarte el rol de administrador.');
  }
  if (removesAdmin && activeAdmins <= 1) throw new AuthError(409, 'Debe quedar al menos un administrador activo.');
}
