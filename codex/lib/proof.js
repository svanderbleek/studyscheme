const fail = message => { throw new Error(message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const idPattern = /^[a-zA-Z0-9_-]{1,40}$/;
const keys = (value, allowed) => { if (Object.keys(value).some(key => !allowed.includes(key))) fail('Unexpected field in proof data.'); };

export const proofSchema = {
  type: 'object', additionalProperties: false,
  required: ['statement', 'topic', 'technique', 'blocks', 'groups'],
  properties: {
    statement: { type: 'string' }, topic: { type: 'string' }, technique: { type: 'string' },
    blocks: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['id', 'text', 'depends', 'group'],
      properties: {
        id: { type: 'string' }, text: { type: 'string' },
        depends: { type: 'array', items: { type: 'string' } },
        group: { type: ['string', 'null'] },
      },
    } },
    groups: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['id', 'label', 'depends'],
      properties: { id: { type: 'string' }, label: { type: 'string' }, depends: { type: 'array', items: { type: 'string' } } },
    } },
  },
};

function topo(ids, edges) {
  const remaining = new Set(ids), result = [];
  while (remaining.size) {
    const next = [...remaining].find(id => [...(edges.get(id) || [])].every(dep => !remaining.has(dep)));
    if (!next) fail('Dependencies contain a cycle or require interleaving subproofs.');
    result.push(next); remaining.delete(next);
  }
  return result;
}

// Collapse each subproof into one unit, then sort its internal block graph.
// A cycle in the collapsed graph means no contiguous solution exists.
export function validateProof(proof) {
  if (!object(proof)) fail('Proof must be an object.');
  keys(proof, ['statement', 'topic', 'technique', 'blocks', 'groups']);
  for (const [key, max] of [['statement', 6000], ['topic', 100], ['technique', 100]]) {
    if (typeof proof[key] !== 'string' || !proof[key].trim() || proof[key].length > max) fail(`Invalid ${key}.`);
  }
  if (!Array.isArray(proof.blocks) || proof.blocks.length < 2 || proof.blocks.length > 40) fail('Use between 2 and 40 blocks.');
  if (!Array.isArray(proof.groups) || proof.groups.length > 12) fail('Invalid subproof groups.');
  const nodes = new Map();
  for (const node of [...proof.blocks, ...proof.groups]) {
    if (!object(node) || typeof node.id !== 'string' || !idPattern.test(node.id) || nodes.has(node.id)) fail('Block and group IDs must be unique letters, numbers, underscores, or hyphens.');
    if (!Array.isArray(node.depends) || node.depends.length > 52 || new Set(node.depends).size !== node.depends.length) fail(`Invalid dependencies on ${node.id}.`);
    nodes.set(node.id, node);
  }
  const groups = new Map(proof.groups.map(g => [g.id, g]));
  const blocks = new Map(proof.blocks.map(b => [b.id, b]));
  for (const b of proof.blocks) {
    keys(b, ['id', 'text', 'depends', 'group']);
    if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > 2000) fail(`Invalid text on ${b.id}.`);
    if (b.group !== null && !groups.has(b.group)) fail(`Unknown group on ${b.id}.`);
  }
  for (const g of proof.groups) {
    keys(g, ['id', 'label', 'depends']);
    if (typeof g.label !== 'string' || !g.label.trim() || g.label.length > 100) fail(`Invalid label on ${g.id}.`);
    if (!proof.blocks.some(b => b.group === g.id)) fail(`Group ${g.id} is empty.`);
  }
  for (const node of nodes.values()) {
    for (const dep of node.depends) {
      if (typeof dep !== 'string' || !nodes.has(dep) || dep === node.id) fail(`Unknown or self dependency on ${node.id}.`);
    }
  }
  const unitOf = id => blocks.get(id)?.group || id;
  const units = [...proof.groups.map(g => g.id), ...proof.blocks.filter(b => !b.group).map(b => b.id)];
  const outer = new Map(units.map(id => [id, new Set()]));
  const inner = new Map(proof.blocks.map(b => [b.id, new Set()]));
  for (const node of nodes.values()) {
    for (const dep of node.depends) {
      const targetUnit = unitOf(node.id), sourceUnit = unitOf(dep);
      if (targetUnit !== sourceUnit) outer.get(targetUnit).add(sourceUnit);
      else if (blocks.has(node.id) && blocks.has(dep)) inner.get(node.id).add(dep);
      else fail(`Group ${targetUnit} cannot depend on its own contents, or vice versa.`);
    }
  }
  const solution = topo(units, outer).flatMap(id => groups.has(id)
    ? topo(proof.blocks.filter(b => b.group === id).map(b => b.id), inner) : [id]);
  return solution;
}

export function gradeProof(proof, order) {
  if (!Array.isArray(order) || order.length > proof.blocks.length || order.some(id => typeof id !== 'string')) {
    return { correct: false, index: null, message: 'Submit a list of proof blocks.' };
  }
  const blocks = new Map(proof.blocks.map(b => [b.id, b]));
  const groups = new Map(proof.groups.map(g => [g.id, g]));
  const seen = new Set();
  const complete = id => groups.has(id)
    ? proof.blocks.filter(b => b.group === id).every(b => seen.has(b.id)) : seen.has(id);
  let activeGroup = null;
  for (let index = 0; index < order.length; index++) {
    const b = blocks.get(order[index]);
    if (!b || seen.has(b.id)) return { correct: false, index, message: 'Each block must appear exactly once.' };
    if (activeGroup && b.group !== activeGroup && !complete(activeGroup)) {
      return { correct: false, index, message: 'Finish the current case before moving to another part of the proof.' };
    }
    const deps = [...b.depends, ...(b.group ? groups.get(b.group).depends : [])];
    if (!deps.every(complete)) return { correct: false, index, message: 'This step needs something established earlier. Reconsider the order up to this line.' };
    seen.add(b.id); activeGroup = b.group;
  }
  if (seen.size !== blocks.size) return { correct: false, index: null, message: 'Your proof is unfinished. Use every block, then check again.' };
  return { correct: true, index: null, message: 'Proof complete. Every step follows, and your argument holds together.' };
}

export function publicProof(row) {
  const p = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
  return { id: row.id, name: row.name, revision: row.revision, statement: p.statement, topic: p.topic,
    technique: p.technique, hasGroups: p.groups.length > 0,
    blocks: p.blocks.map(b => ({ id: b.id, text: b.text })) };
}
