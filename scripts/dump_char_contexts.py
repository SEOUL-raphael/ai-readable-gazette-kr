#!/usr/bin/env python3
"""Dump top broken tokens containing each suspicious char.

For each char in a candidate list, pull the top-N tokens from the
residual-tokens TSV that contain that char. This lets us eyeball whether
the char maps consistently to one target (safe for global substring
replacement) or resolves differently across tokens (ambiguous, whole-
token only).

Input TSV format: <count>\t<token>, one per line (output of
extract_residual_tokens.py with --out).
"""
from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

# Candidate chars — the analyzer's "unambiguous" list, minus chars that
# are valid Korean and must never be global-replaced.
CANDIDATES = list('걭눀걬걐괈햌쀜턬쀸얩찈툌섘씈욄욥쵴띝롘씤앸왘쵘푴풉벀묰뉰댘띯푭홥좝욐먴쀤찝쾤쀩쁋삍')


def load_tsv(path: Path) -> list[tuple[int, str]]:
    out = []
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line:
            continue
        c, tok = line.split('\t', 1)
        out.append((int(c), tok))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tsv', type=Path, default=Path('/tmp/residual_tokens.tsv'))
    ap.add_argument('--per-char', type=int, default=15)
    ap.add_argument('--chars', type=str, default=None,
                    help='override candidate chars, e.g. "눀옄찈"')
    args = ap.parse_args()

    chars = list(args.chars) if args.chars else CANDIDATES
    tokens = load_tsv(args.tsv)
    print(f'[load] {len(tokens)} tokens from {args.tsv}', file=sys.stderr)

    per_char: dict[str, list[tuple[int, str]]] = defaultdict(list)
    for c in chars:
        for cnt, tok in tokens:
            if c in tok:
                per_char[c].append((cnt, tok))
                if len(per_char[c]) >= args.per_char:
                    break

    for c in chars:
        rows = per_char.get(c, [])
        total = sum(cnt for cnt, _ in rows)
        print(f'\n=== {c} (shown top {len(rows)}, sum={total:,}) ===')
        for cnt, tok in rows:
            print(f'  {cnt:>8}  {tok}')


if __name__ == '__main__':
    main()
