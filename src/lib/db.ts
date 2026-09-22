import postgres from 'postgres';

const globalDatabase = globalThis as unknown as { tnwSql?: ReturnType<typeof postgres> };

export function isDatabaseConfigured(): boolean {
  try { return ['postgres:', 'postgresql:'].includes(new URL(process.env.DATABASE_URL ?? '').protocol); }
  catch { return false; }
}

/** Lazy connection; schema is managed only by scripts/migrate.ts, never by a request. */
export function db(): ReturnType<typeof postgres> {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!globalDatabase.tnwSql) {
    const url = new URL(process.env.DATABASE_URL!);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    globalDatabase.tnwSql = postgres(process.env.DATABASE_URL!, {
      max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false,
      ssl: local ? false : { rejectUnauthorized: true },
      connection: { application_name: 'tnw', statement_timeout: 15000 },
      onnotice: () => {},
    });
  }
  return globalDatabase.tnwSql;
}
