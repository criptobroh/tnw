import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOrigin, AuthError, hashPassword, hashToken, normalizeEmail, requestOrigin, readJson, validatePassword, validateUserPatch, verifyPassword } from '../src/lib/auth';
import type { User } from '../src/lib/types';

test('passwords have unique salt, verify correctly, reject wrong and malformed hashes', async () => {
  const password = 'Una contraseña TNW 2026';
  const [one, two] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert.notEqual(one, two);
  assert.ok(await verifyPassword(password, one));
  assert.equal(await verifyPassword('incorrecta', one), false);
  assert.equal(await verifyPassword(password, 'scrypt$v1$999999999$8$1$bad$bad'), false);
  assert.equal(await verifyPassword('x'.repeat(129), one), false);
  assert.equal(one.includes(password), false);
});

test('password policy and email normalization', () => {
  assert.equal(normalizeEmail('  HOLA@Example.com '), 'hola@example.com');
  assert.throws(() => validatePassword('short'), AuthError);
  assert.throws(() => validatePassword('x'.repeat(129)), AuthError);
  validatePassword('x'.repeat(12));
  assert.equal(hashToken('a').length, 64);
  assert.notEqual(hashToken('a'), hashToken('b'));
});

test('writes reject missing, hostile and browser cross-site origins', () => {
  const url = 'https://tnw.lol/api/users';
  assert.doesNotThrow(() => assertOrigin(new Request(url, { headers: { origin: 'https://tnw.lol', 'sec-fetch-site': 'same-origin' } })));
  const examples: Record<string, string>[] = [{}, { origin: 'https://evil.example' }, { origin: 'null' }, { origin: 'https://tnw.lol', 'sec-fetch-site': 'cross-site' }];
  for (const headers of examples) {
    assert.throws(() => assertOrigin(new Request(url, { headers })), (error: unknown) => error instanceof AuthError && error.status === 403);
  }
});

test('local bind address accepts the actual browser Host but still rejects foreign origins', () => {
  const url = 'http://0.0.0.0:3000/api/auth/login';
  assert.equal(requestOrigin(new Request(url, { headers: { host: 'localhost:3000' } })), 'http://localhost:3000');
  assert.equal(requestOrigin(new Request(url, { headers: { host: 'evil.invalid/path' } })), 'http://0.0.0.0:3000');
  assert.doesNotThrow(() => assertOrigin(new Request(url, { headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' } })));
  assert.throws(() => assertOrigin(new Request(url, { headers: { host: 'localhost:3000', origin: 'https://hostile.invalid', 'sec-fetch-site': 'same-origin' } })), AuthError);
});

test('JSON reader enforces real body size and object shape', async () => {
  const make = (body: string) => new Request('https://tnw.lol/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.deepEqual(await readJson(make('{"name":"Ana"}')), { name: 'Ana' });
  await assert.rejects(readJson(make('{"name":"Ana"}'), 4), (error: unknown) => error instanceof AuthError && error.status === 413);
  for (const body of ['[]', 'null', '{bad']) await assert.rejects(readJson(make(body)), AuthError);
});

test('administrator cannot remove own access; last admin stays active', () => {
  const target: User & { active: boolean } = { id: 'admin-a', name: 'Admin', email: 'admin@example.com', role: 'admin', active: true };
  assert.throws(() => validateUserPatch('admin-a', target, { active: false }, 2), AuthError);
  assert.throws(() => validateUserPatch('admin-a', target, { role: 'viewer' }, 2), AuthError);
  assert.throws(() => validateUserPatch('admin-b', target, { active: false }, 1), AuthError);
  assert.throws(() => validateUserPatch('admin-b', target, { role: 'operations' }, 1), AuthError);
  assert.doesNotThrow(() => validateUserPatch('admin-b', target, { role: 'viewer' }, 2));
  assert.doesNotThrow(() => validateUserPatch('admin-a', target, { role: 'admin', active: true }, 1));
});
