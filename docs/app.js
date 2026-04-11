// ai-readable-gazette-kr — static reader
//
// Data model:
//   data/meta.json              — totals, dates list, institutions list,
//                                 institution_tree, heatmap (year-month),
//                                 recent_samples (top 3 docs per recent date),
//                                 raw_base / blob_base
//   data/dates/YYYY-MM-DD.json  — { date, docs: [{n, inst, title, file, raw}] }
//   data/titles.json            — compact title search index (lazy loaded)
//
// Views: home / browse / about
// Routing via location.hash:
//   #home
//   #browse
//   #browse/date/YYYY-MM-DD
//   #browse/inst/<name>
//   #browse/search/<query>
//   #doc=YYYY-MM-DD/<file>

const DATA_BASE = 'data';
const LARGE_FILE_BYTES = 1_500_000;   // 1.5MB threshold for size warning
const RECENT_TITLES_PER_DATE = 3;

// --- globals / state ---
let META = null;
let TITLES = null;                    // lazy loaded search index
let currentView = 'home';
let currentTab = 'dates';
let currentDate = null;
let currentInst = null;
let currentCategory = null;

// Reader navigation context — list of docs + index of currently open doc
let currentDocs = [];                 // [{date, n, inst, title, file}]
let currentDocIdx = -1;

// Spotlight: curated editorial entry points
const SPOTLIGHT = [
  { num: '01', label: 'Latest gazette',
    hint: 'most recent date group',
    kind: 'latest-date' },
  { num: '02', label: '국토교통부',
    hint: '가장 많은 문서를 발간한 기관 · 15K+',
    kind: 'inst', value: '국토교통부' },
  { num: '03', label: '대법원 판례',
    hint: '사법부 고시 및 판결 정리',
    kind: 'inst', value: '대법원' },
  { num: '04', label: '재산공개',
    hint: '공직자 재산 등록 공고 검색',
    kind: 'search', value: '재산' },
  { num: '05', label: '시행령 개정',
    hint: '법령 제·개정 공포문',
    kind: 'search', value: '시행령' },
];

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
  renderYearJumper();
  renderCategoryPills();
  wireUI();
  setupKeyboardShortcuts();
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
  renderSpotlight();
  renderHeatmap();
  renderRecent();
  renderInstTree();
}

function renderSpotlight() {
  const container = $('#spotlight');
  if (!container) return;
  const latestDate = META.dates[META.dates.length - 1]?.date;
  container.innerHTML = SPOTLIGHT.map((s, i) => {
    let href = '#browse';
    if (s.kind === 'latest-date' && latestDate) {
      href = `#browse/date/${latestDate}`;
    } else if (s.kind === 'inst') {
      href = `#browse/inst/${encodeURIComponent(s.value)}`;
    } else if (s.kind === 'search') {
      href = `#browse/search/${encodeURIComponent(s.value)}`;
    }
    return `<a class="card" href="${href}" tabindex="0">
      <span class="num">${s.num}</span>
      <span class="label">${escapeHtml(s.label)}</span>
      <span class="hint">${escapeHtml(s.hint)}</span>
    </a>`;
  }).join('');
}

function renderHeatmap() {
  const container = $('#heatmap');
  const data = META.heatmap;
  if (!container || !data || !data.length) return;

  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  container.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'hm-row';
  data.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'hm-bar';
    // Sqrt scaling gives low months visibility while keeping high months prominent.
    const norm = Math.sqrt(d.count / max);
    const density = 0.12 + norm * 0.78;
    bar.style.setProperty('--density', density.toFixed(2));
    bar.style.height = `${Math.max(4, norm * 100)}%`;
    bar.dataset.ym = d.ym;
    bar.dataset.count = d.count;
    bar.title = `${d.ym} · ${d.count.toLocaleString()} documents`;
    bar.tabIndex = 0;
    bar.addEventListener('mouseenter', () => {
      $('#heatmap .hm-caption').textContent =
        `${d.ym} · ${d.count.toLocaleString()} documents`;
    });
    bar.addEventListener('click', () => jumpToMonth(d.ym));
    bar.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        jumpToMonth(d.ym);
      }
    });
    row.appendChild(bar);
  });
  container.appendChild(row);

  // Year scale strip
  const scale = document.createElement('div');
  scale.className = 'hm-scale';
  const years = [...new Set(data.map(d => d.ym.slice(0, 4)))];
  years.forEach(y => {
    const span = document.createElement('span');
    span.textContent = y;
    scale.appendChild(span);
  });
  container.appendChild(scale);

  const caption = document.createElement('div');
  caption.className = 'hm-caption';
  caption.textContent = `${data[0].ym} → ${data[data.length - 1].ym}`;
  container.appendChild(caption);
}

function jumpToMonth(ym) {
  const match = META.dates.find(d => d.date.startsWith(ym));
  if (match) {
    selectDate(match.date);
  } else {
    switchView('browse');
  }
}

function renderRecent() {
  const container = $('#recent-list');
  if (!container) return;
  const recent = META.recent_samples || [];
  if (!recent.length) {
    // fallback to simple list if build script is older
    container.innerHTML = META.dates.slice().reverse().slice(0, 10).map(d =>
      `<a class="row-rich" href="#browse/date/${d.date}">
        <div class="head">
          <span class="date">${d.date}</span>
          <span class="count">${d.count} docs</span>
        </div>
      </a>`
    ).join('');
  } else {
    container.innerHTML = recent.map(r => {
      const samples = r.samples.map(s => {
        const title = cleanTitle(s.title);
        return `<li><span class="inst">${escapeHtml(s.inst)}</span>${escapeHtml(title)}</li>`;
      }).join('');
      return `<a class="row-rich" href="#browse/date/${r.date}">
        <div class="head">
          <span class="date">${r.date}</span>
          <span class="count">${r.count} docs</span>
        </div>
        <ul class="samples">${samples}</ul>
      </a>`;
    }).join('');
  }
  container.querySelectorAll('.row-rich').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const m = el.getAttribute('href').match(/browse\/date\/(.+)/);
      if (m) selectDate(m[1]);
    });
  });
}

function renderInstTree() {
  const container = $('#inst-tree');
  const tree = META.institution_tree || [];
  if (!container) return;
  container.innerHTML = tree.map(cat => {
    const items = cat.items.slice(0, 30).map(i =>
      `<div class="inst-row" data-inst="${escapeAttr(i.name)}" tabindex="0">
        <span>${escapeHtml(i.name)}</span>
        <span class="cnt">${i.count.toLocaleString()}</span>
      </div>`).join('');
    const rest = cat.items.length > 30
      ? `<div class="inst-row" data-cat-rest="${escapeAttr(cat.cat)}" tabindex="0" style="color:var(--hush)">
          <span>… +${cat.items.length - 30} more (view all)</span>
          <span class="cnt">→</span>
         </div>`
      : '';
    return `<div class="cat" data-cat="${escapeAttr(cat.cat)}">
      <button class="cat-head" aria-expanded="false">
        <span><span class="disclose">▸</span><span class="name">${escapeHtml(cat.cat)}</span></span>
        <span class="count">${cat.n_inst} 기관 · ${cat.count.toLocaleString()} 문서</span>
      </button>
      <div class="cat-items">${items}${rest}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.cat-head').forEach(btn => {
    btn.addEventListener('click', () => {
      const open = btn.parentElement.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  container.querySelectorAll('.inst-row[data-inst]').forEach(el => {
    el.addEventListener('click', () => selectInst(el.dataset.inst));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') selectInst(el.dataset.inst);
    });
  });
  container.querySelectorAll('.inst-row[data-cat-rest]').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.catRest;
      switchView('browse');
      selectInstTab();
      setCategoryFilter(cat);
    });
  });
  const first = container.querySelector('.cat');
  if (first) {
    first.classList.add('open');
    first.querySelector('.cat-head').setAttribute('aria-expanded', 'true');
  }
}

// ====================================================================
// Browse view — sidebar lists
// ====================================================================
function renderDatesSidebar() {
  const list = $('#list-dates');
  const html = META.dates.slice().reverse()
    .map(d => `<div class="item" data-date="${d.date}" tabindex="0" role="button">
      <span>${d.date}</span><span class="count">${d.count}</span>
    </div>`).join('');
  list.innerHTML = html;
}

function renderInstSidebar() {
  const list = $('#list-inst');
  const html = META.institutions
    .map(i => `<div class="item" data-inst="${escapeAttr(i.name)}" data-cat="${escapeAttr(i.cat || '')}" tabindex="0" role="button">
      <span>${escapeHtml(i.name)}</span><span class="count">${i.count}</span>
    </div>`).join('');
  list.innerHTML = html;
}

function renderYearJumper() {
  const jumper = $('#year-jumper');
  if (!jumper) return;
  const years = [...new Set(META.dates.map(d => d.date.slice(0, 4)))];
  jumper.innerHTML = years.map(y =>
    `<button data-year="${y}">${y}</button>`
  ).join('');
  jumper.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const y = btn.dataset.year;
      const list = $('#list-dates');
      const target = list.querySelector(`.item[data-date^="${y}"]`);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        target.classList.add('pulse');
        setTimeout(() => target.classList.remove('pulse'), 700);
      }
    });
  });
}

function renderCategoryPills() {
  const pills = $('#cat-pills');
  if (!pills) return;
  const order = META.category_order || [];
  const html = [`<button data-cat="" class="active">ALL</button>`]
    .concat(order.map(c => `<button data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`))
    .join('');
  pills.innerHTML = html;
  pills.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => setCategoryFilter(btn.dataset.cat));
  });
}

function setCategoryFilter(cat) {
  currentCategory = cat || null;
  $$('#cat-pills button').forEach(b =>
    b.classList.toggle('active', (b.dataset.cat || '') === (cat || '')));
  // reapply current filter string with new category constraint
  applyFilter($('#filter').value);
}

// ====================================================================
// Sidebar tab switching
// ====================================================================
function selectDateTab() {
  currentTab = 'dates';
  $$('.sidebar .tabs button').forEach(b => {
    const active = b.dataset.tab === 'dates';
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $$('.sidebar .list').forEach(el =>
    el.classList.toggle('active', el.id === 'list-dates'));
  $('#year-jumper').hidden = false;
  $('#cat-pills').hidden = true;
  $('#filter').placeholder = 'filter dates…';
  applyFilter($('#filter').value);
}
function selectInstTab() {
  currentTab = 'inst';
  $$('.sidebar .tabs button').forEach(b => {
    const active = b.dataset.tab === 'inst';
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $$('.sidebar .list').forEach(el =>
    el.classList.toggle('active', el.id === 'list-inst'));
  $('#year-jumper').hidden = true;
  $('#cat-pills').hidden = false;
  $('#filter').placeholder = 'filter institutions…';
  applyFilter($('#filter').value);
}
function selectSearchTab() {
  currentTab = 'search';
  $$('.sidebar .tabs button').forEach(b => {
    const active = b.dataset.tab === 'search';
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $$('.sidebar .list').forEach(el =>
    el.classList.toggle('active', el.id === 'list-search'));
  $('#year-jumper').hidden = true;
  $('#cat-pills').hidden = true;
  $('#filter').placeholder = 'search titles (2+ chars)…';
  if (!$('#filter').value) {
    $('#list-search').innerHTML =
      `<p class="search-hint">
        제목 검색.<br>2글자 이상 입력.<br>상위 50건까지 표시.
      </p>`;
  }
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
    let show = !needle || text.includes(needle);
    if (show && currentTab === 'inst' && currentCategory) {
      show = (el.dataset.cat || '') === currentCategory;
    }
    el.style.display = show ? '' : 'none';
  });
}

// ====================================================================
// Search (lazy loads titles.json)
// ====================================================================
async function ensureTitles() {
  if (TITLES) return TITLES;
  const target = $('#list-search');
  if (target) target.innerHTML = `<p class="search-hint"><span class="spinner"></span>loading title index…</p>`;
  try {
    const resp = await fetch(`${DATA_BASE}/titles.json`);
    if (!resp.ok) throw new Error('titles fetch failed');
    TITLES = await resp.json();
  } catch (e) {
    if (target) target.innerHTML = `<p class="search-hint">load failed: ${escapeHtml(e.message)}</p>`;
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
      `<div class="item" data-date="${h.date}" data-file="${escapeAttr(h.file)}" tabindex="0" role="button">
        <div class="hit-title">${highlightNeedle(cleanTitle(h.title), needle)}</div>
        <div class="hit-meta">${h.date} · ${escapeHtml(h.inst)} · #${h.n}</div>
      </div>`
    ).join('');
    // cache hits as current docs list (for prev/next navigation)
    list.querySelectorAll('.item').forEach((el, idx) => {
      el.addEventListener('click', () => {
        currentDocs = hits.map(h => ({
          date: h.date, n: h.n, inst: h.inst, title: h.title, file: h.file,
        }));
        currentDocIdx = idx;
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
  head.innerHTML = `<h2>${date}</h2><p class="sub"><span class="spinner"></span>loading…</p>`;
  list.innerHTML = '';
  try {
    const resp = await fetch(`${DATA_BASE}/dates/${date}.json`);
    if (!resp.ok) throw new Error('date fetch failed');
    const data = await resp.json();
    // store as current docs for prev/next
    currentDocs = data.docs.map(d => ({
      date, n: d.n, inst: d.inst, title: d.title, file: d.file,
    }));
    currentDocIdx = -1;
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
  head.innerHTML = `<h2>${escapeHtml(inst)}</h2><p class="sub"><span class="spinner"></span>collecting…</p>`;
  list.innerHTML = '';

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
  currentDocs = collected.slice();
  currentDocIdx = -1;
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
  list.innerHTML = docs.map((d, i) => {
    const date = d.date || currentDate;
    const title = cleanTitle(d.title);
    const badge = inferType(title);
    const badgeHtml = badge
      ? `<span class="badge ${badge.cls}">${badge.label}</span>`
      : '';
    const metaLeft = showDate
      ? `<span>${date}</span><span class="inst">${escapeHtml(d.inst)}</span><span class="n">#${d.n}</span>${badgeHtml}`
      : `<span class="inst">${escapeHtml(d.inst)}</span><span class="n">#${d.n}</span>${badgeHtml}`;
    return `<a class="doc-row" href="#doc=${encodeURIComponent(date)}/${encodeURIComponent(d.file)}" data-date="${date}" data-file="${escapeAttr(d.file)}" data-idx="${i}" tabindex="0">
      <div class="meta">${metaLeft}</div>
      <div class="title">${escapeHtml(title)}</div>
    </a>`;
  }).join('');
  list.querySelectorAll('.doc-row').forEach(row => {
    row.addEventListener('click', e => {
      e.preventDefault();
      const idx = parseInt(row.dataset.idx, 10);
      if (!isNaN(idx)) currentDocIdx = idx;
      openDoc(row.dataset.date, row.dataset.file);
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = parseInt(row.dataset.idx, 10);
        if (!isNaN(idx)) currentDocIdx = idx;
        openDoc(row.dataset.date, row.dataset.file);
      }
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

  const parsed = parseFilename(file);
  const title = parsed ? cleanTitle(parsed.title) : file;

  $('#reader-date').textContent = date;
  $('#reader-raw').href = url;
  $('#reader-inst').textContent = parsed ? parsed.inst : '';
  $('#reader-n').textContent = parsed ? `#${parsed.n}` : '';
  $('#reader-title').textContent = title;
  $('#reader-body').innerHTML = '<p class="hint"><span class="spinner"></span>loading document…</p>';
  $('#reader-warning').innerHTML = '';
  $('#reader-toc').innerHTML = '';

  // badge in reader meta
  const badge = inferType(title);
  $('#reader-badge-slot').innerHTML = badge
    ? ` &nbsp;·&nbsp; <span class="badge ${badge.cls}">${badge.label}</span>`
    : '';

  // sync currentDocIdx from currentDocs if possible
  if (currentDocs.length && currentDocIdx < 0) {
    const foundIdx = currentDocs.findIndex(d => d.date === date && d.file === file);
    if (foundIdx >= 0) currentDocIdx = foundIdx;
  }
  updateReaderNav();

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const md = await resp.text();
    const size = new Blob([md]).size;

    if (size > LARGE_FILE_BYTES) {
      showLargeFileWarning(md, size, url);
    } else {
      renderMarkdown(md);
    }
    location.hash = `doc=${encodeURIComponent(date)}/${encodeURIComponent(file)}`;
  } catch (e) {
    $('#reader-body').innerHTML = `<p class="hint">load failed: ${escapeHtml(e.message)}</p>`;
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderMarkdown(md) {
  let html = '';
  try {
    html = marked.parse(md, { breaks: false });
  } catch (e) {
    $('#reader-body').innerHTML = `<p class="hint">render failed: ${escapeHtml(e.message)}</p>`;
    return;
  }
  $('#reader-body').innerHTML = html;
  buildTOC();
}

function showLargeFileWarning(md, size, url) {
  const kb = Math.round(size / 1024);
  const mb = (size / (1024 * 1024)).toFixed(1);
  const displaySize = size > 1024 * 1024 ? `${mb} MB` : `${kb.toLocaleString()} KB`;
  $('#reader-warning').innerHTML = `
    <div class="size-warning">
      <strong>대용량 문서 (${displaySize})</strong> — 브라우저에서 렌더하면 멈추거나 느려질 수 있습니다.
      원본은 표와 본문이 깨지지 않도록 그대로 유지됩니다.
      <div class="actions">
        <button id="force-load">이대로 렌더</button>
        <a class="reader-btn" href="${url}" target="_blank" rel="noopener">raw md 열기 ↗</a>
      </div>
    </div>`;
  $('#reader-body').innerHTML = '';
  $('#force-load').addEventListener('click', () => {
    $('#reader-warning').innerHTML = '';
    $('#reader-body').innerHTML = '<p class="hint"><span class="spinner"></span>rendering…</p>';
    setTimeout(() => renderMarkdown(md), 30);
  });
}

function buildTOC() {
  const body = $('#reader-body');
  const headings = body.querySelectorAll('h1, h2, h3, h4');
  const tocHost = $('#reader-toc');
  if (!headings.length || headings.length < 10) {
    tocHost.innerHTML = '';
    return;
  }
  const items = [...headings].map((h, i) => {
    const lvl = parseInt(h.tagName.slice(1), 10);
    const id = `h-${i}-${h.textContent.slice(0, 24).replace(/\s+/g, '-')}`;
    h.id = id;
    return `<li class="lvl-${lvl}"><a href="#${id}">${escapeHtml(h.textContent)}</a></li>`;
  }).join('');
  tocHost.innerHTML = `<div class="toc-box">
    <div class="toc-title">Contents · ${headings.length} sections</div>
    <ul>${items}</ul>
  </div>`;
}

function updateReaderNav() {
  const prev = $('#prev-doc');
  const next = $('#next-doc');
  if (!currentDocs.length || currentDocIdx < 0) {
    prev.disabled = true; next.disabled = true;
    prev.querySelector('.nav-text').textContent = '—';
    next.querySelector('.nav-text').textContent = '—';
    return;
  }
  const prevDoc = currentDocs[currentDocIdx - 1];
  const nextDoc = currentDocs[currentDocIdx + 1];
  prev.disabled = !prevDoc;
  next.disabled = !nextDoc;
  prev.querySelector('.nav-text').textContent = prevDoc ? cleanTitle(prevDoc.title) : '—';
  next.querySelector('.nav-text').textContent = nextDoc ? cleanTitle(nextDoc.title) : '—';
}

function navigateDoc(delta) {
  if (!currentDocs.length) return;
  const newIdx = currentDocIdx + delta;
  if (newIdx < 0 || newIdx >= currentDocs.length) return;
  const doc = currentDocs[newIdx];
  currentDocIdx = newIdx;
  openDoc(doc.date, doc.file);
}

// ====================================================================
// Document type inference
// ====================================================================
function inferType(title) {
  if (!title) return null;
  const t = title;
  if (/법률제\d+호|법률\s*제\d+호|법률안/.test(t))           return { label: '법률',   cls: 'b-law' };
  if (/시행령|대통령령/.test(t))                              return { label: '시행령', cls: 'b-rule' };
  if (/시행규칙|부령/.test(t))                                return { label: '시행규칙', cls: 'b-rule' };
  if (/입법예고|행정예고|규정변경예고|예고/.test(t))           return { label: '예고',   cls: 'b-yego' };
  if (/고시/.test(t))                                         return { label: '고시',   cls: 'b-gosi' };
  if (/공고/.test(t))                                         return { label: '공고',   cls: 'b-gonggo' };
  if (/공포|공시송달/.test(t))                                return { label: '공포',   cls: 'b-law' };
  return null;
}

// ====================================================================
// Title cleanup (OCR-era artifacts)
// ====================================================================
function cleanTitle(t) {
  if (!t) return '';
  return t
    // 제YYYY_NNN호 → 제YYYY-NNN호 (filename underscore became space in build step;
    // both variants appear depending on pipeline version)
    .replace(/제\s*(\d{4})[ _-]+(\d+)\s*호/g, '제$1-$2호')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ====================================================================
// Search highlight
// ====================================================================
function highlightNeedle(text, needle) {
  if (!needle) return escapeHtml(text);
  const t = escapeHtml(text);
  const re = new RegExp(`(${escapeRe(escapeHtml(needle))})`, 'gi');
  return t.replace(re, '<mark>$1</mark>');
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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
  $('#list-dates').addEventListener('keydown', e => {
    const item = e.target.closest('.item');
    if (item && e.key === 'Enter') selectDate(item.dataset.date);
  });
  $('#list-inst').addEventListener('click', e => {
    const item = e.target.closest('.item');
    if (!item) return;
    selectInst(item.dataset.inst);
  });
  $('#list-inst').addEventListener('keydown', e => {
    const item = e.target.closest('.item');
    if (item && e.key === 'Enter') selectInst(item.dataset.inst);
  });

  // back button
  $('#back-btn').addEventListener('click', closeReader);

  // prev / next
  $('#prev-doc').addEventListener('click', () => navigateDoc(-1));
  $('#next-doc').addEventListener('click', () => navigateDoc(+1));

  // copy permalink
  $('#copy-link-btn').addEventListener('click', copyPermalink);

  // shortcuts help trigger
  $('#show-shortcuts').addEventListener('click', e => {
    e.preventDefault();
    toggleShortcuts(true);
  });
  $('#kbd-hint').addEventListener('click', e => {
    if (e.target === $('#kbd-hint')) toggleShortcuts(false);
  });

  window.addEventListener('hashchange', routeFromHash);
}

function closeReader() {
  $('#reader').hidden = true;
  $('#docs-list').style.display = '';
  $('#main-head').style.display = '';
  if (location.hash.startsWith('#doc=')) {
    if (currentDate) location.hash = `browse/date/${currentDate}`;
    else if (currentInst) location.hash = `browse/inst/${encodeURIComponent(currentInst)}`;
    else location.hash = 'browse';
  }
  currentDocIdx = -1;
}

function copyPermalink() {
  const url = location.href;
  const done = () => showToast('link copied');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, () => {
      fallbackCopy(url); done();
    });
  } else {
    fallbackCopy(url); done();
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
}

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 1600);
}

// ====================================================================
// Keyboard shortcuts
// ====================================================================
function setupKeyboardShortcuts() {
  let gPressed = false;
  document.addEventListener('keydown', e => {
    // ignore while in editable fields (except `/` which focuses filter)
    const inEditable = /INPUT|TEXTAREA/.test(e.target.tagName)
                      || e.target.isContentEditable;

    // Esc always works
    if (e.key === 'Escape') {
      if ($('#kbd-hint').classList.contains('open')) {
        toggleShortcuts(false);
        return;
      }
      if (inEditable) {
        e.target.blur();
        if (e.target.id === 'filter' && e.target.value) {
          e.target.value = '';
          applyFilter('');
        }
        return;
      }
      if (!$('#reader').hidden) {
        closeReader();
        return;
      }
      return;
    }

    if (inEditable) return;

    // `?` toggles help
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      toggleShortcuts();
      return;
    }

    // `/` focuses filter (if in browse view)
    if (e.key === '/') {
      e.preventDefault();
      switchView('browse');
      $('#filter').focus();
      return;
    }

    // `g h` / `g b` / `g a`
    if (e.key === 'g') {
      gPressed = true;
      setTimeout(() => { gPressed = false; }, 900);
      return;
    }
    if (gPressed) {
      gPressed = false;
      if (e.key === 'h') { switchView('home'); location.hash = 'home'; window.scrollTo(0, 0); return; }
      if (e.key === 'b') { switchView('browse'); location.hash = 'browse'; return; }
      if (e.key === 'a') { switchView('about'); location.hash = 'about'; return; }
    }

    // j / k / arrow keys in reader = prev/next doc
    if (!$('#reader').hidden && (e.key === 'j' || e.key === 'ArrowDown')) {
      e.preventDefault();
      navigateDoc(+1);
      return;
    }
    if (!$('#reader').hidden && (e.key === 'k' || e.key === 'ArrowUp')) {
      e.preventDefault();
      navigateDoc(-1);
      return;
    }

    // j / k in sidebar (focus next/prev visible item)
    if (currentView === 'browse' && (e.key === 'j' || e.key === 'k')) {
      const list = $(`#list-${currentTab}`);
      if (!list) return;
      const items = [...list.querySelectorAll('.item')].filter(el => el.style.display !== 'none');
      if (!items.length) return;
      const activeIdx = items.indexOf(document.activeElement);
      const nextIdx = e.key === 'j'
        ? Math.min(items.length - 1, activeIdx < 0 ? 0 : activeIdx + 1)
        : Math.max(0, activeIdx < 0 ? 0 : activeIdx - 1);
      items[nextIdx].focus();
      items[nextIdx].scrollIntoView({ block: 'nearest' });
      e.preventDefault();
    }
  });
}

function toggleShortcuts(force) {
  const panel = $('#kbd-hint');
  const shouldOpen = typeof force === 'boolean' ? force : !panel.classList.contains('open');
  panel.classList.toggle('open', shouldOpen);
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
  if (h.startsWith('browse/search/')) {
    const q = decodeURIComponent(h.slice('browse/search/'.length));
    switchView('browse');
    selectSearchTab();
    $('#filter').value = q;
    handleSearch(q);
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
