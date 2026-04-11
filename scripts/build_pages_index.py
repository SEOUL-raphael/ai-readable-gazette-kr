#!/usr/bin/env python3
"""Build static JSON index for the GitHub Pages reader.

Scans derived/readable-corrected/ and emits:
  docs/data/meta.json             — totals, date list, institution list, version
  docs/data/dates/YYYY-MM-DD.json  — per-date doc entries (lazy loaded)

Each doc entry includes serial, institution, title, raw URL on
raw.githubusercontent.com so the reader can fetch md on demand.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'derived' / 'readable-corrected'
OUT = ROOT / 'docs' / 'data'

RAW_BASE = (
    'https://raw.githubusercontent.com/hosungseo/ai-readable-gazette-kr/main'
    '/derived/readable-corrected'
)
BLOB_BASE = (
    'https://github.com/hosungseo/ai-readable-gazette-kr/blob/main'
    '/derived/readable-corrected'
)

FNAME_RE = re.compile(r'^(\d{3})_([^_]+)_(.+)\.md$')


def parse_filename(name: str) -> tuple[str, str, str] | None:
    m = FNAME_RE.match(name)
    if not m:
        return None
    serial, inst, rest = m.group(1), m.group(2), m.group(3)
    # Title: underscores → spaces for display
    title = rest.replace('_', ' ')
    return serial, inst, title


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'dates').mkdir(parents=True, exist_ok=True)

    date_dirs = sorted(
        p for p in SRC.iterdir() if p.is_dir() and re.match(r'^\d{4}-\d{2}-\d{2}$', p.name)
    )

    date_counts: list[dict] = []
    institution_counter: Counter[str] = Counter()
    total_docs = 0
    min_date = max_date = None

    for d in date_dirs:
        date = d.name
        docs: list[dict] = []
        for p in sorted(d.glob('*.md')):
            parsed = parse_filename(p.name)
            if not parsed:
                continue
            serial, inst, title = parsed
            institution_counter[inst] += 1
            docs.append({
                'n': serial,
                'inst': inst,
                'title': title,
                'file': p.name,
                'raw': f'{RAW_BASE}/{date}/{p.name}',
                'blob': f'{BLOB_BASE}/{date}/{p.name}',
            })
        if not docs:
            continue
        date_counts.append({'date': date, 'count': len(docs)})
        total_docs += len(docs)
        if min_date is None or date < min_date:
            min_date = date
        if max_date is None or date > max_date:
            max_date = date
        # Emit per-date file
        (OUT / 'dates' / f'{date}.json').write_text(
            json.dumps({'date': date, 'docs': docs}, ensure_ascii=False, separators=(',', ':')),
            encoding='utf-8',
        )

    # Meta index
    institutions = [
        {'name': name, 'count': cnt}
        for name, cnt in sorted(institution_counter.items(), key=lambda kv: (-kv[1], kv[0]))
    ]
    meta = {
        'version': 'v7',
        'total_docs': total_docs,
        'date_range': [min_date, max_date],
        'date_count': len(date_counts),
        'institution_count': len(institutions),
        'dates': date_counts,
        'institutions': institutions,
        'raw_base': RAW_BASE,
        'blob_base': BLOB_BASE,
        'repo_url': 'https://github.com/hosungseo/ai-readable-gazette-kr',
    }
    (OUT / 'meta.json').write_text(
        json.dumps(meta, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'[meta] {total_docs} docs, {len(date_counts)} dates, {len(institutions)} institutions')
    print(f'[out]  {OUT}')


if __name__ == '__main__':
    main()
