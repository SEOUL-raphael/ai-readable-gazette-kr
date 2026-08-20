#!/usr/bin/env python3
"""Incrementally merge new dates into docs/data/{meta,titles}.json + dates/*.json
without needing the full 2.4GB upstream derived/readable-corrected/ corpus
checked out locally.

Assumes:
  - docs/data/meta.json locally == the currently-published meta.json (i.e.
    nothing has been merged in ahead of it going stale — check date_range
    against the remote before running).
  - The new date directories to merge are all *newer* than the existing
    date_range[1], so recent_samples can be recomputed purely from the new
    dates (they are, by construction, the most recent dates in the corpus).
  - titles.json for the existing corpus has been downloaded to
    docs/data/titles.json (fetch separately; this script reads it if present,
    otherwise starts from an empty titles index — do not do that against a
    non-empty corpus).

Usage:
  python scripts/merge_pages_index.py --dates 2026-04-08 2026-04-09 ...
  python scripts/merge_pages_index.py --since 2026-04-08   # all local date dirs >= this
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_pages_index import (  # noqa: E402
    CATEGORY_ORDER,
    classify,
    parse_filename,
    RAW_BASE,
    BLOB_BASE,
)

SRC = ROOT / 'derived' / 'readable-corrected'
OUT = ROOT / 'docs' / 'data'


def collect_date(date: str) -> tuple[list[dict], list[dict]]:
    """Returns (docs, samples) for one date dir."""
    d = SRC / date
    docs = []
    for p in sorted(d.glob('*.md')):
        parsed = parse_filename(p.name)
        if not parsed:
            continue
        serial, inst, title = parsed
        docs.append({
            'n': serial, 'inst': inst, 'title': title, 'file': p.name,
            'raw': f'{RAW_BASE}/{date}/{p.name}',
            'blob': f'{BLOB_BASE}/{date}/{p.name}',
        })
    samples = [{'n': d_['n'], 'inst': d_['inst'], 'title': d_['title'], 'file': d_['file']} for d_ in docs[:3]]
    return docs, samples


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dates', nargs='*', help='explicit date list (YYYY-MM-DD)')
    ap.add_argument('--since', help='merge all local date dirs >= this date')
    args = ap.parse_args()

    if args.dates:
        new_dates = sorted(args.dates)
    elif args.since:
        new_dates = sorted(
            p.name for p in SRC.iterdir()
            if p.is_dir() and re.match(r'^\d{4}-\d{2}-\d{2}$', p.name) and p.name >= args.since
        )
    else:
        ap.error('need --dates or --since')

    meta = json.loads((OUT / 'meta.json').read_text(encoding='utf-8'))
    existing_max_date = meta['date_range'][1]
    for nd in new_dates:
        if nd <= existing_max_date:
            sys.exit(f'refusing: new date {nd} <= existing meta max_date {existing_max_date} '
                      f'(meta.json may already include it, or is stale — check before merging)')

    titles_path = OUT / 'titles.json'
    if not titles_path.exists():
        sys.exit('docs/data/titles.json not found locally — fetch the current published '
                  'titles.json first (this script merges into it, it does not rebuild from scratch)')
    titles = json.loads(titles_path.read_text(encoding='utf-8'))
    date_list: list[str] = titles['dates']
    inst_list: list[str] = titles['insts']
    date_index = {d: i for i, d in enumerate(date_list)}
    inst_index = {i_: i for i, i_ in enumerate(inst_list)}
    all_titles: list[list] = titles['docs']

    inst_counts: dict[str, int] = {e['name']: e['count'] for e in meta['institutions']}
    month_counts: dict[str, int] = {h['ym']: h['count'] for h in meta['heatmap']}
    date_counts: list[dict] = list(meta['dates'])

    added_docs = 0
    recent_samples = []

    for date in new_dates:
        docs, samples = collect_date(date)
        if not docs:
            continue
        di = date_index.setdefault(date, len(date_index))
        if di == len(date_list):
            date_list.append(date)
        for doc in docs:
            ii = inst_index.setdefault(doc['inst'], len(inst_index))
            if ii == len(inst_list):
                inst_list.append(doc['inst'])
            all_titles.append([di, doc['n'], ii, doc['title'], doc['file']])
            inst_counts[doc['inst']] = inst_counts.get(doc['inst'], 0) + 1

        date_counts.append({'date': date, 'count': len(docs)})
        month_counts[date[:7]] = month_counts.get(date[:7], 0) + len(docs)
        added_docs += len(docs)
        recent_samples.append({'date': date, 'count': len(docs), 'samples': samples})

        (OUT / 'dates' / f'{date}.json').write_text(
            json.dumps({'date': date, 'docs': docs}, ensure_ascii=False, separators=(',', ':')),
            encoding='utf-8',
        )

    date_counts.sort(key=lambda x: x['date'])
    recent_samples = sorted(recent_samples, key=lambda x: x['date'], reverse=True)[:10]

    institutions = []
    by_category: dict[str, list[dict]] = {}
    for name, cnt in sorted(inst_counts.items(), key=lambda kv: (-kv[1], kv[0])):
        cat = classify(name)
        entry = {'name': name, 'count': cnt, 'cat': cat}
        institutions.append(entry)
        by_category.setdefault(cat, []).append(entry)

    inst_tree = []
    for cat in CATEGORY_ORDER:
        entries = by_category.get(cat, [])
        if not entries:
            continue
        inst_tree.append({
            'cat': cat, 'count': sum(e['count'] for e in entries),
            'n_inst': len(entries), 'items': entries,
        })

    heatmap = [{'ym': ym, 'count': month_counts[ym]} for ym in sorted(month_counts.keys())]

    meta['total_docs'] += added_docs
    meta['date_range'] = [meta['date_range'][0], date_counts[-1]['date']]
    meta['date_count'] = len(date_counts)
    meta['institution_count'] = len(institutions)
    meta['dates'] = date_counts
    meta['institutions'] = institutions
    meta['institution_tree'] = inst_tree
    meta['heatmap'] = heatmap
    meta['recent_samples'] = recent_samples

    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (OUT / 'titles.json').write_text(
        json.dumps({'dates': date_list, 'insts': inst_list, 'docs': all_titles}, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    print(f'[merge] +{added_docs} docs across {len(new_dates)} new dates')
    print(f'[merge] total_docs now {meta["total_docs"]}, date_range {meta["date_range"]}')


if __name__ == '__main__':
    main()
