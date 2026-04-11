// ai-readable-gazette-kr — static reader
// Loads docs/data/meta.json then lazy-fetches per-date json on demand.

const DATA_BASE = 'data';
let META = null;
let currentTab = 'dates';
let currentDate = null;
let currentInst = null;
let instDocsCache = null; // built lazily when user picks an institution

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

// ---------- init ----------
async function init() {
  try {
    const resp = await fetch(`${DATA_BASE}/meta.json`);
    if (!resp.ok) throw new Error('meta fetch failed');
    META = await resp.json();
  } catch (e) {
    $('#stats').textContent = '메타 로드 실패: ' + e.message;
    return;
  }
  renderStats();
  renderDates();
  renderInstitutions();
  wireUI();
  routeFromHash();
}

function renderStats() {
  const m = META;
  $('#stats').textContent =
    `${m.total_docs.toLocaleString()} documents · ${m.date_count.toLocaleString()} dates · ` +
    `${m.institution_count.toLocaleString()} institutions · ${m.date_range[0]}–${m.date_range[1]}`;
}

function renderDates() {
  const list = $('#list-dates');
  const html = META.dates
    .slice()
    .reverse() // newest first
    .map(d => `<div class="item" data-date="${d.date}">
      <span>${d.date}</span><span class="count">${d.count}</span>
    </div>`).join('');
  list.innerHTML = html;
}

function renderInstitutions() {
  const list = $('#list-inst');
  const html = META.institutions
    .map(i => `<div class="item" data-inst="${escapeAttr(i.name)}">
      <span>${escapeHtml(i.name)}</span><span class="count">${i.count}</span>
    </div>`).join('');
  list.innerHTML = html;
}

// ---------- ui wiring ----------
function wireUI() {
  // tabs
  $$('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      $$('.tabs button').forEach(b => b.classList.toggle('active', b === btn));
      $$('.list').forEach(el =>
        el.classList.toggle('active', el.id === `list-${currentTab}`));
      $('#filter').value = '';
      applyFilter('');
    });
  });

  // filter
  $('#filter').addEventListener('input', e => applyFilter(e.target.value));

  // date/inst clicks (event delegation)
  $('#list-dates').addEventListener('click', e => {
    const item = e.target.closest('.item');
    if (!item) return;
    selectDate(item.dataset.date);
  });
  $('#list-inst').addEventListener('click', e => {
    const item = e.target.closest('.item');
    if (!item) return;
    selectInst(item.dataset.inst);
  });

  // doc row clicks
  $('#docs-list').addEventListener('click', e => {
    const row = e.target.closest('.doc-row');
    if (!row) return;
    e.preventDefault();
    openDoc(row.dataset.date, row.dataset.file);
  });

  // back button
  $('#back-btn').addEventListener('click', () => {
    $('#reader').hidden = true;
    $('#docs-list').style.display = '';
    $('#docs-header').style.display = '';
  });

  // top nav
  $$('.headnav a[data-view]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      switchView(a.dataset.view);
    });
  });

  window.addEventListener('hashchange', routeFromHash);
}

function switchView(view) {
  $$('.headnav a[data-view]').forEach(a =>
    a.classList.toggle('active', a.dataset.view === view));
  $$('.view').forEach(el =>
    el.classList.toggle('active', el.id === `view-${view}`));
}

function applyFilter(q) {
  const activeList = $(`#list-${currentTab}`);
  const needle = q.trim().toLowerCase();
  activeList.querySelectorAll('.item').forEach(el => {
    const txt = el.textContent.toLowerCase();
    el.style.display = needle && !txt.includes(needle) ? 'none' : '';
  });
}

// ---------- selection ----------
async function selectDate(date) {
  currentDate = date;
  currentInst = null;
  markSelected('#list-dates', `[data-date="${date}"]`);
  markSelected('#list-inst', null);
  $('#reader').hidden = true;
  $('#docs-list').style.display = '';
  $('#docs-header').style.display = '';
  await loadDateDocs(date);
}

async function loadDateDocs(date) {
  const header = $('#docs-header');
  const list = $('#docs-list');
  header.innerHTML = `<h2>${date}</h2><p class="sub">loading…</p>`;
  list.innerHTML = '';
  try {
    const resp = await fetch(`${DATA_BASE}/dates/${date}.json`);
    if (!resp.ok) throw new Error('date fetch failed');
    const data = await resp.json();
    renderDocs(data.docs, { title: date, sub: `${data.docs.length} documents` });
  } catch (e) {
    header.innerHTML = `<h2>${date}</h2>`;
    list.innerHTML = `<p class="hint">로드 실패: ${e.message}</p>`;
  }
}

async function selectInst(inst) {
  currentInst = inst;
  currentDate = null;
  markSelected('#list-inst', `[data-inst="${CSS.escape(inst)}"]`);
  markSelected('#list-dates', null);
  $('#reader').hidden = true;
  $('#docs-list').style.display = '';
  $('#docs-header').style.display = '';
  await loadInstDocs(inst);
}

async function loadInstDocs(inst) {
  const header = $('#docs-header');
  const list = $('#docs-list');
  header.innerHTML = `<h2>${escapeHtml(inst)}</h2><p class="sub">collecting…</p>`;
  list.innerHTML = '';
  try {
    // Cross-date aggregation: fetch dates lazily in parallel.
    // Limit fetching to reasonable scope (max 50 most recent dates first for speed)
    const dates = META.dates.slice().reverse();
    const collected = [];
    const batchSize = 40;
    let stop = false;
    for (let i = 0; i < dates.length && !stop; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(d => fetch(`${DATA_BASE}/dates/${d.date}.json`).then(r => r.json()).catch(() => null))
      );
      for (const r of results) {
        if (!r) continue;
        for (const doc of r.docs) {
          if (doc.inst === inst) {
            collected.push({...doc, date: r.date});
          }
        }
      }
      header.innerHTML =
        `<h2>${escapeHtml(inst)}</h2>` +
        `<p class="sub">scanning… ${Math.min(i+batchSize, dates.length)}/${dates.length} dates · found ${collected.length}</p>`;
    }
    collected.sort((a, b) => (b.date + b.n).localeCompare(a.date + a.n));
    renderDocs(collected, {
      title: inst,
      sub: `${collected.length} documents across ${META.date_count} dates`,
      showDate: true,
    });
  } catch (e) {
    header.innerHTML = `<h2>${escapeHtml(inst)}</h2>`;
    list.innerHTML = `<p class="hint">로드 실패: ${e.message}</p>`;
  }
}

function renderDocs(docs, opts) {
  const header = $('#docs-header');
  const list = $('#docs-list');
  header.innerHTML = `<h2>${escapeHtml(opts.title)}</h2><p class="sub">${escapeHtml(opts.sub || '')}</p>`;
  if (!docs.length) {
    list.innerHTML = `<p class="hint">문서 없음</p>`;
    return;
  }
  const html = docs.map(d => {
    const date = opts.showDate ? (d.date || currentDate) : currentDate;
    const meta = opts.showDate
      ? `<span class="date">${date}</span><span class="inst">${escapeHtml(d.inst)}</span><span>#${d.n}</span>`
      : `<span class="inst">${escapeHtml(d.inst)}</span><span>#${d.n}</span>`;
    return `<a class="doc-row" href="#doc=${encodeURIComponent(date)}/${encodeURIComponent(d.file)}" data-date="${date}" data-file="${escapeAttr(d.file)}">
      <div class="meta">${meta}</div>
      <div class="title">${escapeHtml(d.title)}</div>
    </a>`;
  }).join('');
  list.innerHTML = html;
}

// ---------- doc reader ----------
async function openDoc(date, file) {
  const url = `${META.raw_base}/${date}/${encodeURIComponent(file)}`;
  $('#reader').hidden = false;
  $('#docs-list').style.display = 'none';
  $('#docs-header').style.display = 'none';
  $('#reader-date').textContent = date;
  $('#reader-raw').href = url;
  $('#reader-title').textContent = 'loading…';
  $('#reader-body').innerHTML = '';
  const parsed = parseFilename(file);
  $('#reader-inst').textContent = parsed ? parsed.inst : '';
  if (parsed) $('#reader-title').textContent = parsed.title;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const md = await resp.text();
    $('#reader-body').innerHTML = marked.parse(md, { breaks: false });
    location.hash = `doc=${encodeURIComponent(date)}/${encodeURIComponent(file)}`;
  } catch (e) {
    $('#reader-body').innerHTML = `<p class="hint">로드 실패: ${escapeHtml(e.message)}</p>`;
  }
}

// ---------- helpers ----------
function markSelected(listSel, itemSel) {
  $$(`${listSel} .item.selected`).forEach(el => el.classList.remove('selected'));
  if (itemSel) {
    const el = $(listSel).querySelector(itemSel);
    if (el) {
      el.classList.add('selected');
      el.scrollIntoView({ block: 'nearest' });
    }
  }
}

function parseFilename(name) {
  const m = name.match(/^(\d{3})_([^_]+)_(.+)\.md$/);
  if (!m) return null;
  return { n: m[1], inst: m[2], title: m[3].replace(/_/g, ' ') };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}
function escapeAttr(s) { return escapeHtml(s); }

function routeFromHash() {
  const h = location.hash.slice(1);
  if (h.startsWith('doc=')) {
    const rest = decodeURIComponent(h.slice(4));
    const idx = rest.indexOf('/');
    if (idx > 0) {
      const date = rest.slice(0, idx);
      const file = rest.slice(idx + 1);
      selectDate(date).then(() => openDoc(date, file));
    }
  }
}

init();
