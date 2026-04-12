# ai-readable-gazette-kr

대한민국 관보 약 13만 건을 Markdown 으로 인덱싱하고, OCR 에서 깨진 글자를 사전 기반으로 누적 보정한 **사람과 AI 가 같이 읽을 수 있는 관보 파생 코퍼스**.

> *AI-readable corrected corpus of the Korean government gazette (관보) — 128,403 documents, dictionary-based OCR fixup, static reader.*

> **Live reader** → <https://hosungseo.github.io/ai-readable-gazette-kr/>

> **Related writing** → [공공 투명성의 다음 단계는 AI-readable이다](https://open.substack.com/pub/gongpenclaw/p/ai-readable?r=7xa8nx&utm_medium=ios)
> **Threads profile** → <https://www.threads.com/@gongpenclaw?igshid=NTc4MTIwNjQ2YQ==>
>
> **주의**: 이 코퍼스는 관보 원본 PDF를 opendataloader OCR로 변환하고 추가 보정한 파생본입니다. 공식적으로 활용할 때에는 반드시 원본 PDF를 함께 확인해야 합니다.

```
128,403 documents · 1,474 date groups · 2020-01-02 → 2026-04-07 · dictionary v8
```

- **Code**: [MIT License](LICENSE)
- **Gazette data**: 저작권법 제7조에 따라 보호받지 못하는 저작물 · 자유 이용 — see [NOTICE.md](NOTICE.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

## 무엇인가

관보는 이미 공개되어 있다. 정부 공공데이터 포털에서 PDF 로 내려받을 수 있고, 원문 검열도 없다. 그러나 사람이 눈으로 읽는 것과 기계가 다루는 것 사이에는 여전히 큰 간극이 있다. 조문 단위 비교가 어렵고, 기관·날짜·사건 단위 필터가 어렵고, OCR 은 깨져 있고, 표 구조는 훼손되어 있다. 그래서 연구자·기자·개발자·시민단체·공무원은 같은 관보를 각자 다시 파싱하고 다시 정제하는 전처리 비용을 반복해서 부담한다.

이 저장소는 그 반복 비용을 한 번에 줄이려는 시도다. 2020–2026 관보 약 13만 건을 Markdown 으로 재인덱싱하고, OCR 에서 깨진 글자를 사전 기반으로 누적 보정해서, 사람과 기계가 같이 읽을 수 있는 형태로 되돌려 놓는다. 목표는 "무엇을 더 공개할 것인가"가 아니라 "이미 공개된 것을 어떻게 하면 실제로 활용할 수 있게 만들 것인가"에 가깝다.

인간이 읽기 좋은 화면은 그 위에서 얼마든지 다양하게 만들 수 있다. 어떤 도구는 학생에게, 어떤 도구는 기자에게, 어떤 에이전트는 공무원에게 맞춰 조문을 비교하고 요약하고 연결할 것이다. 이 저장소는 그 화면들이 공통으로 딛고 설 수 있는 아래층, 구조화된 공공 자산 한 조각이다.

원문을 지우거나 갈아엎지 않는다. 위에 파생 읽기 코퍼스만 쌓는 2단 구조다. 사전 누적 개선은 언제든 재빌드로 반영된다.

---

## 출처

- **원천**: 대한민국 행정안전부 [전자관보 (gwanbo.go.kr)](http://gwanbo.go.kr) — PDF 공공데이터
- **변환**: PDF → opendataloader OCR → readable-final markdown → 사전 기반 보정 → `derived/readable-corrected/`
- **산출**: 이 저장소 + GitHub Pages 정적 리더

원천 관보는 대한민국 저작권법 제7조에 따라 **보호받지 못하는 저작물**이다 (별도 이용허락 없이 자유 이용 가능). 이 저장소의 보정 파생본도 가능한 범위에서 공공 도메인에 헌납한다 (CC0 1.0 수준). 자세한 근거는 [NOTICE.md](NOTICE.md) 참조.

---

## 커버리지

- **기간**: 2020-01-02 → 2026-04-07
- **날짜 그룹**: 1,474
- **문서**: 128,403
- **기관**: ~1,600 (광역+기초자치단체 분리 후)

기관 분류 (참고):

| 카테고리 | 기관 수 | 문서 수 |
|---|---:|---:|
| 중앙부처 | ~340 | ~108,800 |
| 사법 | ~70 | ~7,700 |
| 교육 | ~550 | ~4,100 |
| 기타 | ~370 | ~4,800 |
| 지자체 | ~290 (광역+기초) | ~3,300 |
| 입법 | 2 | 66 |
| 공공기관 | 12 | 40 |

> 정확한 수치는 `docs/data/meta.json` 또는 라이브 리더에서 확인 가능.

---

## 라이브 리더 (GitHub Pages)

<https://hosungseo.github.io/ai-readable-gazette-kr/>

정적 HTML 리더. 빌드 툴 없이 바로 열린다.

- **Home**: 월별 밀도 히트맵, 최근 날짜 + 샘플 제목, 기관 분류 트리, 5개 큐레이션 엔트리 포인트
- **Browse**: 날짜 / 기관 / 제목 검색 탭, 연도 점프, 카테고리 필터, 문서 타입 배지, 인라인 리더 + 자동 TOC
- **Reader**: prev/next 네비, copy permalink, 대용량 가드, DOMPurify 로 sanitize 된 markdown 렌더
- **About**: 방법론, 보정 사전 v4~v8 내역, 원칙
- **키보드 단축키**: `/ Esc j k Enter ? g h g b g a` — `?` 키로 도움말

본문은 `Noto Serif KR` 로 렌더, 메타·사이드바는 `Pretendard`, ID·버전은 `JetBrains Mono`. `prefers-color-scheme` 기반 다크 모드, `@media print` 로 본문만 출력 가능. 모바일 터치 타깃 iOS HIG 준수.

Pages 는 별도 `gh-pages` 브랜치에서 서빙된다. 코퍼스 전량(2.4GB)을 체크아웃하지 않으므로 빌드가 가볍다. raw md 본문은 실행 시점에 `raw.githubusercontent.com` 에서 fetch 된다.

---

## 써먹는 법

### 1. 그냥 읽기 (사람)

라이브 리더 열기 → Home 에서 Start Here 5 카드 중 하나 클릭 → 문서 리스트 → 클릭. 본문이 인라인으로 렌더된다.

### 2. 다운스트림 LLM / NLP

`derived/readable-corrected/YYYY-MM-DD/NNN_<기관>_<제목>.md` 패턴으로 정렬되어 있다. frontmatter 에 `title / publisher / date / source_raw_md` 가 들어 있다. 그대로 chunk 해서 임베딩 / RAG 인덱싱 가능.

```python
from pathlib import Path
import re

ROOT = Path('derived/readable-corrected')
fm_re = re.compile(r'^---\n(.*?)\n---\n', re.DOTALL)

for md in ROOT.rglob('*.md'):
    text = md.read_text(encoding='utf-8')
    fm_match = fm_re.match(text)
    body = text[fm_match.end():] if fm_match else text
    yield {
        'date': md.parent.name,
        'inst': md.name.split('_')[1],
        'body': body,
    }
```

### 3. 정적 인덱스 API (브라우저 / 외부 사이트)

`docs/data/meta.json` (기관/날짜/카테고리/히트맵), `docs/data/dates/YYYY-MM-DD.json` (날짜별 문서 목록), `docs/data/titles.json` (검색 인덱스) 가 모두 정적 JSON 이다. CORS 제한 없이 fetch 가능.

```js
fetch('https://hosungseo.github.io/ai-readable-gazette-kr/data/meta.json')
  .then(r => r.json())
  .then(meta => console.log(meta.total_docs, meta.date_range));
```

### 4. 원문 PDF 추적

각 md 의 frontmatter `source_raw_md` 가 [전자관보](http://gwanbo.go.kr) 의 원본 PDF 식별자와 연결된다. 본문 상단 `# 제목` 아래 `원문 PDF: <URL>` 라인이 있는 경우 직접 클릭 가능.

---

## 보정 파이프라인

`scripts/build_readable_corrected.py` 한 파일이 전량을 처리한다. 평균 2–3분.

```
readable-final/YYYY-MM-DD/NNN_*.md
      │
      ▼
  0. 깨진 이미지 링크 마커화 (v8)
  1. COMMON_REPLACEMENTS      공통 어휘
  2. FINANCE_REPLACEMENTS     금융·기관명
  3. RELATION_REPLACEMENTS    관계어
  4. PLACE_REPLACEMENTS       지명
  5. LEGAL_REPLACEMENTS       법령·공직
  6. RESIDUAL_TOKEN_REPLACEMENTS  v1~v8 누적 compound
  7. cell_replacements        표 셀 단위
  8. token_patterns           regex
  9. focused_patterns         긴 구문 regex
 10. v3_patterns              숫자+단위 regex (연도, 개월)
 11. single_char_final        전역 단일 문자 치환 (검증 후)
 12. ALL_REPLACEMENTS pass 2  single char 후 재적용
      │
      ▼
derived/readable-corrected/YYYY-MM-DD/NNN_*.md
```

### 검증된 전역 단일 문자 치환 (v4 ~ v7)

이웃 문자 분포를 샘플 스캔으로 확인한 뒤에만 단일 문자 치환을 추가한다. 충돌하는 phrase 규칙은 `COMMON_REPLACEMENTS` 등 선행 사전에 등록해 2-pass 파이프라인이 순서를 보장한다.

| 버전 | 매핑 | 근거 |
|---|---|---|
| v4 | 옄→위, 뮈→번, 픸→호 | 이웃 분포 단일 매핑 수렴 |
| v5 | 왴→이, 앀→외, 솤→스, 큌→테, 롴→르, 퐄→프 | 외래어·조사 일관 |
| v6 | 뵄→비 | 뵄고·설비 계열 |
| v7 | 죁→직 | 직업·직물 계열 |

### v8 추가 (2026-04-12)

- 깨진 이미지 링크 ~3M 개를 `*[원본 이미지 N]*` 마커로 치환
- 보정 산출물에서 사라진 source 파일 prune (full build 시)
- 광역+기초 자치단체 결합 라벨 (`강원도 화천군` 등) — 인덱스 빌드 단계에서 적용

### 검증된 regex 패턴

- `(\d{4})끄` → `\1년` — 연도 접미어 (약 40,000건)
- `(\d+(?:\.\d+)?)묀뢬미(퀰|만)` → `\1개월미만` — 개월 단위

### 진척도

| 단계 | 상태 |
|---|---|
| v1 ~ v3 | 재산공개형 반복 표현 보정 완료 |
| v4 ~ v7 | 상위 10개 고빈도 잔존 토큰 거의 전부 제거. HS 관세 외래어, 법령 상용구, 지명, 화학/폴리머/섬유 compound 대량 추가 |
| v7 시점 | 잔존 토큰 (threshold 100 기준) 786개, diminishing returns |
| v8 | 이미지 마커, 광역+기초 분리, prune, XSS 보호 추가 |

---

## 디렉토리

```
scripts/
  build_readable_corrected.py   메인 보정 스크립트
  extract_residual_tokens.py    잔존 깨진 토큰 frequency 추출기
  dump_char_contexts.py         단일 문자 이웃 분포 분석
  analyze_char_ambiguity.py     매핑 모호성 분석
  build_pages_index.py          Pages 리더용 인덱스 JSON 빌더

reports/
  residuals-v4.tsv              초기 스캔
  residuals-v4-after.tsv        v4 빌드 후 스캔
  residuals-v5.tsv
  residuals-v5-after.tsv
  residuals-v6-after.tsv
  residuals-v7-after.tsv        v7 시점

docs/                           정적 리더 (소스 보관)
  index.html · style.css · app.js
  data/
    meta.json                   커버리지 · 기관 트리 · 월별 히트맵
    titles.json                 제목 검색 인덱스 (lazy load)
    dates/YYYY-MM-DD.json       날짜별 문서 리스트

derived/
  readable-corrected/           보정본 128,403개 (이 저장소의 본체)
    YYYY-MM-DD/NNN_*.md
```

Pages 서빙은 `gh-pages` 브랜치에서 이루어지며, `.github/workflows/sync-pages.yml` 워크플로우가 main 의 `docs/**` 변경을 자동으로 동기화한다.

---

## 재현 가능성 / 자체 완결성

이 저장소는 빌드 산출물(`derived/readable-corrected/`)을 그대로 포함한다. 따라서:

- **그냥 사용**: clone 후 라이브 리더 열기 또는 `derived/readable-corrected/*.md` 직접 사용. 추가 빌드 불필요.
- **사전 확장 후 재빌드**: `readable-final/` 를 로컬에 두고 `python3 scripts/build_readable_corrected.py` 실행. `--src` 또는 `$GAZETTE_SRC` 환경변수로 경로 지정 가능.
- **원천 PDF 부터 시작**: 행정안전부 [전자관보](http://gwanbo.go.kr) 에서 PDF 받아 OCR(opendataloader 등) → markdown → 이 저장소의 보정 스크립트 통과.

원천 PDF 가 정부 공공데이터이고 보정 스크립트가 MIT 공개이므로, 누구든 처음부터 동일한 결과를 만들 수 있다. **외부 비공개 의존성 없음**.

---

## 사용법

### 코퍼스 재빌드

```bash
# 옵션 1: --src 인자
python3 scripts/build_readable_corrected.py --src /path/to/readable-final

# 옵션 2: 환경변수
GAZETTE_SRC=/path/to/readable-final python3 scripts/build_readable_corrected.py

# 옵션 3: <repo>/readable-final/ 에 두고 인자 없이
python3 scripts/build_readable_corrected.py
```

전량 약 2~3분 (Mac mini M4 기준).

### 잔존 토큰 스캔 (사전 확장 시)

```bash
python3 scripts/extract_residual_tokens.py \
  --top 200 --min-count 100 \
  --out reports/residuals-vN.tsv
```

### Pages 인덱스 재생성

```bash
python3 scripts/build_pages_index.py
# → docs/data/meta.json, dates/*.json, titles.json
```

---

## 기여

사전 확장 기여는 다음 루프를 따른다.

1. `extract_residual_tokens.py` 로 상위 잔존 토큰 뽑기
2. `dump_char_contexts.py` 로 단일 문자 이웃 분포 검증
3. `build_readable_corrected.py` 에 compound 또는 single_char 추가
4. 작은 단위로 `fix_text` 스모크 테스트 → 전체 재빌드 → 재스캔
5. `CHANGELOG.md` 에 항목 추가
6. PR

**중요 정책**: 한 글자 전역 치환은 **이웃 분포 검증 후에만**. 과거 무작정 전역 치환으로 "모친동산", "고지거모친" 같은 과보정 사고가 있었다. 현재는 1,000+ 샘플에서 단일 매핑 수렴 확인 + phrase 선행 등록으로 충돌을 방지한다. 검증되지 않은 짧은 치환은 모두 compound 단위로만 허용한다.

---

## 원칙

- source first
- readable second
- hype never
- trust over dashboard
- archive over campaign

---

## 라이선스

- **코드** (scripts, docs/\*.html|css|js, 워크플로우, 설정 파일): [MIT License](LICENSE)
- **데이터** (`derived/readable-corrected/`): 원천 관보는 대한민국 저작권법 제7조에 따라 보호받지 못하는 저작물이며 자유 이용이 가능합니다. 이 저장소의 파생 코퍼스는 추가 권리 주장을 최소화하기 위해 공공 도메인에 헌납하는 것을 선언합니다 (CC0 1.0 수준).
- 자세한 근거와 출처 표시 권장 문구는 [NOTICE.md](NOTICE.md) 참조
