#!/usr/bin/env node
// Retry items marked downloaded:false in existing raw-pdf/*/manifest.json
// files (transient "socket hang up" failures from the initial crawl).
import { chromium } from 'playwright';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { globSync } from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_DIR = path.join(ROOT, 'raw-pdf');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

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

const manifestPaths = globSync(path.join(RAW_DIR, '*', 'manifest.json').replaceAll('\\', '/'));

const browser = await chromium.launch({ headless: true });
let { context, page } = await warmSession(browser);

let totalRetried = 0;
let totalFixed = 0;

for (const mfPath of manifestPaths) {
  const manifest = JSON.parse(await readFile(mfPath, 'utf8'));
  const dateDir = path.dirname(mfPath);
  const failedItems = manifest.items.filter((it) => !it.downloaded);
  if (failedItems.length === 0) continue;

  console.log(`[${manifest.date}] retrying ${failedItems.length} item(s)`);
  let dirty = false;
  for (const it of failedItems) {
    totalRetried++;
    const pdfPath = path.join(dateDir, it.pdfFile);
    if (await exists(pdfPath)) {
      it.downloaded = true;
      delete it.error;
      dirty = true;
      continue;
    }
    try {
      const size = await downloadPdf(page.request, it.tocId, pdfPath);
      console.log(`  [${it.seq}] OK (${size}B)`);
      it.downloaded = true;
      it.bytes = size;
      delete it.error;
      dirty = true;
      totalFixed++;
    } catch (e) {
      console.error(`  [${it.seq}] still failing: ${e.message}`);
      it.error = String(e.message);
    }
    await sleep(2000);
  }
  if (dirty) {
    await writeFile(mfPath, JSON.stringify(manifest, null, 2));
  }
}

await browser.close();
console.log(`\nretried ${totalRetried}, fixed ${totalFixed}`);
