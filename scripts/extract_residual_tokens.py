#!/usr/bin/env python3
"""Extract high-frequency residual broken tokens from readable-corrected.

Strategy:
1. Harvest "suspicious Hangul chars" from the LHS of replacement pairs in
   build_readable_corrected.py (the chars we already know OCR breaks into).
2. Scan readable-corrected/**/*.md, tokenize, and count tokens that still
   contain any suspicious char. These are *missed* corrections.
3. Emit top-N candidates for manual review.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORRECTED = ROOT / 'derived' / 'readable-corrected'
BUILDER = ROOT / 'scripts' / 'build_readable_corrected.py'

HANGUL_RE = re.compile(r'[가-힣]')
# Token splitter: whitespace + table separators + common punctuation
TOKEN_SPLIT_RE = re.compile(r'[\s|,;:()\[\]{}<>"\'`~!?/\\\-=+*^%$#@]+')

# Valid Korean chars that happen to appear on LHS of some pair because the
# surrounding OCR was wrong — they are NOT garbage themselves. Exclude from
# the suspicious set so we don't flag legit tokens like 승인, 별표, 접수.
# v5: expanded with 피/버 after v4 introduced 피푩물→화합물 and 구버→구분
# compounds, which promoted both chars to LHS even though they are legit Korean
# (피고인/피해자/오피스텔/스피커 and 버스/버터/서버/인버터/컨버터 etc).
SAFE_HANGUL_OVERRIDE = set(
    '승표접와완프옵릅먼묏묘삐게갑툐별인수도로시구동가면년월일법조항호'
    '피버'
)


def harvest_suspicious_chars(builder_path: Path) -> set[str]:
    """Pull the LHS of every ('xxx', 'yyy') replacement tuple as the bad side.

    We treat every Hangul syllable appearing on the LHS as potentially
    suspicious. This is a seed set — the chars that OCR has already been
    observed to produce in this corpus.
    """
    text = builder_path.read_text(encoding='utf-8')
    # Match simple ('bad', 'good') tuples on single lines
    pair_re = re.compile(r"\(\s*(['\"])(.*?)\1\s*,\s*(['\"])(.*?)\3\s*\)")
    bad_chars: set[str] = set()
    for m in pair_re.finditer(text):
        lhs = m.group(2)
        rhs = m.group(4)
        lhs_hangul = set(HANGUL_RE.findall(lhs))
        rhs_hangul = set(HANGUL_RE.findall(rhs))
        # A char is "suspicious" if it appears on LHS but never on RHS of
        # any pair. We collect LHS chars first, subtract RHS set later.
        bad_chars |= (lhs_hangul - rhs_hangul)
    # Also harvest from regex patterns in token_patterns / focused_patterns:
    # Any line containing a raw string with Hangul paired with a replacement.
    return bad_chars


def harvest_rhs_chars(builder_path: Path) -> set[str]:
    text = builder_path.read_text(encoding='utf-8')
    pair_re = re.compile(r"\(\s*(['\"])(.*?)\1\s*,\s*(['\"])(.*?)\3\s*\)")
    good_chars: set[str] = set()
    for m in pair_re.finditer(text):
        rhs = m.group(4)
        good_chars |= set(HANGUL_RE.findall(rhs))
    return good_chars


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN_SPLIT_RE.split(text) if t]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=200, help='top-N tokens to print')
    ap.add_argument('--min-count', type=int, default=5)
    ap.add_argument('--min-len', type=int, default=2)
    ap.add_argument('--sample', type=int, default=0,
                    help='scan only first N files (0 = all)')
    ap.add_argument('--out', type=Path, default=None,
                    help='write full ranked list here (TSV)')
    args = ap.parse_args()

    bad = harvest_suspicious_chars(BUILDER)
    good = harvest_rhs_chars(BUILDER)
    # Purely-suspicious chars: appear as OCR garbage but never as valid output,
    # minus the manual whitelist of chars we know are legitimate Korean.
    suspicious = (bad - good) - SAFE_HANGUL_OVERRIDE
    print(f'[seed] suspicious chars: {len(suspicious)}', file=sys.stderr)
    print(''.join(sorted(suspicious)), file=sys.stderr)

    files = sorted(CORRECTED.rglob('*.md'))
    if args.sample:
        files = files[: args.sample]
    print(f'[scan] {len(files)} files', file=sys.stderr)

    counter: Counter[str] = Counter()
    for i, p in enumerate(files):
        if i and i % 5000 == 0:
            print(f'  scanned {i}/{len(files)}', file=sys.stderr)
        try:
            text = p.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        for tok in tokenize(text):
            if len(tok) < args.min_len:
                continue
            if not any(ch in suspicious for ch in tok):
                continue
            counter[tok] += 1

    ranked = [(tok, c) for tok, c in counter.most_common() if c >= args.min_count]
    print(f'[result] {len(ranked)} distinct tokens >= {args.min_count}', file=sys.stderr)

    if args.out:
        with args.out.open('w', encoding='utf-8') as f:
            for tok, c in ranked:
                f.write(f'{c}\t{tok}\n')
        print(f'[wrote] {args.out}', file=sys.stderr)

    for tok, c in ranked[: args.top]:
        print(f'{c}\t{tok}')


if __name__ == '__main__':
    main()
