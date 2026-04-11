#!/usr/bin/env python3
"""Analyze per-char ambiguity of OCR-broken Hangul in existing dict.

For every (bad, good) pair in build_readable_corrected.py where the two
sides have the same length, align positions and record which good char
each bad char maps to. A bad char with exactly one observed target is
safe for a global single-char substring replacement. A char with multiple
targets must stay as a whole-token replacement.

Usage:
    python3 scripts/analyze_char_ambiguity.py
"""
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / 'scripts' / 'build_readable_corrected.py'

HANGUL_RE = re.compile(r'[가-힣]')
PAIR_RE = re.compile(r"\(\s*(['\"])(.*?)\1\s*,\s*(['\"])(.*?)\3\s*\)")


def load_pairs(builder_path: Path) -> list[tuple[str, str]]:
    text = builder_path.read_text(encoding='utf-8')
    return [(m.group(2), m.group(4)) for m in PAIR_RE.finditer(text)]


def infer_char_map(pairs: list[tuple[str, str]]) -> dict[str, dict[str, int]]:
    """Return {bad_char: {good_char: support_count}}.

    Only aligns pairs of equal length; for each position where the two
    chars differ and the bad side is Hangul, record the mapping.
    """
    mapping: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for bad, good in pairs:
        if len(bad) != len(good):
            continue
        for bc, gc in zip(bad, good):
            if bc == gc:
                continue
            if not HANGUL_RE.match(bc):
                continue
            if not HANGUL_RE.match(gc):
                continue
            mapping[bc][gc] += 1
    return mapping


def main():
    pairs = load_pairs(BUILDER)
    print(f'[pairs] {len(pairs)} total, '
          f'{sum(1 for b, g in pairs if len(b) == len(g))} equal-length')

    char_map = infer_char_map(pairs)

    unambiguous: list[tuple[str, str, int]] = []
    ambiguous: list[tuple[str, dict[str, int]]] = []
    for bc, targets in sorted(char_map.items()):
        if len(targets) == 1:
            gc, n = next(iter(targets.items()))
            unambiguous.append((bc, gc, n))
        else:
            ambiguous.append((bc, dict(targets)))

    print(f'\n=== UNAMBIGUOUS ({len(unambiguous)}) — safe for global char replace ===')
    for bc, gc, n in sorted(unambiguous, key=lambda x: -x[2]):
        print(f'  {bc} → {gc}   (support={n})')

    print(f'\n=== AMBIGUOUS ({len(ambiguous)}) — whole-token only ===')
    for bc, targets in sorted(ambiguous, key=lambda x: -sum(x[1].values())):
        targets_str = ', '.join(f'{g}×{n}' for g, n in sorted(targets.items(), key=lambda x: -x[1]))
        print(f'  {bc} → {{{targets_str}}}')


if __name__ == '__main__':
    main()
