#!/usr/bin/env node
// Crawl gwanbo.go.kr (대한민국 전자관보) for a date range and download the
// original PDFs, one per article, into raw-pdf/YYYY-MM-DD/.
//
// Why Playwright instead of a bare HTTP client: gwanbo.go.kr's
// SearchRestApi.jsp silently returns empty result sets (HTTP 200, all
// category counts 0) to requests that don't carry a session cookie
// established by an actual browser page load. A real Chromium session
// (via context.newPage().goto()) picks up a JSESSIONID/PCID pair that
// makes the API behave; that session is then reused for the paced
// API + download requests via page.request (same cookie jar).
//
// Usage:
//   node scripts/crawl_gwanbo.mjs --start 2026-04-08 --end 2026-04-09 [--out raw-pdf] [--dry-run]
import { chromium } from 'playwright';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const START = getArg('start');
const END = getArg('end', START);
const OUT_DIR = path.resolve(ROOT, getArg('out', 'raw-pdf'));
const DRY_RUN = hasFlag('dry-run');
// Pacing: deliberately conservative. gwanbo.go.kr showed WAF-style
// throttling (silent empty results) after a burst of ~10 rapid requests.
const DATE_DELAY_MS = Number(getArg('date-delay-ms', 4000));
const DOC_DELAY_MS = Number(getArg('doc-delay-ms', 1500));
const SESSION_REFRESH_EVERY = Number(getArg('session-refresh-every', 15)); // dates

if (!START) {
  console.error('Usage: node scripts/crawl_gwanbo.mjs --start YYYY-MM-DD [--end YYYY-MM-DD] [--out raw-pdf] [--dry-run]');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dateRange = (start, end) => {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

const sanitizeForPath = (s) =>
  s
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120);

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

const CATEGORY_QUERY =
  'unstored_field_keyword:(관보 AND 정호) AND keyword_category_order:(@@ORDER_NUM)';

async function searchDate(pageRequest, dateCompact) {
  const resp = await pageRequest.post('https://gwanbo.go.kr/SearchRestApi.jsp', {
    form: {
      mode: 'daily',
      index: 'gwanbo',
      pQuery_temp: '',
      pageNo: '1',
      listSize: '10000',
      sort: '',
      query: `keyword_field_regdate:[${dateCompact} TO ${dateCompact}] AND ${CATEGORY_QUERY}`,
    },
    headers: {
      Referer: 'https://gwanbo.go.kr/',
      'X-Requested-With': 'XMLHttpRequest',
    },
    timeout: 20000,
  });
  if (!resp.ok()) throw new Error(`search HTTP ${resp.status()}`);
  const json = JSON.parse(await resp.text());
  const items = [];
  for (const cat of json.data ?? []) {
    for (const item of cat.list ?? []) items.push(item);
  }
  return items;
}

async function downloadPdf(pageRequest, tocSeq, destPath) {
  const resp = await pageRequest.post('https://gwanbo.go.kr/user/common/ofcttCntntDownload.do', {
    form: { cntnt_seq_no: tocSeq },
    headers: { Referer: 'https://gwanbo.go.kr/' },
    timeout: 30000,
  });
  if (!resp.ok()) throw new Error(`download HTTP ${resp.status()}`);
  const buf = await resp.body();
  if (buf.length < 100 || buf.slice(0, 4).toString('latin1') !== '%PDF') {
    throw new Error(`unexpected payload (${buf.length} bytes, not a PDF)`);
  }
  await writeFile(destPath, buf);
  return buf.length;
}

async function warmSession(browser) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.goto('https://gwanbo.go.kr/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1500);
  return { context, page };
}

async function main() {
  const dates = dateRange(START, END);
  console.log(`[crawl] ${dates.length} date(s): ${dates[0]} .. ${dates[dates.length - 1]}`);
  console.log(`[crawl] out=${OUT_DIR} dry-run=${DRY_RUN}`);

  const browser = await chromium.launch({ headless: true });
  let { context, page } = await warmSession(browser);

  const summary = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dateCompact = date.replaceAll('-', '');

    if (i > 0 && i % SESSION_REFRESH_EVERY === 0) {
      console.log('[crawl] refreshing session...');
      await context.close();
      ({ context, page } = await warmSession(browser));
    }

    const dateDir = path.join(OUT_DIR, date);
    const manifestPath = path.join(dateDir, 'manifest.json');
    if (await exists(manifestPath)) {
      console.log(`[${date}] already crawled, skipping (delete manifest.json to re-crawl)`);
      continue;
    }

    let items;
    try {
      items = await searchDate(page.request, dateCompact);
    } catch (e) {
      console.error(`[${date}] search failed: ${e.message}`);
      summary.push({ date, status: 'search_failed', error: String(e.message) });
      await sleep(DATE_DELAY_MS);
      continue;
    }

    if (items.length === 0) {
      console.log(`[${date}] 0 documents (holiday or no issue)`);
      await mkdir(dateDir, { recursive: true });
      if (!DRY_RUN) await writeFile(manifestPath, JSON.stringify({ date, count: 0, items: [] }, null, 2));
      summary.push({ date, status: 'empty', count: 0 });
      await sleep(DATE_DELAY_MS);
      continue;
    }

    // Group by publisher (stored_organ_nm) to roughly match upstream's
    // observed NNN ordering convention, then flatten with a stable index.
    const sorted = [...items].sort((a, b) => {
      const orgCmp = (a.stored_organ_nm ?? '').localeCompare(b.stored_organ_nm ?? '', 'ko');
      if (orgCmp !== 0) return orgCmp;
      return Number(a.stored_category_order ?? 0) - Number(b.stored_category_order ?? 0);
    });

    console.log(`[${date}] ${sorted.length} documents`);
    await mkdir(dateDir, { recursive: true });

    const manifestItems = [];
    for (let idx = 0; idx < sorted.length; idx++) {
      const it = sorted[idx];
      const nnn = String(idx + 1).padStart(3, '0');
      const organ = sanitizeForPath(it.stored_organ_nm ?? 'unknown');
      const title = sanitizeForPath(it.stored_field_subject ?? 'untitled');
      const baseName = `${nnn}_${organ}_${title}`;
      const pdfPath = path.join(dateDir, `${baseName}.pdf`);

      const meta = {
        seq: nnn,
        organ: it.stored_organ_nm,
        title: it.stored_field_subject,
        date,
        category: it.stored_category_name,
        contentId: (it.stored_field_url?.match(/contentId=([^&]+)/) ?? [])[1] ?? null,
        tocId: it.stored_toc_seq,
        sourceUrl: `https://gwanbo.go.kr${it.stored_field_url ?? ''}`,
        pdfFile: `${baseName}.pdf`,
      };

      if (DRY_RUN) {
        console.log(`  [dry-run] would download ${baseName}.pdf (tocId=${meta.tocId})`);
        manifestItems.push({ ...meta, downloaded: false });
        continue;
      }

      if (await exists(pdfPath)) {
        manifestItems.push({ ...meta, downloaded: true, skipped: true });
        continue;
      }

      try {
        const size = await downloadPdf(page.request, it.stored_toc_seq, pdfPath);
        console.log(`  [${nnn}] ${organ} / ${title.slice(0, 40)}... (${size}B)`);
        manifestItems.push({ ...meta, downloaded: true, bytes: size });
      } catch (e) {
        console.error(`  [${nnn}] FAILED: ${e.message}`);
        manifestItems.push({ ...meta, downloaded: false, error: String(e.message) });
      }

      await sleep(DOC_DELAY_MS);
    }

    if (!DRY_RUN) {
      await writeFile(
        manifestPath,
        JSON.stringify({ date, count: manifestItems.length, items: manifestItems }, null, 2),
      );
    }
    summary.push({ date, status: 'ok', count: manifestItems.length });

    await sleep(DATE_DELAY_MS);
  }

  await browser.close();

  console.log('\n[crawl] summary:');
  for (const s of summary) console.log(' ', JSON.stringify(s));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
