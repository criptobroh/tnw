import { randomUUID } from 'node:crypto';
import { assertOrigin, authResponse, AuthError, hashPassword, normalizeEmail, privateJson, readJson, requireRole, ROLES, validEmail, validatePassword } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Role, User } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('admin');
    const users = await db()`SELECT id, name, email, role, active, created_at AS "createdAt" FROM users ORDER BY name, email`;
    return privateJson({ users });
  } catch (error) { return authResponse(error); }
}

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const actor = await requireRole('admin');
    const input = await readJson(request);
    const email = normalizeEmail(input.email);
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const role = input.role as Role;
    if (Object.keys(input).some(key => !['name', 'email', 'role', 'password'].includes(key))) throw new AuthError(400, 'La solicitud contiene campos no permitidos.');
    if (!validEmail(email) || !name || name.length > 120 || !ROLES.includes(role)) throw new AuthError(400, 'Revisá el nombre, el correo y el rol.');
    validatePassword(input.password);
    const hash = await hashPassword(input.password);
    const user = await db().begin(async (sql) => {
      await sql`SELECT pg_advisory_xact_lock(2026092202)`;
      const allowed = await sql`SELECT id FROM users WHERE id = ${actor.id} AND active = true AND role = 'admin' FOR UPDATE`;
      if (!allowed.length) throw new AuthError(403, 'Tu acceso de administrador cambió.');
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length) throw new AuthError(409, 'Ya existe un usuario con ese correo.');
      const rows = await sql<User[]>`
        INSERT INTO users (id, name, email, role, password_hash) VALUES (${randomUUID()}, ${name}, ${email}, ${role}, ${hash})
        RETURNING id, name, email, role
      `;
      await sql`INSERT INTO audit (actor, action, kind, entity_id) VALUES (${actor.email}, 'create_user', 'users', ${rows[0].id})`;
      return rows[0];
    });
    return privateJson({ user }, 201);
  } catch (error) { return authResponse(error); }
}
