import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import { db } from '../src/lib/db';

// Explicit schema migration, adapted from the separation used by Alynk's build script.
export async function migrate(): Promise<void> {
  const sql = db();
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(2026092201)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const done = await tx`SELECT version FROM schema_migrations WHERE version = '001_tnw_core'`;
    if (!done.length) {
    await tx`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE CHECK (email = lower(email)),
        name text NOT NULL,
        role text NOT NULL CHECK (role IN ('admin', 'operations', 'sales', 'viewer')),
        password_hash text NOT NULL,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`
      CREATE TABLE sessions (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`CREATE INDEX sessions_user_idx ON sessions(user_id)`;
    await tx`CREATE INDEX sessions_expiry_idx ON sessions(expires_at)`;
    await tx`CREATE TABLE rate_limits (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL)`;
    await tx`CREATE INDEX rate_limits_expiry_idx ON rate_limits(reset_at)`;
    await tx`
      CREATE TABLE records (
        kind text NOT NULL CHECK (kind IN ('screens', 'clients', 'operators', 'campaigns', 'evidence', 'incidents', 'opportunities', 'quotes')),
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        version integer NOT NULL DEFAULT 1 CHECK (version > 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (kind, id)
      )
    `;
    await tx`CREATE INDEX records_updated_idx ON records(updated_at DESC)`;
    await tx`
      CREATE TABLE audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor text NOT NULL,
        action text NOT NULL,
        kind text NOT NULL,
        entity_id uuid,
        at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`CREATE INDEX audit_at_idx ON audit(at DESC)`;
    await tx`CREATE TABLE telemetry_events (event_id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now())`;
    await tx`INSERT INTO schema_migrations (version) VALUES ('001_tnw_core')`;
    }
    const integrationsDone = await tx`SELECT version FROM schema_migrations WHERE version = '002_tnw_integrations'`;
    if (!integrationsDone.length) {
      await tx`
        CREATE TABLE uploads (
          path text PRIMARY KEY,
          sha256 text NOT NULL,
          uploaded_by uuid REFERENCES users(id),
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await tx`ALTER TABLE telemetry_events ADD COLUMN payload_hash text NOT NULL DEFAULT ''`;
      await tx`
        CREATE TABLE shared_reports (
          token_hash text PRIMARY KEY,
          campaign_id uuid NOT NULL,
          expires_at timestamptz,
          created_by uuid REFERENCES users(id),
          created_at timestamptz NOT NULL DEFAULT now(),
          revoked boolean NOT NULL DEFAULT false
        )
      `;
      await tx`CREATE INDEX shared_reports_campaign_idx ON shared_reports(campaign_id)`;
      await tx`INSERT INTO schema_migrations (version) VALUES ('002_tnw_integrations')`;
    }
  });
}

async function main() {
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  try {
    await migrate();
    console.log('Migraciones TNW aplicadas. No se cargaron datos de demostración.');
  } catch {
    console.error('No se pudo migrar TNW. Verificá DATABASE_URL y la conectividad.');
    process.exitCode = 1;
  } finally { try { await db().end({ timeout: 5 }); } catch { /* Missing configuration. */ } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
