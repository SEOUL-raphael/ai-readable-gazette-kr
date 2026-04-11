#!/usr/bin/env python3
"""Build static JSON index for the GitHub Pages reader.

Outputs under docs/data/:
  meta.json                 — totals, date list, institution list, classification,
                              year-month heatmap, version
  dates/YYYY-MM-DD.json     — per-date doc entries (lazy loaded by reader)
  titles.json               — compact title search index (all docs)
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

# Title prefix → sub-jurisdiction extraction.
# The upstream gazette filename labels every document with a "broad publisher"
# (e.g., 강원도) even when the actual issuing entity is a 기초자치단체 (e.g., 화천군).
# We extract the sub-jurisdiction from the title prefix and combine it with the
# parent label to give browse/search the right granularity.
SUB_JURISDICTION_RE = re.compile(
    r'^([가-힣]{1,8}?(?:특별시|광역시|특별자치시|특별자치도|시|군|구))'
    r'(?:청)?'
    r'(?:고시|공고|훈령|규칙|령|공시|예고|공포|결정|입법예고|행정예고|규정변경예고)'
)

# Tokens that look like locations but are not (mostly 군/공/육 + 군 = military branches).
SUB_JURISDICTION_BLACKLIST = {'해군', '공군', '육군', '아군', '적군', '본군', '아공'}


def derive_publisher(filename_publisher: str, title_underscored: str) -> str:
    """Combine the gazette filename publisher with a sub-jurisdiction
    extracted from the title prefix.

    Examples:
      ('강원도', '화천군고시제2021_559호_…')   → '강원도 화천군'
      ('강원도', '강원도고시제2020_412호_…')   → '강원도'
      ('국토교통부', '국토교통부공고제2026_…')  → '국토교통부'
      ('서울특별시', '강서구공고제2025_…')      → '서울특별시 강서구'
      ('국방부', '해군공고제2023_…')          → '국방부' (해군 blacklisted)

    Returns the original filename_publisher when no sub-jurisdiction can
    be confidently extracted.
    """
    if title_underscored.startswith(filename_publisher):
        return filename_publisher
    m = SUB_JURISDICTION_RE.match(title_underscored)
    if not m:
        return filename_publisher
    sub = m.group(1)
    if sub in SUB_JURISDICTION_BLACKLIST:
        return filename_publisher
    if sub == filename_publisher or filename_publisher.startswith(sub):
        return filename_publisher
    return f'{filename_publisher} {sub}'

# ---------- institution classification ----------
#
# Buckets are broad on purpose. 1,426 distinct institutions in the corpus,
# many with one or two documents, so we fall back to "기타" liberally.

CENTRAL_MINISTRIES = {
    '기획재정부', '교육부', '과학기술정보통신부', '외교부', '통일부', '법무부',
    '국방부', '행정안전부', '문화체육관광부', '농림축산식품부', '산업통상자원부',
    '보건복지부', '환경부', '고용노동부', '여성가족부', '국토교통부', '해양수산부',
    '중소벤처기업부', '국가보훈부', '인사혁신처', '법제처', '식품의약품안전처',
    '공정거래위원회', '금융위원회', '국민권익위원회', '개인정보보호위원회',
    '원자력안전위원회', '방송통신위원회', '국세청', '관세청', '조달청', '통계청',
    '검찰청', '병무청', '방위사업청', '경찰청', '소방청', '문화재청', '국가유산청',
    '농촌진흥청', '산림청', '특허청', '기상청', '행정중심복합도시건설청',
    '새만금개발청', '해양경찰청', '국립전파연구원', '국가정보원',
    '대통령경호처', '국가안보실', '감사원', '원자력안전위원회', '대한민국법원행정처',
    '국세청', '국가인권위원회',
}

LEGISLATIVE = {'국회', '국회사무처', '국회도서관', '국회예산정책처', '국회입법조사처'}

JUDICIAL_KWS = ('법원', '대법원', '대검찰청', '헌법재판소', '고등법원', '지방법원',
                '가정법원', '특허법원', '행정법원')

LOCAL_GOV_KWS = ('특별시', '광역시', '특별자치시', '특별자치도', '도', '시', '군', '구',
                 '동', '면', '읍')

EDU_KWS = ('교육청', '교육지원청', '학교', '대학교', '학원')

PUBLIC_INST_KWS = ('공단', '공사', '재단', '진흥원', '관리원', '연구원', '연구소',
                   '센터', '원', '협회', '조합', '위원회', '공제회', '기관', '사무소')


def classify(inst: str) -> str:
    # For compound labels (e.g. "강원도 화천군") use the parent for ministry
    # / legislative / judicial detection so a sub-jurisdiction doesn't get
    # mis-classified by the broader label.
    parent = inst.split(' ', 1)[0]

    if parent in LEGISLATIVE:
        return '입법'
    if any(k in parent for k in JUDICIAL_KWS):
        return '사법'
    if parent in CENTRAL_MINISTRIES:
        return '중앙부처'
    if any(k in parent for k in EDU_KWS):
        return '교육'
    # Local government detection: parent ends with broad local suffix
    for suf in ('특별시', '광역시', '특별자치시', '특별자치도'):
        if parent.endswith(suf):
            return '지자체'
    if re.search(r'(도|시|군|구|읍|면|동)(교육청|교육지원청|청|)$', parent):
        if not any(parent.startswith(m) for m in CENTRAL_MINISTRIES):
            return '지자체'
    if any(parent.endswith(k) for k in ('공단', '공사', '재단', '진흥원', '관리원',
                                         '연구원', '연구소')):
        return '공공기관'
    if parent.endswith('청') and parent not in CENTRAL_MINISTRIES:
        return '중앙부처'
    if parent.endswith(('부', '처', '위원회')) and parent not in CENTRAL_MINISTRIES:
        return '중앙부처'
    return '기타'


CATEGORY_ORDER = ['중앙부처', '지자체', '사법', '입법', '교육', '공공기관', '기타']


# ---------- filename ----------

def parse_filename(name: str):
    """Returns (serial, derived_publisher, display_title) or None.

    The "derived publisher" combines the gazette's broad publisher
    (filename position 2) with the sub-jurisdiction extracted from the
    title prefix when the issuing entity is a 기초자치단체. This produces
    labels like "강원도 화천군" instead of collapsing into "강원도".
    """
    m = FNAME_RE.match(name)
    if not m:
        return None
    serial, broad_publisher, rest_underscored = m.group(1), m.group(2), m.group(3)
    publisher = derive_publisher(broad_publisher, rest_underscored)
    title = rest_underscored.replace('_', ' ')
    return serial, publisher, title


# ---------- main ----------

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'dates').mkdir(parents=True, exist_ok=True)

    date_dirs = sorted(
        p for p in SRC.iterdir()
        if p.is_dir() and re.match(r'^\d{4}-\d{2}-\d{2}$', p.name)
    )

    date_counts: list[dict] = []
    institution_counter: Counter[str] = Counter()
    month_counts: dict[str, int] = defaultdict(int)
    all_titles: list[list] = []  # [date_idx, serial, inst_idx, title]
    sample_by_date: dict[str, list[dict]] = {}  # first 3 docs per date, for home recent view

    date_index: dict[str, int] = {}
    inst_index: dict[str, int] = {}

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

        # indexing for compact title search
        di = date_index.setdefault(date, len(date_index))
        for doc in docs:
            ii = inst_index.setdefault(doc['inst'], len(inst_index))
            all_titles.append([di, doc['n'], ii, doc['title'], doc['file']])

        date_counts.append({'date': date, 'count': len(docs)})
        sample_by_date[date] = [
            {'n': d['n'], 'inst': d['inst'], 'title': d['title'], 'file': d['file']}
            for d in docs[:3]
        ]
        total_docs += len(docs)
        month_counts[date[:7]] += len(docs)

        if min_date is None or date < min_date:
            min_date = date
        if max_date is None or date > max_date:
            max_date = date

        (OUT / 'dates' / f'{date}.json').write_text(
            json.dumps({'date': date, 'docs': docs}, ensure_ascii=False, separators=(',', ':')),
            encoding='utf-8',
        )

    # Institution list with classification
    institutions = []
    by_category: dict[str, list[dict]] = defaultdict(list)
    for name, cnt in sorted(institution_counter.items(), key=lambda kv: (-kv[1], kv[0])):
        cat = classify(name)
        entry = {'name': name, 'count': cnt, 'cat': cat}
        institutions.append(entry)
        by_category[cat].append(entry)

    # Institution tree payload
    inst_tree = []
    for cat in CATEGORY_ORDER:
        entries = by_category.get(cat, [])
        if not entries:
            continue
        inst_tree.append({
            'cat': cat,
            'count': sum(e['count'] for e in entries),
            'n_inst': len(entries),
            'items': entries,
        })

    # Year-month heatmap (sorted)
    heatmap = [{'ym': ym, 'count': month_counts[ym]} for ym in sorted(month_counts.keys())]

    # Recent samples: last 10 dates with top 3 doc titles each (for home view)
    recent_sorted = sorted(date_counts, key=lambda x: x['date'], reverse=True)[:10]
    recent_samples = [
        {'date': d['date'], 'count': d['count'], 'samples': sample_by_date.get(d['date'], [])}
        for d in recent_sorted
    ]

    meta = {
        'version': 'v7',
        'total_docs': total_docs,
        'date_range': [min_date, max_date],
        'date_count': len(date_counts),
        'institution_count': len(institutions),
        'dates': date_counts,
        'institutions': institutions,
        'institution_tree': inst_tree,
        'heatmap': heatmap,
        'recent_samples': recent_samples,
        'category_order': CATEGORY_ORDER,
        'raw_base': RAW_BASE,
        'blob_base': BLOB_BASE,
        'repo_url': 'https://github.com/hosungseo/ai-readable-gazette-kr',
    }
    (OUT / 'meta.json').write_text(
        json.dumps(meta, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    # Titles search index: compact list of [date_idx, serial, inst_idx, title, file]
    # Plus side arrays for date/inst reconstruction.
    date_list = sorted(date_index.keys(), key=lambda k: date_index[k])
    inst_list = sorted(inst_index.keys(), key=lambda k: inst_index[k])
    titles_payload = {
        'dates': date_list,
        'insts': inst_list,
        'docs': all_titles,  # [date_idx, serial, inst_idx, title, file]
    }
    (OUT / 'titles.json').write_text(
        json.dumps(titles_payload, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    print(f'[meta] {total_docs} docs, {len(date_counts)} dates, {len(institutions)} institutions')
    for cat in CATEGORY_ORDER:
        if by_category.get(cat):
            total = sum(e['count'] for e in by_category[cat])
            print(f'  {cat}: {len(by_category[cat])} inst / {total} docs')
    print(f'[out]  {OUT}')


if __name__ == '__main__':
    main()
