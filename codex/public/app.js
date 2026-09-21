const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const math = () => window.renderMathInElement?.(app, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false, trust: false, strict: 'ignore' });
let game = null, drag = null, routeVersion = 0;
async function api(path, method = 'GET', data) {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'X-PlayProver': '1' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const result = await response.json();
  if (!response.ok) { const e = new Error(result.error || 'Request failed.'); e.status = response.status; throw e; }
  return result;
}
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
function stored(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ } }
function navigate(path) { history.pushState(null, '', path); route(); window.scrollTo(0, 0); }
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (link && link.origin === location.origin && !link.target && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
    event.preventDefault(); navigate(link.pathname);
  }
});
window.addEventListener('popstate', route);
function notice(container, message, success = false) {
  container.innerHTML = `<div class="notice ${success ? 'success' : 'error'}" role="status">${escape(message)}</div>`;
}
const arrow = '<span aria-hidden="true">↗</span>';

async function home(version) {
  const proofs = await api('/api/proofs');
  if (version !== routeVersion) return;
  document.title = 'PlayProver — A little order. A lot of understanding.';
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow"><span class="tiny-square"></span> THINK IT THROUGH. PIECE IT TOGETHER.</p>
        <h1>Great proofs start<br>with <em>small steps.</em></h1>
        <p class="hero-description">Turn a handful of statements into a convincing argument. Explore the ideas behind the math, one proof block at a time.</p>
        <a class="button primary" href="#collection" id="explore">Find your first proof <span aria-hidden="true">↓</span></a>
        <p class="hero-footnote">No account. No timer. Just your curiosity.</p>
      </div>
      <div class="proof-illustration" aria-hidden="true">
        <div class="illustration-label">THE ANATOMY OF AN AHA! MOMENT</div>
        <div class="illustration-line"></div>
        <div class="sample-block sample-one"><span class="sample-number">01</span> Start with what you know <span class="grip">⠿</span></div>
        <div class="sample-block sample-two"><span class="sample-number">02</span> Follow the logic <span class="grip">⠿</span></div>
        <div class="sample-block sample-three"><span class="sample-number">03</span> Make the connection <span class="grip">⠿</span></div>
        <div class="sample-conclusion"><span>✓</span> Therefore, it follows.</div>
        <div class="illustration-note">a little order → a lot of understanding</div>
      </div>
    </section>
    <section class="how-it-works" aria-label="How to play">
      <div><span class="step">01</span><p><strong>Pick a proof</strong><span>Find an idea to explore.</span></p></div>
      <div><span class="step">02</span><p><strong>Build the argument</strong><span>Drag the blocks into place.</span></p></div>
      <div><span class="step">03</span><p><strong>Check your reasoning</strong><span>Get feedback. Try another way.</span></p></div>
    </section>
    <section class="collection" id="collection"><div class="section-heading"><div><p class="eyebrow">THE PROOF COLLECTION</p><h2>Something to think about.</h2></div><span class="count-label">${proofs.length} ${proofs.length === 1 ? 'proof' : 'proofs'} to explore</span></div>
      <div class="proof-list">${proofs.length ? proofs.map((p, i) => `
        <a class="proof-card" href="/play/${p.id}"><span class="proof-index">${String(i + 1).padStart(2, '0')}</span>
          <div class="proof-card-body"><span class="topic">${escape(p.topic)}</span><h3>${escape(p.name)}</h3><p>${escape(p.technique)} <span>·</span> ${p.blockCount} blocks${stored('completed:' + p.id) ? ' <span>·</span> <b class="completed-label">Completed ✓</b>' : ''}</p></div>
          <span class="proof-card-arrow" aria-hidden="true">↗</span></a>`).join('') : '<div class="empty">The next good idea is on its way. Check back for new proofs.</div>'}</div>
      <p class="collection-note">There can be more than one right order. It’s the reasoning that matters.</p>
    </section>`;
  document.querySelector('#explore').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); document.querySelector('#collection').scrollIntoView({ behavior: 'smooth' }); });
}

function beginGame(proof, admin = false, row = null) {
  const ids = proof.blocks.map(b => b.id);
  const saved = admin ? null : stored(`progress:${proof.id}:${proof.revision}`);
  const order = Array.isArray(saved) && new Set(saved).size === saved.length && saved.every(id => ids.includes(id)) ? saved : [];
  game = { proof, admin, row, order, bank: shuffle(ids.filter(id => !order.includes(id))), result: null, busy: false };
  renderGame();
}
function renderGame() {
  const { proof: p, admin, row } = game;
  document.title = `${p.name} — PlayProver`;
  app.innerHTML = `<section class="game-page">
    <a class="back-link" href="${admin ? '/admin' : '/'}">← ${admin ? 'Back to studio' : 'The proof collection'}</a>
    ${admin ? '<div class="preview-banner"><span class="tiny-square"></span> PRIVATE PLAYTEST <span>Complete this revision before approving it.</span></div>' : ''}
    <div class="game-heading"><div><p class="eyebrow">${escape(p.topic)} <span class="eyebrow-dot">/</span> ${escape(p.technique)}</p><h1>${escape(p.name)}</h1></div><span class="outline-badge">${p.blocks.length} blocks · Your pace</span></div>
    <div class="theorem"><span class="theorem-label">YOUR CHALLENGE</span><div>${escape(p.statement)}</div></div>
    <div class="game-directions"><p>Drag every block into a complete proof.${p.hasGroups ? ' Keep the steps of each case together.' : ' Some steps may fit in more than one order.'}</p><button class="text-button" id="reset">Start over ↺</button></div>
    <div class="board"><section class="board-panel bank-panel"><div class="panel-heading"><h2>The building blocks</h2><span id="bank-count"></span></div><p class="panel-description">A few ideas, waiting to connect.</p><div class="dropzone" data-zone="bank" id="bank"></div></section>
    <section class="board-panel solution-panel"><div class="panel-heading"><h2>Your argument</h2><span id="order-count"></span></div><p class="panel-description">Each step should follow from what comes before.</p><div class="dropzone" data-zone="order" id="order"></div><div class="check-area"><div id="feedback" aria-live="polite"></div><button class="button primary" id="check">Check my proof <span aria-hidden="true">→</span></button></div></section></div>
    ${admin ? `<section class="review-panel"><div><p class="eyebrow">PUBLISHING REVIEW</p><h2>Ready for the collection?</h2><p>Check the mathematics and dependencies, then approve this exact revision.</p></div><div class="review-actions"><label class="checkbox"><input type="checkbox" id="reviewed"> I have reviewed the mathematical correctness.</label><div class="button-row"><button class="button primary" id="approve" ${row.tested_revision === row.revision ? '' : 'disabled'}>Approve & publish</button><button class="button" id="reject">Reject</button><button class="text-button" id="edit-proof">Edit proof</button></div><div id="review-notice"></div></div></section>` : ''}
    <p class="game-bottom-note">Every block has a part to play. The right order makes the reasoning clear.</p>
  </section>`;
  renderBlocks(); math();
  document.querySelector('#reset').onclick = () => {
    if (game.busy) return;
    game.order = []; game.bank = shuffle(p.blocks.map(b => b.id)); game.result = null; saveProgress(); renderBlocks();
  };
  document.querySelector('#check').onclick = checkProof;
  if (admin) {
    document.querySelector('#edit-proof').onclick = () => showEditor(row);
    document.querySelector('#approve').onclick = async () => {
      if (!document.querySelector('#reviewed').checked) return notice(document.querySelector('#review-notice'), 'Confirm your mathematical review before publishing.');
      await changeStatus(row, 'approved', document.querySelector('#review-notice'));
    };
    document.querySelector('#reject').onclick = () => changeStatus(row, 'rejected', document.querySelector('#review-notice'));
  }
}
function saveProgress() { if (!game.admin) persist(`progress:${game.proof.id}:${game.proof.revision}`, game.order); }
function renderBlocks() {
  const { proof, result, bank, order } = game;
  for (const zone of ['bank', 'order']) {
    const ids = game[zone];
    document.querySelector('#' + zone).innerHTML = ids.length ? ids.map((id, i) => {
      const block = proof.blocks.find(b => b.id === id);
      return `<div class="proof-block ${zone === 'order' && result?.index === i ? 'incorrect' : ''} ${zone === 'order' && result?.correct ? 'correct' : ''}" data-id="${id}"><span class="block-handle" aria-hidden="true">⠿</span>${zone === 'order' ? `<span class="line-number">${i + 1}</span>` : ''}<div class="block-text">${escape(block.text)}</div></div>`;
    }).join('') : `<div class="drop-empty"><span aria-hidden="true">${zone === 'order' ? '+' : '✓'}</span><strong>${zone === 'order' ? 'An argument starts here.' : 'All blocks are in your proof.'}</strong><p>${zone === 'order' ? 'Drag your first block into this space.' : 'You can drag a block back here to rethink it.'}</p></div>`;
  }
  document.querySelector('#bank-count').textContent = bank.length + ' left';
  document.querySelector('#order-count').textContent = `${order.length} / ${proof.blocks.length}`;
  const feedback = document.querySelector('#feedback');
  feedback.innerHTML = result ? `<div class="notice ${result.correct ? 'success' : 'error'}">${result.index !== null ? `<strong>Take another look at line ${result.index + 1}.</strong> ` : ''}${escape(result.message)}${result.correct && !game.admin ? '<a href="/">Try another proof ↗</a>' : ''}</div>` : '';
  math();
}
async function checkProof() {
  if (game.busy) return;
  const current = game;
  current.busy = true;
  const button = document.querySelector('#check'); button.disabled = true; button.textContent = 'Checking…';
  document.querySelector('#reset').disabled = true;
  try {
    const result = await api(`/api/${current.admin ? 'admin/' : ''}proofs/${current.proof.id}/grade`, 'POST', { order: current.order, revision: current.proof.revision });
    if (game !== current) return;
    current.result = result;
    if (result.correct) {
      if (current.admin) { current.row.tested_revision = current.row.revision; document.querySelector('#approve').disabled = false; }
      else persist('completed:' + current.proof.id, true);
    }
    renderBlocks();
  } catch (e) { if (game === current) notice(document.querySelector('#feedback'), e.message); }
  finally {
    current.busy = false;
    if (game === current) { button.disabled = false; button.innerHTML = 'Check my proof <span aria-hidden="true">→</span>'; document.querySelector('#reset').disabled = false; }
  }
}

// Pointer dragging supports mouse, pen, and touch. There are deliberately no
// keyboard or button-based ways to move blocks.
app.addEventListener('pointerdown', e => {
  const block = e.target.closest('.proof-block');
  if (!block || !game || game.busy || e.button !== 0 || drag) return;
  drag = { id: block.dataset.id, element: block, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false, zone: null };
  block.setPointerCapture(e.pointerId);
});
function placeMarker() {
  if (!drag?.active) return;
  const target = document.elementFromPoint(drag.x, drag.y);
  const zone = target?.closest('[data-zone]');
  document.querySelectorAll('.dropzone').forEach(el => el.classList.toggle('drag-over', el === zone));
  drag.zone = zone?.dataset.zone || null;
  if (!zone) { drag.marker.remove(); return; }
  const candidates = [...zone.querySelectorAll('.proof-block')].filter(el => el.dataset.id !== drag.id);
  const before = candidates.find(el => drag.y < el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2);
  drag.before = before?.dataset.id || null;
  zone.insertBefore(drag.marker, before || null);
}
window.addEventListener('pointermove', e => {
  if (!drag || drag.pointerId !== e.pointerId) return;
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.active && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5) {
    drag.active = true;
    drag.ghost = drag.element.cloneNode(true); drag.ghost.classList.add('drag-ghost');
    drag.ghost.style.width = `${drag.element.getBoundingClientRect().width}px`; document.body.append(drag.ghost);
    drag.element.classList.add('drag-source');
    drag.marker = document.createElement('div'); drag.marker.className = 'drop-marker';
    document.body.classList.add('dragging');
    const scroll = () => {
      if (!drag?.active) return;
      if (drag.y < 85) window.scrollBy(0, -12);
      else if (drag.y > innerHeight - 85) window.scrollBy(0, 12);
      placeMarker(); drag.frame = requestAnimationFrame(scroll);
    };
    drag.frame = requestAnimationFrame(scroll);
  }
  if (drag.active) {
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX - Math.min(100, drag.ghost.offsetWidth / 2)}px`;
    drag.ghost.style.top = `${e.clientY - 24}px`; placeMarker();
  }
}, { passive: false });
function endDrag(commit = false) {
  if (!drag) return;
  if (commit && drag.active && drag.zone && game) {
    game.bank = game.bank.filter(id => id !== drag.id); game.order = game.order.filter(id => id !== drag.id);
    const list = game[drag.zone], index = drag.before ? list.indexOf(drag.before) : list.length;
    list.splice(index < 0 ? list.length : index, 0, drag.id); game.result = null; saveProgress();
  }
  cancelAnimationFrame(drag.frame); drag.ghost?.remove(); drag.marker?.remove(); drag.element.classList.remove('drag-source');
  if (drag.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
  document.body.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  drag = null;
  if (commit && game) renderBlocks();
}
window.addEventListener('pointerup', e => { if (drag?.pointerId === e.pointerId) endDrag(true); });
window.addEventListener('pointercancel', () => endDrag());
window.addEventListener('blur', () => endDrag());

async function adminHome(version) {
  let session;
  try { session = await api('/api/admin/session'); }
  catch (e) { if (version === routeVersion && [401, 503].includes(e.status)) return login(e.status === 503 ? e.message : ''); throw e; }
  const rows = await api('/api/admin/proofs');
  if (version !== routeVersion) return;
  document.title = 'Proof studio — PlayProver';
  app.innerHTML = `<section class="admin-page"><div class="section-heading"><div><p class="eyebrow">PRIVATE WORKSPACE</p><h1>Proof studio.</h1><p class="muted">Turn a mathematical idea into a proof worth playing.</p></div><button class="button" id="logout">Sign out</button></div>
    <div class="admin-layout"><section class="admin-create"><p class="eyebrow">START WITH AN IDEA</p><h2>Create a proof</h2><form id="generate-form"><label for="proof-name">Proof name</label><input id="proof-name" name="name" required maxlength="120" placeholder="e.g. The sum of two odd integers">
    <label for="description">The mathematics</label><textarea id="description" name="description" required maxlength="12000" rows="9" placeholder="Describe the claim, assumptions, and any proof technique you want to teach."></textarea><p class="field-note">Be explicit about domains and assumptions. You’ll review and playtest the generated draft before publishing.</p>
    <button class="button primary" ${!session.generationEnabled ? 'disabled' : ''}>Generate draft ${arrow}</button><div id="generate-notice" aria-live="polite"></div></form>
    <p class="generation-note">${session.generationEnabled ? escape(session.model) : 'Generation is unavailable until OPENAI_API_KEY is configured on the server.'}</p></section>
    <section class="admin-library"><div class="panel-heading"><h2>Your proofs</h2><span>${rows.length} total</span></div><div class="admin-proof-list">${rows.map(row => `<a class="admin-proof-row" href="/admin/proofs/${row.id}"><div><span class="status ${row.status}">${row.status === 'approved' ? 'Published' : row.status}</span><h3>${escape(row.name)}</h3><p>${row.content.blocks.length} blocks · Revision ${row.revision}</p></div>${arrow}</a>`).join('')}</div></section></div></section>`;
  document.querySelector('#logout').onclick = async () => { try { await api('/api/admin/logout', 'POST', {}); navigate('/admin'); } catch (e) { notice(document.querySelector('#generate-notice'), e.message); } };
  document.querySelector('#generate-form').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('button'), feedback = document.querySelector('#generate-notice');
    button.disabled = true; button.textContent = 'Building your draft…';
    notice(feedback, 'Generation can take up to 90 seconds. You can review the draft when it is ready.', true);
    try { const row = await api('/api/admin/generate', 'POST', Object.fromEntries(new FormData(form))); navigate(`/admin/proofs/${row.id}`); }
    catch (error) { notice(feedback, error.message); button.disabled = false; button.innerHTML = 'Generate draft ↗'; }
  };
}
function login(message = '') {
  document.title = 'Studio sign in — PlayProver';
  app.innerHTML = `<section class="login-card"><p class="eyebrow">FOR PROOF MAKERS</p><h1>Welcome to the studio.</h1><p class="muted">Sign in to create, review, and publish proofs.</p><form id="login-form"><label for="password">Admin password</label><input id="password" name="password" type="password" required autocomplete="current-password"><button class="button primary">Enter the studio →</button><div id="login-notice" aria-live="polite"></div></form><a class="back-link" href="/">← Back to the collection</a></section>`;
  if (message) notice(document.querySelector('#login-notice'), message);
  document.querySelector('#login-form').onsubmit = async e => {
    e.preventDefault(); const button = e.currentTarget.querySelector('button'); button.disabled = true;
    try { await api('/api/admin/login', 'POST', Object.fromEntries(new FormData(e.currentTarget))); route(); }
    catch (error) { notice(document.querySelector('#login-notice'), error.message); button.disabled = false; }
  };
}
function showEditor(row) {
  game = null;
  document.title = `${row.name} — Proof studio`;
  app.innerHTML = `<section class="editor-page"><a class="back-link" href="/admin">← Back to studio</a><div class="section-heading"><div><p class="eyebrow">PROOF EDITOR · REVISION ${row.revision}</p><h1>${escape(row.name)}</h1></div><span class="status ${row.status}">${row.status === 'approved' ? 'Published' : row.status}</span></div>
    <div class="editor-layout"><form id="edit-form" class="editor-form"><label for="edit-name">Proof name</label><input id="edit-name" name="name" required maxlength="120" value="${escape(row.name)}"><label for="edit-description">Source description</label><textarea id="edit-description" name="description" required maxlength="12000" rows="4">${escape(row.description)}</textarea>
    <label for="content">Proof data</label><p class="field-note">Edit the statement, blocks, and dependencies. Every block is required. Use $…$ for math. Saving returns the proof to draft and clears its playtest.</p><textarea id="content" class="code-editor" name="content" rows="22" spellcheck="false">${escape(JSON.stringify(row.content, null, 2))}</textarea>
    <div class="button-row"><button class="button primary" type="submit">Save revision</button><button class="button" type="button" id="playtest">Playtest saved proof →</button></div><div id="editor-notice" aria-live="polite"></div></form>
    <aside class="editor-aside"><p class="eyebrow">REVIEW THE REASONING</p><h2>Dependencies, not just order.</h2><p>A block’s <code>depends</code> lists the blocks or groups that must be complete before it. Independent steps should be free to swap.</p><p>Groups represent cases or subproofs that must stay together. Groups cannot be nested.</p><h3>Current dependency map</h3><div class="dependency-list">${row.content.blocks.map(b => `<div><strong>${escape(b.id)}</strong><span>${b.depends.length ? 'after ' + escape(b.depends.join(', ')) : 'no block prerequisites'}${b.group ? `<small>inside ${escape(b.group)}</small>` : ''}</span></div>`).join('')}${row.content.groups.map(g => `<div><strong>${escape(g.id)}</strong><span>${escape(g.label)}<small>${g.depends.length ? 'after ' + escape(g.depends.join(', ')) : 'no prerequisites'}</small></span></div>`).join('')}</div>
    <p class="field-note">A valid dependency graph does not establish mathematical correctness. Review each statement and try alternate valid orderings.</p><div class="button-row">${row.status === 'approved' ? '<button class="button" id="unpublish">Unpublish</button>' : '<button class="button" id="editor-reject">Reject draft</button>'}</div><div id="status-notice"></div></aside></div></section>`;
  let dirty = false;
  document.querySelector('#edit-form').oninput = () => { dirty = true; document.querySelector('#playtest').disabled = true; document.querySelector('#playtest').textContent = 'Save before playtesting'; };
  document.querySelector('#edit-form').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      try { data.content = JSON.parse(data.content); } catch { throw new Error('Proof data must be valid JSON. Check commas and quotation marks.'); }
      const updated = await api(`/api/admin/proofs/${row.id}`, 'PUT', { ...data, revision: row.revision });
      showEditor(updated); notice(document.querySelector('#editor-notice'), 'Saved as a draft. Playtest this revision before publishing.', true);
    } catch (error) { notice(document.querySelector('#editor-notice'), error.message); button.disabled = false; }
  };
  document.querySelector('#playtest').onclick = () => {
    if (dirty) return;
    beginGame({ id: row.id, name: row.name, revision: row.revision, ...row.content, hasGroups: row.content.groups.length > 0 }, true, row); window.scrollTo(0, 0);
  };
  document.querySelector('#unpublish')?.addEventListener('click', () => changeStatus(row, 'draft', document.querySelector('#status-notice')));
  document.querySelector('#editor-reject')?.addEventListener('click', () => changeStatus(row, 'rejected', document.querySelector('#status-notice')));
}
async function changeStatus(row, status, container) {
  try { await api(`/api/admin/proofs/${row.id}/status`, 'POST', { status, revision: row.revision }); navigate('/admin'); }
  catch (e) { notice(container, e.message); }
}
async function route() {
  const version = ++routeVersion;
  endDrag(); game = null;
  app.innerHTML = '<div class="loading">Putting the pieces together…</div>';
  try {
    const path = location.pathname;
    if (path === '/') return await home(version);
    if (path === '/admin') return await adminHome(version);
    let match = /^\/play\/([a-zA-Z0-9_-]+)$/.exec(path);
    if (match) { const proof = await api('/api/proofs/' + match[1]); if (version === routeVersion) beginGame(proof); return; }
    match = /^\/admin\/proofs\/([a-zA-Z0-9_-]+)$/.exec(path);
    if (match) {
      try { const row = await api('/api/admin/proofs/' + match[1]); if (version === routeVersion) showEditor(row); }
      catch (e) { if (version === routeVersion && [401, 503].includes(e.status)) login(e.status === 503 ? e.message : ''); else throw e; }
      return;
    }
    throw new Error('That page could not be found.');
  } catch (e) {
    if (version === routeVersion) app.innerHTML = `<section class="error-page"><p class="eyebrow">A SMALL INTERRUPTION</p><h1>Let’s take a step back.</h1><p>${escape(e.message)}</p><a class="button primary" href="/">Back to the collection →</a></section>`;
  }
}
route();
