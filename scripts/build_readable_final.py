#!/usr/bin/env python3
"""Convert raw-pdf/YYYY-MM-DD/*.pdf (+ manifest.json from crawl_gwanbo.mjs)
into readable-final/YYYY-MM-DD/NNN_<기관>_<제목>.md, matching the frontmatter
and body shape of the upstream ai-readable-gazette-kr corpus so that
build_readable_corrected.py can run unmodified against the output.

PDF -> markdown uses opendataloader-pdf (Java CLI via its Python wrapper).
HWP sources are not handled here yet (see NOTICE in README follow-up).

Usage:
    python scripts/build_readable_final.py --date 2026-04-08
    python scripts/build_readable_final.py --start 2026-04-08 --end 2026-04-09
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / 'raw-pdf'
OUT_DIR = ROOT / 'readable-final'
CONVERT_SUBDIR = '_odl_out'  # scratch dir for opendataloader-pdf output, per date


def daterange(start: str, end: str):
    d0 = date.fromisoformat(start)
    d1 = date.fromisoformat(end)
    d = d0
    while d <= d1:
        yield d.isoformat()
        d += timedelta(days=1)


def run_opendataloader(pdf_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, '-m', 'opendataloader_pdf', str(pdf_dir), '-o', str(out_dir), '-f', 'markdown', '-q']
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode != 0:
        raise RuntimeError(f'opendataloader-pdf failed (exit {result.returncode}):\n{result.stderr[-2000:]}')


def build_final_md(item: dict, body: str) -> str:
    title = item['title']
    publisher = item['organ']
    date_dots = item['date'].replace('-', '.')
    source_raw_md = f"opendataloader-output/{item['date']}/{item['pdfFile'][:-4]}.md"
    header = (
        '---\n'
        f'title: "{title}"\n'
        f'publisher: "{publisher}"\n'
        f'date: "{date_dots}"\n'
        f'source_raw_md: "{source_raw_md}"\n'
        'postprocess: "opendataloader-clean-v1"\n'
        '---\n\n'
        f'# {title}\n\n'
        f'- 발행기관: {publisher}\n'
        f'- 발행일: {date_dots}\n'
        f'- 원문 PDF: {item["sourceUrl"]}\n\n'
        '## 본문\n\n'
    )
    return header + body.strip() + '\n'


def process_date(day: str, limit: int | None = None) -> tuple[int, int]:
    date_raw_dir = RAW_DIR / day
    manifest_path = date_raw_dir / 'manifest.json'
    if not manifest_path.is_file():
        print(f'[{day}] no manifest.json in {date_raw_dir}, skipping')
        return (0, 0)

    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    items = [it for it in manifest['items'] if it.get('downloaded')]
    if limit:
        items = items[:limit]
    if not items:
        print(f'[{day}] no downloaded items')
        return (0, 0)

    odl_out = date_raw_dir / CONVERT_SUBDIR
    print(f'[{day}] running opendataloader-pdf on {len(items)} PDF(s)...')
    run_opendataloader(date_raw_dir, odl_out)

    out_date_dir = OUT_DIR / day
    out_date_dir.mkdir(parents=True, exist_ok=True)

    ok, failed = 0, 0
    for item in items:
        pdf_stem = item['pdfFile'][:-4]
        converted_md = odl_out / f'{pdf_stem}.md'
        if not converted_md.is_file():
            print(f'  MISSING converted md for {pdf_stem}')
            failed += 1
            continue
        body = converted_md.read_text(encoding='utf-8', errors='ignore')
        final_text = build_final_md(item, body)
        out_path = out_date_dir / f'{pdf_stem}.md'
        out_path.write_text(final_text, encoding='utf-8')
        ok += 1

    print(f'[{day}] wrote {ok} readable-final files ({failed} failed)')
    return (ok, failed)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str, default=None)
    parser.add_argument('--start', type=str, default=None)
    parser.add_argument('--end', type=str, default=None)
    parser.add_argument('--limit', type=int, default=None, help='Limit docs per date (smoke test)')
    args = parser.parse_args()

    if args.date:
        days = [args.date]
    elif args.start:
        days = list(daterange(args.start, args.end or args.start))
    else:
        parser.error('--date or --start/--end required')

    total_ok, total_failed = 0, 0
    for day in days:
        ok, failed = process_date(day, limit=args.limit)
        total_ok += ok
        total_failed += failed
    print(f'TOTAL: {total_ok} ok, {total_failed} failed')


if __name__ == '__main__':
    main()
