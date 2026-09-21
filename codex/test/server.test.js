import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';
import { openDatabase } from '../lib/database.js';
import { seeds } from '../lib/seeds.js';
import { validateProof } from '../lib/proof.js';

async function fixture(t, overrides = {}) {
  const db = openDatabase(':memory:');
  const env = { ADMIN_PASSWORD: 'a-long-test-password', OPENAI_API_KEY: 'test-key', APP_ORIGIN: 'http://localhost', ...overrides.env };
  const { server } = createApp({ db, env, fetchImpl: overrides.fetchImpl || (async () => Response.json({
    status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(seeds[1].content) }] }], usage: { input_tokens: 1, output_tokens: 1 },
  })) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); db.close(); });
  let cookie = '';
  async function request(path, method = 'GET', data, extraHeaders = {}) {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: { 'Content-Type': 'application/json', 'X-PlayProver': '1', Origin: 'http://localhost', Cookie: cookie, ...extraHeaders },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    return { status: res.status, data: await res.json(), headers: res.headers };
  }
  async function login() {
    const res = await request('/api/admin/login', 'POST', { password: env.ADMIN_PASSWORD });
    assert.equal(res.status, 200); cookie = res.headers.get('set-cookie').split(';')[0]; return res;
  }
  return { db, request, login, server };
}

test('public collection is seeded and private APIs require authentication', async t => {
  const { request } = await fixture(t);
  const list = await request('/api/proofs'); assert.equal(list.data.length, 2);
  const proof = await request('/api/proofs/proof-by-cases');
  assert.equal(proof.data.blocks.length, 6); assert.equal(proof.data.blocks[0].depends, undefined);
  assert.equal((await request('/api/admin/proofs')).status, 401);
  assert.equal((await request('/api/admin/generate', 'POST', { name: 'x', description: 'x' })).status, 401);
  assert.equal((await request('/api/admin/login', 'POST', { password: 'wrong' })).status, 401);
});
test('generate, playtest, approve, edit, reject, and unpublish lifecycle protects revisions', async t => {
  const { request, login } = await fixture(t); await login();
  const generated = await request('/api/admin/generate', 'POST', { name: 'A new proof', description: 'Prove the cases example.' });
  assert.equal(generated.status, 201); let row = generated.data;
  const path = '/api/admin/proofs/' + row.id;
  assert.equal(row.status, 'draft');
  assert.equal((await request('/api/proofs/' + row.id)).status, 404);
  assert.equal((await request(path + '/status', 'POST', { revision: 1, status: 'approved' })).status, 409);
  assert.equal((await request(path + '/grade', 'POST', { revision: 1, order: ['b1'] })).data.correct, false);
  assert.equal((await request(path + '/status', 'POST', { revision: 1, status: 'approved' })).status, 409);
  assert.equal((await request(path + '/grade', 'POST', { revision: 1, order: validateProof(row.content) })).data.correct, true);
  assert.equal((await request(path + '/status', 'POST', { revision: 1, status: 'approved' })).status, 200);
  assert.equal((await request('/api/proofs/' + row.id)).status, 200);
  assert.equal((await request('/api/proofs')).data.length, 3);
  const edited = await request(path, 'PUT', { revision: 1, name: 'Edited', description: row.description, content: row.content });
  assert.equal(edited.status, 200); row = edited.data;
  assert.equal(row.revision, 2); assert.equal(row.tested_revision, null); assert.equal(row.status, 'draft');
  assert.equal((await request('/api/proofs/' + row.id)).status, 404);
  assert.equal((await request(path + '/grade', 'POST', { revision: 1, order: validateProof(row.content) })).status, 409);
  assert.equal((await request(path + '/status', 'POST', { revision: 2, status: 'approved' })).status, 409);
  assert.equal((await request(path + '/status', 'POST', { revision: 2, status: 'rejected' })).status, 200);
  assert.equal((await request('/api/proofs')).data.length, 2);
  await request(path + '/grade', 'POST', { revision: 2, order: validateProof(row.content) });
  await request(path + '/status', 'POST', { revision: 2, status: 'approved' });
  assert.equal((await request(path + '/status', 'POST', { revision: 2, status: 'draft' })).status, 200);
  assert.equal((await request('/api/proofs/' + row.id)).status, 404);
});
test('CSRF checks, cookie flags, expiry, logout, and disabled admin', async t => {
  const { request, login, db } = await fixture(t);
  assert.equal((await request('/api/admin/login', 'POST', { password: 'a-long-test-password' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/api/admin/login', 'POST', { password: 'a-long-test-password' }, { 'X-PlayProver': '' })).status, 403);
  const res = await login();
  assert.match(res.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.equal((await request('/api/admin/session')).status, 200);
  db.prepare('UPDATE sessions SET expires=0').run();
  assert.equal((await request('/api/admin/session')).status, 401);
  await login(); await request('/api/admin/logout', 'POST', {});
  assert.equal((await request('/api/admin/session')).status, 401);
  const disabled = await fixture(t, { env: { ADMIN_PASSWORD: '' } });
  assert.equal((await disabled.request('/api/admin/login', 'POST', { password: '' })).status, 503);
});
test('generation has no daily cap and failed generations never create drafts', async t => {
  let failGeneration = true;
  const { request, login, db } = await fixture(t, { fetchImpl: async () => failGeneration
    ? Response.json({}, { status: 429 })
    : Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(seeds[1].content) }] }] })
  });
  await login();
  const input = { name: 'Proof', description: 'A claim' };
  for (let attempt = 0; attempt < 21; attempt++) {
    assert.equal((await request('/api/admin/generate', 'POST', input)).status, 502);
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM proofs').get().n, 2);
  failGeneration = false;
  assert.equal((await request('/api/admin/generate', 'POST', input)).status, 201);
  assert.equal(db.prepare('SELECT count(*) AS n FROM proofs').get().n, 3);
  assert.equal((await request('/api/admin/session')).data.generationEnabled, true);
});
test('generation without an API key is disabled, and oversized descriptions are rejected', async t => {
  const { request, login } = await fixture(t, { env: { OPENAI_API_KEY: '' } }); await login();
  assert.equal((await request('/api/admin/generate', 'POST', { name: 'Proof', description: 'A claim' })).status, 503);
  assert.equal((await request('/api/admin/generate', 'POST', { name: 'Proof', description: 'x'.repeat(12001) })).status, 400);
});
test('invalid proof edits and forged revisions cannot publish', async t => {
  const { request, login } = await fixture(t); await login();
  const proof = structuredClone(seeds[0].content); proof.blocks[0].depends = ['b9'];
  assert.equal((await request('/api/admin/proofs/even-implies-odd', 'PUT', { revision: 1, name: 'Broken', description: 'Broken', content: proof })).status, 400);
  assert.equal((await request('/api/admin/proofs/even-implies-odd/status', 'POST', { revision: 100, status: 'approved' })).status, 409);
});
test('SQLite preserves publication changes across restarts without reseeding', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'playprover-db-'));
  try {
    const path = join(folder, 'db.sqlite');
    const first = openDatabase(path); first.prepare("UPDATE proofs SET status='rejected' WHERE id='proof-by-cases'").run(); first.close();
    const second = openDatabase(path); assert.equal(second.prepare("SELECT status FROM proofs WHERE id='proof-by-cases'").get().status, 'rejected'); second.close();
  } finally { await rm(folder, { recursive: true, force: true }); }
});
