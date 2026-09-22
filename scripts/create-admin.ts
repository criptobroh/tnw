import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { db } from '../src/lib/db';
import { hashPassword, normalizeEmail, validEmail, validatePassword } from '../src/lib/auth';

if (existsSync('.env.local')) loadEnvFile('.env.local');

async function passwordInput(): Promise<string> {
  if (process.env.TNW_ADMIN_PASSWORD) return process.env.TNW_ADMIN_PASSWORD;
  if (process.stdin.isTTY) throw new Error('PASSWORD_REQUIRED');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (input.length > 1024) throw new Error('PASSWORD_TOO_LONG');
  }
  return input.replace(/\r?\n$/, '');
}

async function main() {
try {
  const email = normalizeEmail(process.env.TNW_ADMIN_EMAIL ?? 'hola@nocoda.ai');
  const name = (process.env.TNW_ADMIN_NAME ?? 'Administración TNW').trim();
  if (!validEmail(email) || !name || name.length > 120) throw new Error('INVALID_ADMIN');
  const password = await passwordInput();
  validatePassword(password);
  const hash = await hashPassword(password);
  const created = await db().begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(2026092202)`;
    const rows = await sql`
      INSERT INTO users (email, name, role, password_hash) VALUES (${email}, ${name}, 'admin', ${hash})
      ON CONFLICT (email) DO NOTHING RETURNING id
    `;
    if (rows[0]) await sql`INSERT INTO audit (actor, action, kind, entity_id) VALUES ('bootstrap', 'create_admin', 'users', ${rows[0].id})`;
    return rows.length > 0;
  });
  console.log(created ? 'Administrador TNW creado. La contraseña no se muestra ni se registra.' : 'El usuario ya existe. Su contraseña y permisos no se modificaron.');
} catch {
  console.error('No se pudo crear el administrador. Ejecutá las migraciones y definí TNW_ADMIN_EMAIL y TNW_ADMIN_PASSWORD (12–128 caracteres), o enviá la contraseña por stdin.');
  process.exitCode = 1;
} finally { try { await db().end({ timeout: 5 }); } catch { /* Missing configuration. */ } }
}

void main();
