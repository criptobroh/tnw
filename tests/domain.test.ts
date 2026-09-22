import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { businessDate, canWrite, csvCell, evidenceMatchesCampaign, findCapacityConflict, kinds, parseRecord, plannedPlaysPerDay, quoteTotals, roundMoney, screenCompatibilityIssue, screenStatus, type CapacityCampaign, type CapacityScreen } from '../src/lib/domain';
import { db } from '../src/lib/db';
import { requireFreshWriter, validateReferences } from '../src/lib/data';
import { ApiError } from '../src/lib/http';
import type { Kind, Role, User } from '../src/lib/types';

const screenId = 'a1111111-1111-4111-8111-111111111111';
const otherScreenId = 'b1111111-1111-4111-8111-111111111111';
const screen: CapacityScreen = { id: screenId, loopSeconds: 20, slotSeconds: 10, currency: 'ARS' };
const campaign = (overrides: Partial<CapacityCampaign> = {}): CapacityCampaign => ({
  id: randomUUID(), screenIds: [screenId], startDate: '2026-01-01', endDate: '2026-01-10', status: 'scheduled', spotSeconds: 10, currency: 'ARS', ...overrides,
});

test('each internal role has only its assigned write permissions; unknown roles fail closed', () => {
  const expected: Record<Role, Kind[]> = { admin: kinds, operations: ['screens', 'evidence', 'incidents', 'operators'], sales: ['clients', 'operators', 'campaigns', 'quotes', 'opportunities'], viewer: [] };
  for (const role of Object.keys(expected) as Role[]) for (const kind of kinds) assert.equal(canWrite(role, kind), expected[role].includes(kind), `${role}: ${kind}`);
  assert.equal(canWrite('unrecognized' as Role, 'screens'), false);
});

test('quote has a reproducible commission base, tax base and decimal half rounding', () => {
  assert.deepEqual(quoteTotals({ baseAmount: 100.05, adjustmentPercent: 10, agencyPercent: 15, serviceAmount: 20, taxPercent: 21 }), {
    adjustedBase: 110.06, subtotal: 130.06, commission: 16.51, tax: 27.31, total: 157.37, net: 113.55,
  });
  assert.equal(roundMoney(10.075), 10.08);
  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(roundMoney(1e-7), 0);
  assert.deepEqual(quoteTotals({ baseAmount: 0, adjustmentPercent: 0, agencyPercent: 100, serviceAmount: 0, taxPercent: 0 }), { adjustedBase: 0, subtotal: 0, commission: 0, tax: 0, total: 0, net: 0 });
});

test('signal freshness distinguishes missing, stale, future, offline and maintenance', () => {
  const now = Date.parse('2026-01-05T12:00:00Z');
  const status = (lastSeen: string, value: 'online' | 'offline' | 'maintenance' = 'online') => screenStatus({ lastSeen, status: value }, now);
  assert.equal(status('2026-01-05T11:45:00Z'), 'online');
  assert.equal(status('2026-01-05T11:44:59Z'), 'unknown');
  assert.equal(status('2026-01-05T12:02:00Z'), 'unknown');
  assert.equal(status(''), 'unknown');
  assert.equal(status('invalid'), 'unknown');
  assert.equal(status('2026-01-05T11:59:00Z', 'offline'), 'offline');
  assert.equal(status('', 'maintenance'), 'maintenance');
  assert.equal(plannedPlaysPerDay({ operatingHours: 18, loopSeconds: 120 }), 540);
  assert.equal(plannedPlaysPerDay({ operatingHours: 18, loopSeconds: 0 }), 0);
});

test('CSV escapes separators and quotes and neutralizes leading spreadsheet formulas', () => {
  assert.equal(csvCell('San Telmo, "LED"'), '"San Telmo, ""LED"""');
  for (const value of ['=1+1', '+cmd', '-1', '@SUM(A1)', '  =1+1', '\t=1', '\rtest', '\n=1']) assert.ok(csvCell(value).startsWith('"\''), value);
  assert.equal(csvCell(['uno', 'dos']), '"uno|dos"');
  assert.equal(csvCell('normal'), '"normal"');
  assert.equal(csvCell(-34.6), '"-34.6"');
  assert.equal(csvCell(-58.4), '"-58.4"');
});

test('Buenos Aires business dates and evidence relationships are offset-independent', () => {
  assert.equal(businessDate('2026-01-06T01:00:00Z'), '2026-01-05');
  assert.equal(businessDate('2026-01-05T22:00:00-03:00'), '2026-01-05');
  assert.equal(businessDate('2026-01-06T10:00:00+09:00'), '2026-01-05');
  assert.equal(businessDate('2026-01-06T03:00:00Z'), '2026-01-06');
  assert.equal(businessDate('invalid'), '');
  const oneDay = campaign({ startDate: '2026-01-05', endDate: '2026-01-05' });
  assert.ok(evidenceMatchesCampaign({ screenId, capturedAt: '2026-01-06T01:00:00Z' }, oneDay));
  assert.equal(evidenceMatchesCampaign({ screenId: otherScreenId, capturedAt: '2026-01-06T01:00:00Z' }, oneDay), false);
  assert.equal(evidenceMatchesCampaign({ screenId, capturedAt: '2026-01-06T03:00:00Z' }, oneDay), false);
  assert.equal(evidenceMatchesCampaign({ screenId, capturedAt: '2026-01-05T02:59:59Z' }, oneDay), false);
});

test('capacity accepts its exact limit and rejects genuine inclusive overlap', () => {
  const a = campaign({ startDate: '2026-01-01', endDate: '2026-01-05' });
  const b = campaign({ startDate: '2026-01-05', endDate: '2026-01-10' });
  assert.equal(findCapacityConflict(screen, [a, b]), null);
  assert.deepEqual(findCapacityConflict({ ...screen, loopSeconds: 19 }, [a, b]), { date: '2026-01-05', usedSeconds: 20, capacitySeconds: 19 });
  assert.equal(findCapacityConflict({ ...screen, loopSeconds: 10 }, [a, { ...b, startDate: '2026-01-06' }]), null);
});

test('sweep line does not sum nonconcurrent reservations and excludes the edited campaign', () => {
  const allMonth = campaign({ spotSeconds: 5, startDate: '2026-01-01', endDate: '2026-01-31' });
  const firstHalf = campaign({ startDate: '2026-01-01', endDate: '2026-01-15' });
  const secondHalf = campaign({ startDate: '2026-01-16', endDate: '2026-01-31' });
  assert.equal(findCapacityConflict(screen, [allMonth, firstHalf, secondHalf]), null);
  assert.equal(findCapacityConflict({ ...screen, loopSeconds: 10 }, [firstHalf, campaign()], firstHalf.id), null);
  const ignored = ['draft', 'paused', 'completed'].map(status => campaign({ status: status as CapacityCampaign['status'], spotSeconds: 300 }));
  assert.equal(findCapacityConflict(screen, [...ignored, campaign({ screenIds: [otherScreenId], spotSeconds: 300 })]), null);
});

test('editing screen preserves linked currencies, individual spots and reserved loop capacity', () => {
  assert.match(screenCompatibilityIssue({ ...screen, currency: 'USD' }, [campaign()], []) ?? '', /moneda/);
  assert.match(screenCompatibilityIssue({ ...screen, currency: 'USD' }, [], [{ screenIds: [screenId], currency: 'ARS' }]) ?? '', /moneda/);
  assert.match(screenCompatibilityIssue({ ...screen, slotSeconds: 5 }, [campaign({ status: 'completed' })], []) ?? '', /duración/);
  assert.match(screenCompatibilityIssue({ ...screen, loopSeconds: 15 }, [campaign(), campaign()], []) ?? '', /loop/);
  assert.equal(screenCompatibilityIssue(screen, [campaign(), campaign()], [{ screenIds: [otherScreenId], currency: 'USD' }]), null);
});

test('record validation rejects impossible dates, numeric limits, and invalid related IDs', () => {
  assert.throws(() => parseRecord('campaigns', { name: 'Campaña', startDate: '2026-01-10', endDate: '2026-01-01' }));
  assert.throws(() => parseRecord('campaigns', { name: 'Campaña', startDate: '2026-02-30', endDate: '2026-03-01' }));
  assert.throws(() => parseRecord('screens', { name: 'Pantalla', city: 'Ciudad', latitude: 91, longitude: 0 }));
  assert.throws(() => parseRecord('screens', { name: 'Pantalla', city: 'Ciudad', latitude: 0, longitude: 0, slotSeconds: 30, loopSeconds: 10 }));
  assert.throws(() => parseRecord('campaigns', { name: 'Campaña', startDate: '2026-01-01', endDate: '2026-01-10', clientId: 'not-a-uuid' }));
});

const runDatabaseTest = process.env.TNW_DB_TEST === '1';
if (runDatabaseTest && existsSync('.env.local')) loadEnvFile('.env.local');
after(async () => { if (runDatabaseTest) await db().end({ timeout: 5 }); });

test('PostgreSQL enforces fresh roles, capacity, reverse references and business dates without persisting test data', { skip: !runDatabaseTest }, async () => {
  const rollback = new Error('intentional_test_rollback');
  let completed = false;
  try {
    await db().begin(async sql => {
      const userId = randomUUID(), clientId = randomUUID(), localScreenId = randomUUID(), campaignAId = randomUUID(), campaignBId = randomUUID();
      const actor: User = { id: userId, name: 'Transactional test', email: `test-${userId}@tnw.invalid`, role: 'admin' };
      await sql`INSERT INTO users(id,email,name,role,password_hash,active) VALUES(${userId},${actor.email},${actor.name},'viewer','disabled-test-hash',false)`;
      await assert.rejects(requireFreshWriter(sql, actor, 'screens'), (error: unknown) => error instanceof ApiError && error.status === 401);
      await sql`UPDATE users SET active=true WHERE id=${userId}`;
      await assert.rejects(requireFreshWriter(sql, actor, 'screens'), (error: unknown) => error instanceof ApiError && error.status === 403);
      await sql`UPDATE users SET role='operations' WHERE id=${userId}`;
      assert.equal((await requireFreshWriter(sql, actor, 'screens')).role, 'operations');
      await assert.rejects(requireFreshWriter(sql, actor, 'clients'), (error: unknown) => error instanceof ApiError && error.status === 403);

      const client = parseRecord('clients', { name: 'Transactional client' });
      const localScreen = parseRecord('screens', { name: 'Transactional screen', city: 'Buenos Aires', latitude: -34.6, longitude: -58.4, slotSeconds: 10, loopSeconds: 20 });
      await sql`INSERT INTO records(kind,id,payload) VALUES('clients',${clientId},${sql.json(client as never)}),('screens',${localScreenId},${sql.json(localScreen as never)})`;
      const active = parseRecord('campaigns', { name: 'Transactional campaign', clientId, screenIds: [localScreenId], startDate: '2025-01-05', endDate: '2025-01-05', status: 'active', spotSeconds: 10 });
      await sql`INSERT INTO records(kind,id,payload) VALUES('campaigns',${campaignAId},${sql.json(active as never)}),('campaigns',${campaignBId},${sql.json(active as never)})`;
      await assert.rejects(validateReferences(sql, 'campaigns', active), (error: unknown) => error instanceof ApiError && error.status === 409);
      await validateReferences(sql, 'campaigns', active, campaignAId);
      await validateReferences(sql, 'campaigns', { ...active, startDate: '2025-01-06', endDate: '2025-01-06' });
      await assert.rejects(validateReferences(sql, 'campaigns', { ...active, clientId: randomUUID() }), (error: unknown) => error instanceof ApiError && error.status === 400);
      await assert.rejects(validateReferences(sql, 'screens', { ...localScreen, slotSeconds: 5 }, localScreenId), (error: unknown) => error instanceof ApiError && error.status === 409);
      await assert.rejects(validateReferences(sql, 'screens', { ...localScreen, loopSeconds: 10 }, localScreenId), (error: unknown) => error instanceof ApiError && error.status === 409);
      await assert.rejects(validateReferences(sql, 'screens', { ...localScreen, currency: 'USD' }, localScreenId), (error: unknown) => error instanceof ApiError && error.status === 409);
      const evidence = { screenId: localScreenId, campaignId: campaignAId, capturedAt: '2025-01-06T01:00:00Z', source: 'player', plays: 1 };
      await validateReferences(sql, 'evidence', evidence);
      await assert.rejects(validateReferences(sql, 'evidence', { ...evidence, capturedAt: '2025-01-06T03:00:00Z' }), (error: unknown) => error instanceof ApiError && error.status === 400);
      completed = true;
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  assert.ok(completed);
});
