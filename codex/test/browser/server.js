import { createApp } from '../../server.js';
import { openDatabase } from '../../lib/database.js';
import { seeds } from '../../lib/seeds.js';

// Isolated browser fixture. It never reads .env or calls a live AI service.
const { server } = createApp({
  db: openDatabase(':memory:'),
  env: { ADMIN_PASSWORD: 'browser-test-password', OPENAI_API_KEY: 'fixture-key', APP_ORIGIN: 'http://127.0.0.1:3107' },
  fetchImpl: async () => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(seeds[1].content) }] }] }),
});
server.listen(3107, '127.0.0.1');
