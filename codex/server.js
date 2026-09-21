import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash, scryptSync, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { openDatabase } from './lib/database.js';
import { validateProof, gradeProof, publicProof } from './lib/proof.js';
import { generateProof } from './lib/openai.js';

const root = dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const asyncScrypt = promisify(scrypt);
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const error = (status, message) => { throw new HttpError(status, message); };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 128000) error(413, 'Request is too large.');
  }
  try { const value = JSON.parse(raw); if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0; return value; }
  catch { error(400, 'Expected a JSON object.'); }
}
function nameAndDescription(data) {
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120) error(400, 'Enter a proof name of 1–120 characters.');
  if (typeof data.description !== 'string' || !data.description.trim() || data.description.length > 12000) error(400, 'Enter a math description of 1–12,000 characters.');
  return { name: data.name.trim(), description: data.description.trim() };
}
function checkedProof(value) { try { validateProof(value); return value; } catch (e) { error(400, e.message); } }
const adminRow = row => ({ ...row, content: JSON.parse(row.content) });

export function createApp(options = {}) {
  const env = options.env || process.env;
  const db = options.db || openDatabase(resolve(root, env.DATABASE_PATH || 'data/playprover.sqlite'));
  const configured = typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 12;
  const salt = randomBytes(16);
  const expected = configured ? scryptSync(env.ADMIN_PASSWORD, salt, 64) : null;
  const secure = env.COOKIE_SECURE === 'true';
  const loginAttempts = new Map();
  let loginWindow = Date.now(), totalLogins = 0, generating = false;
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const cookie = (token, age) => `playprover_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  function tokenFor(req) {
    const token = /(?:^|;\s*)playprover_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return token ? hash(token) : '';
  }
  function authenticate(req) {
    if (!configured) error(503, 'Admin is disabled. Configure ADMIN_PASSWORD with at least 12 characters.');
    const session = db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(tokenFor(req), Date.now());
    if (!session) error(401, 'Sign in to continue.');
  }
  function getRow(id, admin) {
    const row = db.prepare('SELECT * FROM proofs WHERE id=?').get(id);
    if (!row || (!admin && row.status !== 'approved')) error(404, 'Proof not found.');
    return row;
  }
  function revisionCheck(row, data) {
    if (data.revision !== row.revision) error(409, 'This proof changed. Reload it before continuing.');
  }
  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const method = req.method;
    if (path.startsWith('/api/') && !['GET', 'HEAD'].includes(method)) {
      const origin = env.APP_ORIGIN || `${secure ? 'https' : 'http'}://${req.headers.host}`;
      if (req.headers['x-playprover'] !== '1' || (req.headers.origin && req.headers.origin !== origin)) error(403, 'Request origin is not allowed.');
      if (!req.headers['content-type']?.startsWith('application/json')) error(415, 'Use application/json.');
    }
    if (path === '/api/admin/login' && method === 'POST') {
      if (!configured) error(503, 'Admin is disabled. Configure ADMIN_PASSWORD with at least 12 characters.');
      if (Date.now() - loginWindow > 900000) { loginWindow = Date.now(); totalLogins = 0; loginAttempts.clear(); }
      const ip = req.socket.remoteAddress || 'unknown';
      const attempts = (loginAttempts.get(ip) || 0) + 1;
      if (++totalLogins > 100 || attempts > 10) error(429, 'Too many sign-in attempts. Try again in 15 minutes.');
      loginAttempts.set(ip, attempts);
      const data = await body(req);
      if (typeof data.password !== 'string' || data.password.length > 1024) error(400, 'Enter your admin password.');
      const candidate = await asyncScrypt(data.password, salt, 64);
      if (!timingSafeEqual(candidate, expected)) error(401, 'Incorrect password.');
      loginAttempts.delete(ip);
      db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
      const token = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash(token), Date.now() + 43200000);
      res.setHeader('Set-Cookie', cookie(token, 43200));
      return json(res, 200, { ok: true });
    }
    const admin = path.startsWith('/api/admin/');
    if (admin) authenticate(req);
    if (path === '/api/admin/logout' && method === 'POST') {
      db.prepare('DELETE FROM sessions WHERE token=?').run(tokenFor(req));
      res.setHeader('Set-Cookie', cookie('', 0)); return json(res, 200, { ok: true });
    }
    if (path === '/api/admin/session' && method === 'GET') {
      return json(res, 200, { generationEnabled: Boolean(env.OPENAI_API_KEY), model });
    }
    if (path === '/api/proofs' && method === 'GET') {
      return json(res, 200, db.prepare("SELECT * FROM proofs WHERE status='approved' ORDER BY created_at,id").all().map(row => {
        const p = publicProof(row); return { id: p.id, name: p.name, topic: p.topic, technique: p.technique, blockCount: p.blocks.length };
      }));
    }
    if (path === '/api/admin/proofs' && method === 'GET') {
      return json(res, 200, db.prepare('SELECT * FROM proofs ORDER BY created_at DESC,id').all().map(adminRow));
    }
    if (path === '/api/admin/generate' && method === 'POST') {
      const input = nameAndDescription(await body(req));
      if (!env.OPENAI_API_KEY) error(503, 'Set OPENAI_API_KEY on the server to generate a proof.');
      if (generating) error(429, 'A proof is already being generated. Please wait.');
      const day = new Date().toISOString().slice(0, 10);
      const generationId = randomUUID();
      db.prepare('INSERT INTO generations (id,day,model,status) VALUES (?,?,?,?)').run(generationId, day, model, 'started');
      generating = true;
      try {
        const { proof, usage } = await generateProof({ ...input, apiKey: env.OPENAI_API_KEY, model, fetchImpl: options.fetchImpl });
        const id = randomUUID();
        db.prepare("INSERT INTO proofs (id,name,description,content,status) VALUES (?,?,?,?,'draft')").run(id, input.name, input.description, JSON.stringify(proof));
        db.prepare("UPDATE generations SET status='completed',usage=? WHERE id=?").run(JSON.stringify(usage), generationId);
        return json(res, 201, adminRow(getRow(id, true)));
      } catch (e) {
        db.prepare("UPDATE generations SET status='failed' WHERE id=?").run(generationId);
        error(502, e.message);
      } finally { generating = false; }
    }
    const match = /^\/api\/(admin\/)?proofs\/([a-zA-Z0-9_-]+)(?:\/(grade|status))?$/.exec(path);
    if (match) {
      let row = getRow(match[2], Boolean(match[1]));
      const action = match[3];
      if (method === 'GET' && !action) return json(res, 200, admin ? adminRow(row) : publicProof(row));
      if (method === 'POST' && action === 'grade') {
        const data = await body(req); row = getRow(match[2], Boolean(match[1])); revisionCheck(row, data);
        const result = gradeProof(JSON.parse(row.content), data.order);
        if (admin && result.correct) db.prepare('UPDATE proofs SET tested_revision=? WHERE id=? AND revision=?').run(row.revision, row.id, row.revision);
        return json(res, 200, result);
      }
      if (admin && method === 'PUT' && !action) {
        const data = await body(req); row = getRow(match[2], true); revisionCheck(row, data);
        const input = nameAndDescription(data), proof = checkedProof(data.content);
        db.prepare("UPDATE proofs SET name=?,description=?,content=?,status='draft',revision=revision+1,tested_revision=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?")
          .run(input.name, input.description, JSON.stringify(proof), row.id);
        return json(res, 200, adminRow(getRow(row.id, true)));
      }
      if (admin && method === 'POST' && action === 'status') {
        const data = await body(req); row = getRow(match[2], true); revisionCheck(row, data);
        if (!['draft', 'approved', 'rejected'].includes(data.status)) error(400, 'Unknown proof status.');
        if (data.status === 'approved') {
          checkedProof(JSON.parse(row.content));
          if (row.tested_revision !== row.revision) error(409, 'Complete a successful playtest of this revision before approval.');
        }
        db.prepare('UPDATE proofs SET status=?,tested_revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .run(data.status, data.status === 'approved' ? row.tested_revision : null, row.id);
        return json(res, 200, adminRow(getRow(row.id, true)));
      }
    }
    if (path.startsWith('/api/')) error(404, 'Endpoint not found.');
    if (method !== 'GET' && method !== 'HEAD') error(405, 'Method not allowed.');
    let file;
    if (['/', '/admin'].includes(path) || /^\/(?:play|admin\/proofs)\/[a-zA-Z0-9_-]+$/.test(path)) file = resolve(root, 'public/index.html');
    else if (['/app.js', '/styles.css', '/favicon.svg'].includes(path)) file = resolve(root, `public${path}`);
    else if (/^\/vendor\/katex\/(katex\.min\.(js|css)|contrib\/auto-render\.min\.js|fonts\/[a-zA-Z0-9_-]+\.(woff2?|ttf))$/.test(path)) {
      file = resolve(root, 'node_modules/katex/dist', path.slice('/vendor/katex/'.length));
    } else error(404, 'Page not found.');
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
    let content;
    try { content = await readFile(file); } catch { error(404, 'File not found. Run npm install before starting the app.'); }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] }); res.end(method === 'HEAD' ? undefined : content);
  }
  const server = http.createServer((req, res) => handle(req, res).catch(e => {
    if (!e.status) console.error('Request failed:', e.message);
    if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong. Please try again.' });
    else res.end();
  }));
  return { server, db };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, db } = createApp();
  const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
  server.listen(port, host, () => console.log(`PlayProver is running at http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
