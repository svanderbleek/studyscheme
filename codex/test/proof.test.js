import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProof, gradeProof } from '../lib/proof.js';
import { seeds } from '../lib/seeds.js';

const copy = index => structuredClone(seeds[index].content);
function* permutations(items) {
  if (!items.length) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    for (const rest of permutations(items.filter((_, j) => j !== i))) yield [items[i], ...rest];
  }
}

test('supplied examples have valid solutions', () => {
  for (const { content } of seeds) assert.equal(gradeProof(content, validateProof(content)).correct, true);
});
test('independent number theory branches can swap and interleave', () => {
  const proof = copy(0);
  for (const order of [
    ['b1','b2','b3','b4','b5','b6','b7','b8','b9'],
    ['b1','b3','b5','b7','b2','b4','b6','b8','b9'],
    ['b1','b3','b2','b5','b4','b7','b6','b8','b9'],
  ]) assert.equal(gradeProof(proof, order).correct, true);
});
test('all 720 orderings of the cases example accept exactly the two valid case orders', () => {
  const proof = copy(1), accepted = [];
  for (const order of permutations(proof.blocks.map(b => b.id))) if (gradeProof(proof, order).correct) accepted.push(order);
  assert.deepEqual(accepted, [ ['b1','b2','b3','b4','b5','b6'], ['b1','b4','b5','b2','b3','b6'] ]);
});
test('grade identifies first wrong prerequisite and unfinished subproof', () => {
  assert.equal(gradeProof(copy(0), ['b1','b4']).index, 1);
  const result = gradeProof(copy(1), ['b1','b2','b4']);
  assert.equal(result.index, 2); assert.match(result.message, /Finish the current case/);
});
test('missing, duplicated, unknown, malformed, and excess blocks are rejected', () => {
  for (const order of [[], ['b1'], ['b1','b1'], ['unknown'], null, {}, [1], Array(45).fill('b1')]) {
    assert.equal(gradeProof(copy(0), order).correct, false);
  }
});
test('bad references, self dependencies, cycles, unknown fields, and missing groups fail validation', () => {
  const mutations = [
    p => p.blocks[0].depends.push('missing'),
    p => p.blocks[0].depends.push('b1'),
    p => p.blocks[0].depends.push('b9'),
    p => p.blocks[0].group = 'missing',
    p => p.blocks[1].id = 'b1',
    p => p.blocks[0].correct = false,
    p => delete p.blocks[0].group,
    p => p.blocks[0].text = '',
    p => p.blocks[0].depends = [null],
  ];
  for (const mutate of mutations) { const proof = copy(0); mutate(proof); assert.throws(() => validateProof(proof)); }
});
test('group cycles and internally unsatisfiable grouping are rejected', () => {
  const proof = copy(1); proof.blocks[2].depends.push('b4'); proof.blocks[4].depends.push('b2');
  // The expanded block graph is acyclic, but its only solutions interleave cases.
  assert.throws(() => validateProof(proof), /interleaving/);
  const own = copy(1); own.groups[0].depends = ['b2']; assert.throws(() => validateProof(own), /own contents/);
  const internalCycle = copy(1); internalCycle.blocks[1].depends = ['b3']; assert.throws(() => validateProof(internalCycle), /cycle/);
});
test('cross-group dependencies that have contiguous solutions are supported', () => {
  const proof = copy(1); proof.blocks[3].depends = ['b2'];
  assert.equal(gradeProof(proof, validateProof(proof)).correct, true);
});
