/**
 * Explicit opt-in: TNW_HTTP_TEST=1 npx tsx scripts/http-smoke.ts
 * Only localhost/loopback is accepted. This creates uniquely marked QA entities,
 * runs the public HTTP contract, then removes only this run's rows and Blob files.
 * No passwords, cookies, shared URLs, provider tokens or business data are logged.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import sharp from 'sharp';
import { del } from '@vercel/blob';
import { db } from '../src/lib/db';
import { hashPassword, hashToken } from '../src/lib/auth';
import { businessDate, kinds } from '../src/lib/domain';
import type { Kind } from '../src/lib/types';

type Client = { email: string; password: string; cookie?: string; id?: string };
type Check = { name: string; status: 'passed' | 'failed'; durationMs: number; detail?: string };
type HttpResult = { status: number; data: any; text: string; bytes: Buffer; headers: Headers };
type RequestOptions = {
  client?: Client; method?: string; json?: unknown; body?: BodyInit;
  origin?: string | null; headers?: Record<string, string>; expected?: number; timeoutMs?: number;
};

const runId = randomUUID();
const prefix = `qa-${runId}`;
const uniqueIp = `198.18.${parseInt(runId.slice(0, 2), 16)}.${parseInt(runId.slice(2, 4), 16)}`;
const marker = `QA_PRIVATE_${runId}`;
const checks: Check[] = [];
const clients: Client[] = [];
const recordIds = new Set<string>();
const eventIds = new Set<string>();
const paths = new Set<string>();
let origin = '';
const focused = process.env.TNW_HTTP_PHASE === 'remaining';
const completedEarlier = new Set([
  'write permissions and CSRF are enforced by the server',
  'domain CRUD persists relationships; manual status does not fabricate telemetry',
  'optimistic versions and inclusive local capacity reject conflicting writes',
  'invalid import rolls back every row in its batch',
  'upload rejects disguised files and oversized requests',
  'evidence verifies storage hash and screen/campaign relationships',
  'telemetry authenticates, deduplicates, rejects collisions and keeps chronological signal',
]);

class SmokeAssertionError extends Error {}
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new SmokeAssertionError(message); }

async function request(path: string, options: RequestOptions = {}): Promise<HttpResult> {
  const headers = new Headers(options.headers);
  headers.set('x-forwarded-for', uniqueIp);
  const method = options.method ?? 'GET';
  if (options.client?.cookie) headers.set('cookie', options.client.cookie);
  if (!['GET', 'HEAD'].includes(method) && options.origin !== null) headers.set('origin', options.origin ?? origin);
  let body = options.body;
  if (options.json !== undefined) { headers.set('content-type', 'application/json'); body = JSON.stringify(options.json); }
  const target = new URL(path, origin);
  ensure(target.origin === origin, 'HTTP smoke refuses to send a request outside its loopback origin');
  const response = await fetch(target, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(options.timeoutMs ?? 50000) });
  const setCookie = response.headers.getSetCookie().find(value => value.startsWith('tnw_session='));
  if (options.client && setCookie) options.client.cookie = setCookie.split(';')[0];
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString('utf8');
  let data: any = null;
  if (response.headers.get('content-type')?.includes('application/json')) { try { data = JSON.parse(text); } catch { /* A failed JSON contract is reported by the check. */ } }
  if (options.expected !== undefined && response.status !== options.expected) {
    // Deliberately exclude URL and response body: either may contain a capability or private content.
    throw new Error(`HTTP ${response.status}; expected ${options.expected}`);
  }
  return { status: response.status, data, text, bytes, headers: response.headers };
}

async function check(name: string, work: () => Promise<void>, continueOnFailure = false): Promise<void> {
  if (focused && completedEarlier.has(name)) return;
  const start = Date.now();
  try {
    await work();
    checks.push({ name, status: 'passed', durationMs: Date.now() - start });
    console.log(`PASS ${name}`);
  } catch (error) {
    // Only our bounded status errors are persisted; never serialize provider/SQL/assertion errors.
    const errorType = error instanceof Error && /^[A-Za-z]+Error$/.test(error.name) ? error.name : 'Error';
    const message = error instanceof SmokeAssertionError ? error.message : error instanceof Error && /^HTTP \d{3}; expected \d{3}$/.test(error.message) ? error.message : `Request or contract failure (${errorType})`;
    checks.push({ name, status: 'failed', durationMs: Date.now() - start, detail: message });
    console.error(`FAIL ${name}: ${message}`);
    if (!continueOnFailure) throw error;
  }
}

async function signIn(client: Client) {
  const result = await request('/api/auth/login', { client, method: 'POST', json: { email: client.email, password: client.password }, expected: 200 });
  ensure(result.data?.user?.id && client.cookie?.startsWith('tnw_session='), 'Login must return user and cookie');
  client.id = result.data.user.id;
}

async function create(kind: Kind, payload: Record<string, unknown>, client: Client) {
  let record: any;
  await check(`create ${kind} through its authorized role`, async () => {
    const result = await request(`/api/records/${kind}`, { client, method: 'POST', json: payload, expected: 201 });
    ensure(result.data?.record?.id, 'Created record missing ID');
    recordIds.add(result.data.record.id);
    record = result.data.record;
  });
  return record;
}

function fileForm(bytes: Buffer, name = 'qa.png', type = 'image/png') {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(bytes)], name, { type }));
  return form;
}

async function cleanup(): Promise<{ completed: boolean; filesRemoved: number; remainingRows: number }> {
  if (!clients.length) return { completed: true, filesRemoved: 0, remainingRows: 0 };
  const emails = clients.map(client => client.email);
  const ownedUsers = await db()`SELECT id FROM users WHERE email IN ${db()(emails)}`;
  const userIds = ownedUsers.map(row => row.id as string);
  // A response could have been lost after commit: discover this run's IDs from its own audit actors.
  const recorded = await db()`SELECT entity_id FROM audit WHERE actor IN ${db()(emails)} AND entity_id IS NOT NULL`;
  for (const row of recorded) recordIds.add(row.entity_id);
  const playerRows = await db()`SELECT id FROM records WHERE kind='evidence' AND payload->>'notes' LIKE ${`Evento de player ${prefix}:%`}`;
  for (const row of playerRows) recordIds.add(row.id);
  if (userIds.length) {
    const uploads = await db()`SELECT path FROM uploads WHERE uploaded_by IN ${db()(userIds)}`;
    for (const upload of uploads) paths.add(upload.path);
  }
  let filesRemoved = 0;
  for (const path of paths) { await del(path); filesRemoved++; }
  await db().begin(async sql => {
    if (userIds.length) {
      await sql`DELETE FROM shared_reports WHERE created_by IN ${sql(userIds)}`;
      await sql`DELETE FROM uploads WHERE uploaded_by IN ${sql(userIds)}`;
    }
    if (recordIds.size) {
      await sql`DELETE FROM records WHERE id IN ${sql([...recordIds])}`;
      await sql`DELETE FROM audit WHERE actor='integración:player' AND entity_id IN ${sql([...recordIds])}`;
    }
    if (eventIds.size) await sql`DELETE FROM telemetry_events WHERE event_id IN ${sql([...eventIds])}`;
    await sql`DELETE FROM audit WHERE actor IN ${sql(emails)}`;
    const rateKeys = [
      ...emails.map(email => `login:email:${hashToken(email)}`), `login:ip:${hashToken(uniqueIp)}`,
      ...userIds.flatMap(id => [`upload:${id}`, `share:${id}`, `assistant:${id}`]),
    ];
    await sql`DELETE FROM rate_limits WHERE key IN ${sql(rateKeys)}`;
    await sql`DELETE FROM users WHERE email IN ${sql(emails)}`;
  });
  const [usersLeft] = await db()`SELECT count(*)::int AS n FROM users WHERE email IN ${db()(emails)}`;
  const [recordsLeft] = recordIds.size ? await db()`SELECT count(*)::int AS n FROM records WHERE id IN ${db()([...recordIds])}` : [{ n: 0 }];
  return { completed: true, filesRemoved, remainingRows: usersLeft.n + recordsLeft.n };
}

async function main() {
  if (process.env.TNW_HTTP_TEST !== '1') throw new Error('Explicit TNW_HTTP_TEST=1 is required.');
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const base = new URL(process.env.TNW_HTTP_BASE_URL ?? 'http://localhost:3000');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || base.protocol !== 'http:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('Only a plain HTTP loopback origin is allowed.');
  }
  origin = base.origin;
  let previous: { startedAt?: string; checks?: Check[] } = {};
  if (focused) {
    previous = JSON.parse(await readFile('output/qa/http-smoke.json', 'utf8'));
    for (const name of completedEarlier) ensure(previous.checks?.some(item => item.name === name && item.status === 'passed'), 'Focused follow-up requires evidence that prerequisite checks passed');
  }
  const startedAt = new Date().toISOString();
  let cleanupResult: { completed: boolean; filesRemoved?: number; remainingRows?: number } = { completed: false };
  let failed = false;

  try {
    await check('server is ready and internal reads reject missing sessions', async () => {
      await request('/api/health', { expected: 200 });
      for (const path of ['/api/workspace', '/api/export', '/api/users', '/api/files?path=invalid']) await request(path, { expected: 401 });
      const session = await request('/api/auth/session', { expected: 200 });
      ensure(session.data?.user === null, 'Anonymous session should be null');
    });

    const admin: Client = { email: `${prefix}-admin@tnw.invalid`, password: randomBytes(24).toString('base64url'), id: randomUUID() };
    clients.push(admin);
    await db()`INSERT INTO users(id,email,name,role,password_hash) VALUES(${admin.id!},${admin.email},${prefix},'admin',${await hashPassword(admin.password)})`;

    await check('login rejects CSRF and wrong passwords and issues a private session', async () => {
      await request('/api/auth/login', { method: 'POST', json: { email: admin.email, password: admin.password }, origin: 'https://hostile.invalid', expected: 403 });
      await request('/api/auth/login', { method: 'POST', json: { email: admin.email, password: admin.password }, origin: null, expected: 403 });
      await request('/api/auth/login', { method: 'POST', json: { email: admin.email, password: 'incorrect-password' }, expected: 401 });
      await signIn(admin);
      const workspace = await request('/api/workspace', { client: admin, expected: 200 });
      ensure(workspace.headers.get('cache-control')?.includes('no-store'), 'Workspace must not cache');
      ensure(workspace.data.user.role === 'admin', 'Role mismatch');
      const [stored] = await db()`SELECT token_hash FROM sessions WHERE user_id=${admin.id!}`;
      ensure(stored?.token_hash && !admin.cookie?.includes(stored.token_hash), 'Token should only be stored as a hash');
    });

    const roleClients = {} as Record<'operations' | 'sales' | 'viewer', Client>;
    await check('admin creates all roles through HTTP; self-demotion is blocked', async () => {
      for (const role of ['operations', 'sales', 'viewer'] as const) {
        const client: Client = { email: `${prefix}-${role}@tnw.invalid`, password: randomBytes(24).toString('base64url') };
        clients.push(client);
        const created = await request('/api/users', { client: admin, method: 'POST', json: { name: `${prefix} ${role}`, email: client.email, password: client.password, role }, expected: 201 });
        client.id = created.data.user.id;
        await signIn(client);
        roleClients[role] = client;
      }
      await request(`/api/users/${admin.id}`, { client: admin, method: 'PATCH', json: { role: 'viewer' }, expected: 409 });
    });
    const { operations, sales, viewer } = roleClients;

    await check('write permissions and CSRF are enforced by the server', async () => {
      await request('/api/records/clients', { client: viewer, method: 'POST', json: { name: prefix }, expected: 403 });
      await request('/api/records/screens', { client: sales, method: 'POST', json: {}, expected: 403 });
      await request('/api/records/campaigns', { client: operations, method: 'POST', json: {}, expected: 403 });
      await request('/api/users', { client: viewer, expected: 403 });
      await request('/api/restore', { client: sales, method: 'POST', json: {}, expected: 403 });
      await request('/api/upload', { client: sales, method: 'POST', json: {}, expected: 403 });
      await request('/api/share', { client: operations, method: 'POST', json: {}, expected: 403 });
      await request('/api/records/operators', { client: operations, method: 'POST', origin: 'https://hostile.invalid', json: { name: prefix, city: 'QA' }, expected: 403 });
    });

    const operator = await create('operators', { name: `=${prefix}`, city: 'QA', contact: marker }, operations);
    const customer = await create('clients', { name: `${prefix} customer`, company: 'QA company', email: `${prefix}-private@tnw.invalid`, notes: `${marker}_client` }, sales);
    const screenInput = { name: `${prefix} screen`, city: 'QA', latitude: -34.6037, longitude: -58.3816, operatorId: operator.id, ownership: 'partner', slotSeconds: 10, loopSeconds: 10, currency: 'ARS', monthlyRate: 100000, monthlyCost: 931337.91, notes: `${marker}_screen`, status: 'online', lastSeen: new Date().toISOString() };
    const screen = await create('screens', screenInput, operations);
    const otherScreen = await create('screens', { ...screenInput, name: `${prefix} unrelated screen` }, operations);
    const now = Date.now();
    const campaignInput = { name: `${prefix} campaign`, clientId: customer.id, screenIds: [screen.id], startDate: businessDate(now - 86400000), endDate: businessDate(now + 86400000), status: 'active', budget: 123456.78, currency: 'ARS', spotSeconds: 10, notes: `${marker}_campaign` };
    const campaign = await create('campaigns', campaignInput, sales);
    const quote = await create('quotes', { name: `${prefix} quote`, clientId: customer.id, screenIds: [screen.id], startDate: campaign.startDate, endDate: campaign.endDate, baseAmount: 100.05, adjustmentPercent: 10, agencyPercent: 15, serviceAmount: 20, taxPercent: 21 }, sales);
    const incident = await create('incidents', { screenId: screen.id, title: `${prefix} incident`, priority: 'high', notes: marker }, operations);

    await check('domain CRUD persists relationships; manual status does not fabricate telemetry', async () => {
      ensure(screen.status === 'unknown' && screen.lastSeen === '', 'Manual creation must not establish online status');
      const result = await request('/api/workspace', { client: viewer, expected: 200 });
      for (const [kind, record] of [['operators', operator], ['clients', customer], ['screens', screen], ['campaigns', campaign], ['quotes', quote], ['incidents', incident]] as const) {
        ensure(result.data.data[kind].some((item: any) => item.id === record.id), 'Saved entity missing from workspace');
      }
      await request(`/api/records/screens/${screen.id}`, { client: operations, method: 'DELETE', json: { version: screen.version }, expected: 409 });
    });

    await check('optimistic versions and inclusive local capacity reject conflicting writes', async () => {
      await request(`/api/records/incidents/${incident.id}`, { client: operations, method: 'PATCH', json: { version: incident.version, status: 'in_progress' }, expected: 200 });
      await request(`/api/records/incidents/${incident.id}`, { client: operations, method: 'PATCH', json: { version: incident.version, status: 'resolved' }, expected: 409 });
      await request('/api/records/campaigns', { client: sales, method: 'POST', json: { ...campaignInput, name: `${prefix} overbook` }, expected: 409 });
      await request(`/api/records/screens/${screen.id}`, { client: operations, method: 'PATCH', json: { version: screen.version, currency: 'USD' }, expected: 409 });
    });

    await check('invalid import rolls back every row in its batch', async () => {
      const firstName = `${prefix} import rollback`;
      await request('/api/import', { client: operations, method: 'POST', json: { kind: 'operators', records: [{ name: firstName, city: 'QA' }, { name: 'x', city: 'QA' }] }, expected: 400 });
      const result = await request('/api/workspace', { client: operations, expected: 200 });
      ensure(!result.data.data.operators.some((item: any) => item.name === firstName), 'Partial import persisted');
    });

    const image = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#dbf740' } }).png().toBuffer();
    let uploaded: { url: string; sha256: string };
    await check('valid image is private and its stored bytes match SHA-256', async () => {
      const result = await request('/api/upload', { client: operations, method: 'POST', body: fileForm(image), expected: 201 });
      uploaded = result.data;
      paths.add(new URL(uploaded.url, origin).searchParams.get('path')!);
      await request(uploaded.url, { expected: 401 });
      const fetched = await request(uploaded.url, { client: viewer, expected: 200 });
      ensure(fetched.headers.get('content-type') === 'image/webp', 'Stored format mismatch');
      ensure(createHash('sha256').update(fetched.bytes).digest('hex') === uploaded.sha256, 'Stored derivative hash mismatch');
    });
    await check('upload rejects disguised files and oversized requests', async () => {
      await request('/api/upload', { client: operations, method: 'POST', body: fileForm(Buffer.from('<script>bad</script>'), 'bad.jpg', 'image/jpeg'), expected: 400 });
      await request('/api/upload', { client: operations, method: 'POST', body: fileForm(Buffer.alloc(4_400_000)), expected: 413 });
    });

    const evidenceInput = { screenId: screen.id, campaignId: campaign.id, capturedAt: new Date(now).toISOString(), fileUrl: uploaded!.url, sha256: uploaded!.sha256, source: 'manual', status: 'verified', notes: `${marker}_evidence` };
    const evidence = await create('evidence', evidenceInput, operations);
    const pending = await create('evidence', { ...evidenceInput, status: 'pending' }, operations);
    await check('evidence verifies storage hash and screen/campaign relationships', async () => {
      await request('/api/records/evidence', { client: operations, method: 'POST', json: { ...evidenceInput, sha256: '0'.repeat(64) }, expected: 400 });
      await request('/api/records/evidence', { client: operations, method: 'POST', json: { ...evidenceInput, screenId: otherScreen.id }, expected: 400 });
      await request('/api/records/evidence', { client: operations, method: 'POST', json: { ...evidenceInput, plays: 1 }, expected: 400 });
    });

    const telemetryHeaders = { authorization: `Bearer ${process.env.TNW_TELEMETRY_TOKEN ?? ''}` };
    const event = { eventId: `${prefix}:newest`, screenId: screen.id, campaignId: campaign.id, observedAt: new Date(now - 60000).toISOString(), status: 'online', plays: 3 };
    let playerEvidenceId = '';
    if (focused) {
      // Only fixture setup: duplicate/collision/chronology assertions are preserved from the earlier completed run.
      eventIds.add(event.eventId);
      const fixture = await request('/api/telemetry', { method: 'POST', json: event, headers: telemetryHeaders, expected: 200 });
      playerEvidenceId = fixture.data.evidenceId;
      recordIds.add(playerEvidenceId);
    }
    await check('telemetry authenticates, deduplicates, rejects collisions and keeps chronological signal', async () => {
      ensure(process.env.TNW_TELEMETRY_TOKEN, 'Telemetry not configured');
      await request('/api/telemetry', { method: 'POST', json: event, expected: 401 });
      eventIds.add(event.eventId);
      const first = await request('/api/telemetry', { method: 'POST', json: event, headers: telemetryHeaders, expected: 200 });
      ensure(first.data.duplicate === false && first.data.signalUpdated === true && first.data.evidenceId, 'First event contract');
      playerEvidenceId = first.data.evidenceId;
      recordIds.add(playerEvidenceId);
      const duplicate = await request('/api/telemetry', { method: 'POST', json: event, headers: telemetryHeaders, expected: 200 });
      ensure(duplicate.data.duplicate === true, 'Retry should be duplicate');
      await request('/api/telemetry', { method: 'POST', json: { ...event, plays: 4 }, headers: telemetryHeaders, expected: 409 });
      const older = { eventId: `${prefix}:older`, screenId: screen.id, observedAt: new Date(now - 600000).toISOString(), status: 'offline' };
      eventIds.add(older.eventId);
      const oldResult = await request('/api/telemetry', { method: 'POST', json: older, headers: telemetryHeaders, expected: 200 });
      ensure(oldResult.data.signalUpdated === false, 'Older observation must not replace latest');
      const wrongRelation = { ...event, eventId: `${prefix}:wrong-relation`, screenId: otherScreen.id };
      eventIds.add(wrongRelation.eventId);
      await request('/api/telemetry', { method: 'POST', json: wrongRelation, headers: telemetryHeaders, expected: 400 });
      const data = (await request('/api/workspace', { client: operations, expected: 200 })).data.data;
      const current = data.screens.find((row: any) => row.id === screen.id);
      ensure(current.status === 'online' && current.lastSeen === event.observedAt, 'Chronological status mismatch');
      ensure(data.evidence.filter((row: any) => row.id === playerEvidenceId).length === 1, 'Duplicate evidence created');
      await request(`/api/records/evidence/${playerEvidenceId}`, { client: operations, method: 'PATCH', json: { version: 1, plays: 999 }, expected: 400 });
      await request(`/api/records/evidence/${playerEvidenceId}`, { client: operations, method: 'PATCH', json: { version: 1, status: 'verified' }, expected: 200 });
    });

    let sharedPath = '', sharedToken = '';
    await check('shared report excludes sensitive fields and serves only verified campaign files', async () => {
      const shared = await request('/api/share', { client: sales, method: 'POST', json: { campaignId: campaign.id, days: 1 }, expected: 201 });
      const url = new URL(shared.data.url);
      await check('shared link uses the browser origin', async () => {
        ensure(url.origin === origin, 'Shared report origin mismatch');
      }, true);
      sharedPath = url.pathname;
      sharedToken = sharedPath.split('/').at(-1)!;
      const report = await request(sharedPath, { expected: 200 });
      ensure(report.text.includes(campaign.name), 'Shared report missing campaign');
      ensure(!report.text.includes(marker), 'Internal notes leaked');
      ensure(!report.text.includes(`${prefix}-private@tnw.invalid`), 'Contact email leaked');
      ensure(!report.text.includes(otherScreen.name), 'Unrelated inventory leaked');
      ensure(!report.text.includes('931337.91'), 'Internal cost leaked');
      const imageResult = await request(`/api/report-file/${sharedToken}?id=${evidence.id}`, { expected: 200 });
      ensure(createHash('sha256').update(imageResult.bytes).digest('hex') === uploaded!.sha256, 'Shared image mismatch');
      await request(`/api/report-file/${sharedToken}?id=${pending.id}`, { expected: 404 });
      await request(`/api/report-file/${sharedToken}?id=${randomUUID()}`, { expected: 404 });
      await request(`/api/report-file/${'a'.repeat(43)}?id=${evidence.id}`, { expected: 404 });
    });

    await check('read-only assistant uses the real configured AI provider', async () => {
      const answer = await request('/api/assistant', { client: viewer, method: 'POST', json: { message: '¿Cuántas pantallas registradas hay? Indicá que esta pregunta no cambia datos.' }, expected: 200, timeoutMs: 50000 });
      ensure(answer.data?.mode === 'ai', 'Expected real AI, got local fallback');
      ensure(typeof answer.data.answer === 'string' && answer.data.answer.length > 0, 'Missing assistant answer');
    });

    await check('exports include records and metadata; restore refuses a populated workspace', async () => {
      const csv = await request('/api/export?kind=operators', { client: viewer, expected: 200 });
      ensure(csv.text.includes(`"'=${prefix}"`), 'CSV formula escaped incorrectly');
      const backup = await request('/api/export', { client: admin, expected: 200 });
      ensure(backup.data.format === 'tnw-backup-v1', 'Backup format mismatch');
      ensure(backup.data.data.campaigns.some((row: any) => row.id === campaign.id), 'Backup missing campaign');
      ensure(backup.data.uploads.some((row: any) => paths.has(row.path)), 'Backup missing upload metadata');
      ensure(backup.data.telemetry.some((row: any) => row.event_id === event.eventId), 'Backup missing idempotency metadata');
      ensure(!('users' in backup.data) && !('sessions' in backup.data), 'Authentication secrets exported');
      await request('/api/restore', { client: admin, method: 'POST', json: { format: 'tnw-backup-v1', data: Object.fromEntries(kinds.map(kind => [kind, []])), uploads: [], telemetry: [] }, expected: 409 });
    });

    await check('share revocation removes report and image access immediately', async () => {
      await request('/api/share', { client: sales, method: 'DELETE', json: { campaignId: campaign.id }, expected: 200 });
      await request(sharedPath, { expected: 404 });
      await request(`/api/report-file/${sharedToken}?id=${evidence.id}`, { expected: 404 });
    });

    await check('role change revokes an existing session and logout invalidates its server token', async () => {
      const oldViewerCookie = viewer.cookie;
      await request(`/api/users/${viewer.id}`, { client: admin, method: 'PATCH', json: { role: 'operations' }, expected: 200 });
      await request('/api/workspace', { client: { ...viewer, cookie: oldViewerCookie }, expected: 401 });
      await signIn(viewer);
      ensure((await request('/api/auth/session', { client: viewer, expected: 200 })).data.user.role === 'operations', 'Fresh role not applied');
      const oldAdminCookie = admin.cookie;
      await request('/api/auth/logout', { client: admin, method: 'POST', json: {}, expected: 200 });
      await request('/api/workspace', { client: { ...admin, cookie: oldAdminCookie }, expected: 401 });
    });
  } catch {
    failed = true;
  } finally {
    failed ||= checks.some(item => item.status === 'failed');
    try {
      cleanupResult = await cleanup();
      if (cleanupResult.remainingRows) { failed = true; cleanupResult.completed = false; }
    } catch { failed = true; console.error('QA cleanup requires review; no non-QA rows were intentionally targeted.'); }
    await mkdir('output/qa', { recursive: true });
    let consolidated = previous.checks ?? [];
    for (const result of checks) consolidated = [...consolidated.filter(item => item.name !== result.name), result];
    failed ||= consolidated.some(item => item.status === 'failed');
    await writeFile('output/qa/http-smoke.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), target: origin, mode: focused ? 'focused-followup' : 'full', previousStartedAt: previous.startedAt, status: failed ? 'failed' : 'passed', checks: focused ? consolidated : checks, cleanup: cleanupResult }, null, 2));
    try { await db().end({ timeout: 5 }); } catch { /* Configuration errors are handled without exposing values. */ }
    console.log(`HTTP smoke: ${checks.filter(item => item.status === 'passed').length} passed; cleanup ${cleanupResult.completed ? 'complete' : 'incomplete'}.`);
    if (failed) process.exitCode = 1;
  }
}

void main().catch(() => { console.error('HTTP smoke requires explicit opt-in and a loopback server. Check local configuration.'); process.exitCode = 1; });
