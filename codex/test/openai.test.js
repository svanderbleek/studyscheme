import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProof } from '../lib/openai.js';
import { seeds } from '../lib/seeds.js';

const response = proof => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(proof) }] }], usage: { input_tokens: 50, output_tokens: 100 } });
const input = { name: 'Test', description: 'Test math', apiKey: 'test-key', model: 'gpt-4.1-mini' };
test('direct OpenAI generation requests strict structured output with bounded tokens and no storage', async () => {
  let count = 0;
  const result = await generateProof({ ...input, fetchImpl: async (url, options) => {
    count++; assert.equal(url, 'https://api.openai.com/v1/responses');
    const data = JSON.parse(options.body);
    assert.equal(data.model, input.model); assert.equal(data.store, false);
    assert.equal(data.text.format.strict, true); assert.equal(data.max_output_tokens, 6000);
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    return Response.json(response(seeds[0].content));
  } });
  assert.deepEqual(result.proof, seeds[0].content); assert.equal(count, 1);
});
test('refusal, incomplete output, malformed JSON, invalid graphs, and errors never retry', async () => {
  const cyclic = structuredClone(seeds[0].content); cyclic.blocks[0].depends = ['b9'];
  const cases = [
    () => Response.json({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] }),
    () => Response.json({ status: 'incomplete', output: [] }),
    () => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: '{' }] }] }),
    () => Response.json(response(cyclic)),
    () => Response.json({}, { status: 429 }),
    () => { throw new DOMException('timeout', 'TimeoutError'); },
  ];
  for (const make of cases) {
    let count = 0;
    await assert.rejects(generateProof({ ...input, fetchImpl: async () => { count++; return make(); } }));
    assert.equal(count, 1);
  }
});
