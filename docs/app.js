// ai-readable-gazette-kr — static reader
//
// Data model:
//   data/meta.json              — totals, dates list, institutions list,
//                                 institution_tree, heatmap (year-month),
//                                 raw_base / blob_base
//   data/dates/YYYY-MM-DD.json  — { date, docs: [{n, inst, title, file, raw}] }
//   data/titles.json            — compact title search index (lazy loaded)
//
// Views: home / browse / about
// Routing: location.hash
//   #home
//   #browse
//   #browse/date/2026-04-07
//   #browse/inst/국토교통부
//   #doc=2026-04-07/001_xxx.md    (opens reader inside browse view)

const DATA_BASE = 'data';

let META = null;
let TITLES = null;            // lazy loaded
let currentView = 'home';
let currentTab = 'dates';
let currentDate = null;
let currentInst = null;

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

// ====================================================================
// init
// ====================================================================
async function init() {
  try {
    const resp = await fetch(`${DATA_BASE}/meta.json`);
    if (!resp.ok) throw new Error('meta.json fetch failed');
    META = await resp.json();
  } catch (e) {
    $('#stats').textContent = `meta load failed: ${e.message}`;
    return;
  }
  renderStats();
  renderHome();
  renderDatesSidebar();
  renderInstSidebar();
  wireUI();
  routeFromHash();
}

function renderStats() {
  const m = META;
  $('#stats').textContent =
    `${m.total_docs.toLocaleString()} documents · ${m.date_count.toLocaleString()} date groups · ` +
    `${m.institution_count.toLocaleString()} institutions · ` +
    `${m.date_range[0]} → ${m.date_range[1]}`;
  $('#cov-range').textContent = `${m.date_range[0]} → ${m.date_range[1]}`;
  $('#cov-docs').textContent  = m.total_docs.toLocaleString();
  $('#cov-dates').textContent = m.date_count.toLocaleString();
  $('#cov-inst').textContent  = m.institution_count.toLocaleString();
}

// ====================================================================
// Home view
// ====================================================================
function renderHome() {
  renderHeatmap();
  renderRecent();
  renderInstTree();
}

function renderHeatmap() {
  const container = $('#heatmap');
  const data = META.heatmap;
  if (!data || !data.length) return;

  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  const row = document.createElement('div');
  row.className = 'hm-row';
  data.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'hm-bar';
    const h = Math.max(2, (d.count / max) * 100);
    bar.style.height = `${h}%`;
    bar.dataset.ym = d.ym;
    bar.dataset.count = d.count;
    bar.title = `${d.ym} · ${d.count} documents`;
    bar.addEventListener('mouseenter', () => {
      $('#heatmap .hm-caption').textContent =
        `${d.ym} · ${d.count.toLocaleString()} documents`;
    });
    bar.addEventListener('click', () => {
      switchView('browse');
      // find first date of that month in dates list
      const matching = META.dates.find(x => x.date.startsWith(d.ym));
      if (matching) selectDate(matching.date);
    });
    row.appendChild(bar);
  });

  const scale = document.createElement('div');
  scale.className = 'hm-scale';
  // show year markers
  const years = [...new Set(data.map(d => d.ym.slice(0, 4)))];
  years.forEach(y => {
    const span = document.createElement('span');
    span.textContent = y;
    scale.appendChild(span);
  });

  const caption = document.createElement('div');
  caption.className = 'hm-caption';
  caption.textContent = `${data[0].ym} → ${data[data.length - 1].ym}`;

  container.innerHTML = '';
  container.appendChild(row);
  container.appendChild(scale);
  container.appendChild(caption);
}

function renderRecent() {
  const container = $('#recent-list');
  const recent = META.dates.slice().reverse().slice(0, 10);
  container.innerHTML = recent.map(d =>
    `<a class="row" href="#browse/date/${d.date}">
      <span class="date">${d.date}</span>
      <span class="label">${d.count} documents</span>
    </a>`
  ).join('');
  container.querySelectorAll('.row').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      switchView('browse');
      selectDate(el.querySelector('.date').textContent);
    });
  });
}

function renderInstTree() {
  const container = $('#inst-tree');
  const tree = META.institution_tree || [];
  container.innerHTML = tree.map(cat => {
    // show top 30 institutions per category
    const items = cat.items.slice(0, 30).map(i =>
      `<div class="inst-row" data-inst="${escapeAttr(i.name)}">
        <span>${escapeHtml(i.name)}</span>
        <span class="cnt">${i.count.toLocaleString()}</span>
      </div>`).join('');
    const rest = cat.items.length > 30
      ? `<div class="inst-row" style="color:var(--hush);cursor:default">
          <span>… +${cat.items.length - 30} more</span><span></span>
         </div>`
      : '';
    return `<div class="cat" data-cat="${escapeAttr(cat.cat)}">
      <button class="cat-head">
        <span><span class="disclose">▸</span><span class="name">${escapeHtml(cat.cat)}</span></span>
        <span class="count">${cat.n_inst} 기관 · ${cat.count.toLocaleString()} 문서</span>
      </button>
      <div class="cat-items">${items}${rest}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.cat-head').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.classList.toggle('open');
    });
  });
  container.querySelectorAll('.inst-row[data-inst]').forEach(el => {
    el.addEventListener('click', () => {
      const inst = el.dataset.inst;
      switchView('browse');
      // switch to inst tab, select
      selectInstTab();
      selectInst(inst);
    });
  });
  // open the first (largest) category by default
  const first = container.querySelector('.cat');
  if (first) first.classList.add('open');
}

// ====================================================================
// Browse view — sidebar
// ====================================================================
function renderDatesSidebar() {
  const list = $('#list-dates');
  const html = META.dates.slice().reverse()
    .map(d => `<div class="item" data-date="${d.date}">
      <span>${d.date}</span><span class="count">${d.count}</span>
    </div>`).join('');
  list.innerHTML = html;
}

function renderInstSidebar() {
  const list = $('#list-inst');
  const html = META.institutions
    .map(i => `<div class="item" data-inst="${escapeAttr(i.name)}" data-cat="${escapeAttr(i.cat || '')}">
      <span>${escapeHtml(i.name)}</span><span class="count">${i.count}</span>
    </div>`).join('');
  list.innerHTML = html;
}

// ====================================================================
// Sidebar tabs
// ====================================================================
function selectDateTab() {
  currentTab = 'dates';
  $$('.sidebar .tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'dates'));
  $$('.sidebar .list').forEach(el =>
    el.classList.toggle('active', el.id === 'list-dates'));
  $('#filter').placeholder = 'filter dates…';
  applyFilter('');
}
function selectInstTab() {
  currentTab = 'inst';
  $$('.sidebar .tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'inst'));
  $$('.sidebar .list').forEach(el =>
    el.classList.toggle('active', el.id === 'list-inst'));
  $('#filter').placeholder = 'filter institutions…';
  applyFilter('');
}
function selectSearchTab() {
  currentTab = 'search';
  $$('.sidebar .tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'search'));
  $$('.sidebar .list').forEach(el =>
    el.classList.toggle('active', el.id === 'list-search'));
  $('#filter').placeholder = 'search titles…';
  $('#filter').value = '';
  $('#list-search').innerHTML =
    `<p class="search-hint">
      제목 검색.<br>2글자 이상 입력.<br>상위 50건까지 표시.
    </p>`;
}

function applyFilter(q) {
  if (currentTab === 'search') {
    handleSearch(q);
    return;
  }
  const list = $(`#list-${currentTab}`);
  if (!list) return;
  const needle = q.trim().toLowerCase();
  list.querySelectorAll('.item').forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = needle && !text.includes(needle) ? 'none' : '';
  });
}

// ====================================================================
// Search (lazy load titles.json)
// ====================================================================
async function ensureTitles() {
  if (TITLES) return TITLES;
  $('#list-search').innerHTML = `<p class="search-hint">loading title index…</p>`;
  try {
    const resp = await fetch(`${DATA_BASE}/titles.json`);
    if (!resp.ok) throw new Error('titles fetch failed');
    TITLES = await resp.json();
  } catch (e) {
    $('#list-search').innerHTML = `<p class="search-hint">load failed: ${escapeHtml(e.message)}</p>`;
    return null;
  }
  return TITLES;
}

let searchTimer = null;
function handleSearch(q) {
  clearTimeout(searchTimer);
  const list = $('#list-search');
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) {
    list.innerHTML =
      `<p class="search-hint">
        제목 검색.<br>2글자 이상 입력.<br>상위 50건까지 표시.
      </p>`;
    return;
  }
  searchTimer = setTimeout(async () => {
    const data = await ensureTitles();
    if (!data) return;
    const hits = [];
    const { dates, insts, docs } = data;
    for (let i = 0; i < docs.length && hits.length < 50; i++) {
      const d = docs[i];       // [dateIdx, n, instIdx, title, file]
      if (d[3].toLowerCase().includes(needle)) {
        hits.push({
          date: dates[d[0]],
          n: d[1],
          inst: insts[d[2]],
          title: d[3],
          file: d[4],
        });
      }
    }
    if (!hits.length) {
      list.innerHTML = `<p class="search-hint">no matches</p>`;
      return;
    }
    list.innerHTML = hits.map(h =>
      `<div class="item" data-date="${h.date}" data-file="${escapeAttr(h.file)}">
        <div class="hit-title">${escapeHtml(h.title)}</div>
        <div class="hit-meta">${h.date} · ${escapeHtml(h.inst)} · #${h.n}</div>
      </div>`
    ).join('');
    list.querySelectorAll('.item').forEach(el => {
      el.addEventListener('click', () => {
        openDoc(el.dataset.date, el.dataset.file);
      });
    });
  }, 160);
}

// ====================================================================
// Date / Institution selection
// ====================================================================
async function selectDate(date) {
  switchView('browse');
  selectDateTab();
  currentDate = date;
  currentInst = null;
  markSelected('#list-dates', `[data-date="${date}"]`);
  markSelected('#list-inst', null);
  $('#reader').hidden = true;
  $('#docs-list').style.display = '';
  $('#main-head').style.display = '';
  await loadDateDocs(date);
  location.hash = `browse/date/${date}`;
}

async function loadDateDocs(date) {
  const head = $('#main-head');
  const list = $('#docs-list');
  head.innerHTML = `<h2>${date}</h2><p class="sub">loading…</p>`;
  list.innerHTML = '';
  try {
    const resp = await fetch(`${DATA_BASE}/dates/${date}.json`);
    if (!resp.ok) throw new Error('date fetch failed');
    const data = await resp.json();
    renderDocsList(data.docs, {
      title: date,
      sub: `${data.docs.length} documents · ${date}`,
    });
  } catch (e) {
    head.innerHTML = `<h2>${date}</h2><p class="sub">load failed: ${escapeHtml(e.message)}</p>`;
    list.innerHTML = '';
  }
}

async function selectInst(inst) {
  switchView('browse');
  selectInstTab();
  currentInst = inst;
  currentDate = null;
  markSelected('#list-inst', `[data-inst="${CSS.escape(inst)}"]`);
  markSelected('#list-dates', null);
  $('#reader').hidden = true;
  $('#docs-list').style.display = '';
  $('#main-head').style.display = '';
  await loadInstDocs(inst);
  location.hash = `browse/inst/${encodeURIComponent(inst)}`;
}

async function loadInstDocs(inst) {
  const head = $('#main-head');
  const list = $('#docs-list');
  head.innerHTML = `<h2>${escapeHtml(inst)}</h2><p class="sub">collecting…</p>`;
  list.innerHTML = '';

  // Use titles.json which is faster than scanning all date files.
  const data = await ensureTitles();
  if (!data) {
    head.innerHTML = `<h2>${escapeHtml(inst)}</h2><p class="sub">index load failed</p>`;
    return;
  }
  const { dates, insts, docs } = data;
  const targetIdx = insts.indexOf(inst);
  if (targetIdx < 0) {
    head.innerHTML = `<h2>${escapeHtml(inst)}</h2><p class="sub">not found</p>`;
    return;
  }
  const collected = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (d[2] === targetIdx) {
      collected.push({
        date: dates[d[0]],
        n: d[1],
        inst,
        title: d[3],
        file: d[4],
      });
    }
  }
  collected.sort((a, b) => (b.date + b.n).localeCompare(a.date + a.n));
  renderDocsList(collected, {
    title: inst,
    sub: `${collected.length} documents · across ${META.date_count} date groups`,
    showDate: true,
  });
}

// ====================================================================
// Docs list rendering
// ====================================================================
function renderDocsList(docs, opts) {
  const head = $('#main-head');
  const list = $('#docs-list');
  head.innerHTML =
    `<h2>${escapeHtml(opts.title)}</h2>
     <p class="sub">${escapeHtml(opts.sub || '')}</p>`;
  if (!docs.length) {
    list.innerHTML = `<p class="hint">no documents</p>`;
    return;
  }
  const showDate = !!opts.showDate;
  list.innerHTML = docs.map(d => {
    const date = d.date || currentDate;
    const metaLeft = showDate
      ? `<span>${date}</span><span class="inst">${escapeHtml(d.inst)}</span><span class="n">#${d.n}</span>`
      : `<span class="inst">${escapeHtml(d.inst)}</span><span class="n">#${d.n}</span>`;
    return `<a class="doc-row" href="#doc=${encodeURIComponent(date)}/${encodeURIComponent(d.file)}" data-date="${date}" data-file="${escapeAttr(d.file)}">
      <div class="meta">${metaLeft}</div>
      <div class="title">${escapeHtml(d.title)}</div>
    </a>`;
  }).join('');
  list.querySelectorAll('.doc-row').forEach(row => {
    row.addEventListener('click', e => {
      e.preventDefault();
      openDoc(row.dataset.date, row.dataset.file);
    });
  });
}

// ====================================================================
// Reader
// ====================================================================
async function openDoc(date, file) {
  switchView('browse');
  const url = `${META.raw_base}/${date}/${encodeURIComponent(file)}`;
  $('#reader').hidden = false;
  $('#docs-list').style.display = 'none';
  $('#main-head').style.display = 'none';
  $('#reader-date').textContent = date;
  $('#reader-raw').href = url;
  $('#reader-title').textContent = 'loading…';
  $('#reader-n').textContent = '';
  $('#reader-body').innerHTML = '';
  const parsed = parseFilename(file);
  $('#reader-inst').textContent = parsed ? parsed.inst : '';
  $('#reader-n').textContent = parsed ? `#${parsed.n}` : '';
  if (parsed) $('#reader-title').textContent = parsed.title;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const md = await resp.text();
    $('#reader-body').innerHTML = marked.parse(md, { breaks: false });
    location.hash = `doc=${encodeURIComponent(date)}/${encodeURIComponent(file)}`;
  } catch (e) {
    $('#reader-body').innerHTML = `<p class="hint">load failed: ${escapeHtml(e.message)}</p>`;
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ====================================================================
// View switching
// ====================================================================
function switchView(view) {
  currentView = view;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  $$('header.site nav.top a[data-view]').forEach(a =>
    a.classList.toggle('active', a.dataset.view === view));
}

// ====================================================================
// Event wiring
// ====================================================================
function wireUI() {
  // top nav
  $$('header.site nav.top a[data-view]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      switchView(a.dataset.view);
      location.hash = a.dataset.view;
      if (a.dataset.view === 'home') window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });

  // sidebar tabs
  $$('.sidebar .tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'dates') selectDateTab();
      if (tab === 'inst') selectInstTab();
      if (tab === 'search') selectSearchTab();
    });
  });

  // filter
  $('#filter').addEventListener('input', e => applyFilter(e.target.value));

  // date/inst clicks
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

  // back button
  $('#back-btn').addEventListener('click', () => {
    $('#reader').hidden = true;
    $('#docs-list').style.display = '';
    $('#main-head').style.display = '';
    // remove doc= from hash but keep context
    if (location.hash.startsWith('#doc=')) {
      if (currentDate) location.hash = `browse/date/${currentDate}`;
      else if (currentInst) location.hash = `browse/inst/${encodeURIComponent(currentInst)}`;
      else location.hash = 'browse';
    }
  });

  window.addEventListener('hashchange', routeFromHash);
}

// ====================================================================
// Helpers
// ====================================================================
function markSelected(listSel, itemSel) {
  const list = $(listSel);
  if (!list) return;
  list.querySelectorAll('.item.selected').forEach(el => el.classList.remove('selected'));
  if (itemSel) {
    const el = list.querySelector(itemSel);
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
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function escapeAttr(s) { return escapeHtml(s); }

function routeFromHash() {
  const h = location.hash.replace(/^#/, '');
  if (!h) {
    switchView('home');
    return;
  }
  if (h === 'home' || h === 'browse' || h === 'about') {
    switchView(h);
    return;
  }
  if (h.startsWith('browse/date/')) {
    const date = decodeURIComponent(h.slice('browse/date/'.length));
    selectDate(date);
    return;
  }
  if (h.startsWith('browse/inst/')) {
    const inst = decodeURIComponent(h.slice('browse/inst/'.length));
    selectInst(inst);
    return;
  }
  if (h.startsWith('doc=')) {
    const rest = decodeURIComponent(h.slice(4));
    const idx = rest.indexOf('/');
    if (idx > 0) {
      const date = rest.slice(0, idx);
      const file = rest.slice(idx + 1);
      selectDate(date).then(() => openDoc(date, file));
    }
    return;
  }
}

init();
