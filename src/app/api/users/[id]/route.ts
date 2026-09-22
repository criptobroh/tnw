import { assertOrigin, authResponse, AuthError, hashPassword, privateJson, readJson, requireRole, ROLES, validatePassword, validateUserPatch } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Role, User } from '@/lib/types';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(request);
    const actor = await requireRole('admin');
    const { id } = await context.params;
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new AuthError(400, 'El identificador no es válido.');
    const input = await readJson(request);
    if (!Object.keys(input).length || Object.keys(input).some(key => !['name', 'role', 'password', 'active'].includes(key))) throw new AuthError(400, 'La solicitud contiene campos no permitidos.');
    const name = input.name === undefined ? undefined : typeof input.name === 'string' ? input.name.trim() : '';
    const role = input.role as Role | undefined;
    if (name !== undefined && (!name || name.length > 120)) throw new AuthError(400, 'El nombre no es válido.');
    if (role !== undefined && !ROLES.includes(role)) throw new AuthError(400, 'El rol no es válido.');
    if (input.active !== undefined && typeof input.active !== 'boolean') throw new AuthError(400, 'El estado no es válido.');
    let passwordHash: string | undefined;
    if (input.password !== undefined) { validatePassword(input.password); passwordHash = await hashPassword(input.password); }
    const active = input.active as boolean | undefined;
    const user = await db().begin(async (sql) => {
      // All admin membership changes share the lock, preventing two concurrent last-admin removals.
      await sql`SELECT pg_advisory_xact_lock(2026092202)`;
      const allowed = await sql`SELECT id FROM users WHERE id = ${actor.id} AND active = true AND role = 'admin' FOR UPDATE`;
      if (!allowed.length) throw new AuthError(403, 'Tu acceso de administrador cambió.');
      const targets = await sql<(User & { active: boolean; password_hash: string })[]>`SELECT id, name, email, role, active, password_hash FROM users WHERE id = ${id} FOR UPDATE`;
      const target = targets[0];
      if (!target) throw new AuthError(404, 'El usuario no existe.');
      const counts = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND active = true`;
      validateUserPatch(actor.id, target, { role, active }, counts[0].count);
      const rows = await sql<(User & { active: boolean })[]>`
        UPDATE users SET name = ${name ?? target.name}, role = ${role ?? target.role}, active = ${active ?? target.active},
          password_hash = ${passwordHash ?? target.password_hash}, updated_at = now()
        WHERE id = ${id} RETURNING id, name, email, role, active
      `;
      if (passwordHash || active === false || (role !== undefined && role !== target.role)) await sql`DELETE FROM sessions WHERE user_id = ${id}`;
      await sql`INSERT INTO audit (actor, action, kind, entity_id) VALUES (${actor.email}, ${passwordHash ? 'update_user_password' : 'update_user'}, 'users', ${id})`;
      return rows[0];
    });
    return privateJson({ user });
  } catch (error) { return authResponse(error); }
}
