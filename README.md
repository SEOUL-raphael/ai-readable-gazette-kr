# ai-readable-gazette-kr

대한민국 관보를 Markdown으로 인덱싱하고, OCR에서 깨진 글자를 사전 기반으로 누적 보정한 **사람과 AI가 같이 읽을 수 있는 관보 파생 코퍼스**.

> **Live reader** → <https://hosungseo.github.io/ai-readable-gazette-kr/>

```
128,403 documents · 1,474 date groups · 1,426 institutions · 2020-01-02 → 2026-04-07
```

---

## 무엇인가

대한민국 관보는 PDF로만 제공된다. 이 저장소는 2020–2026 관보 약 13만 건을 Markdown으로 재인덱싱하고, OCR에서 깨진 글자를 사전 기반으로 누적 보정해 사람과 AI가 같이 읽을 수 있는 형태로 되돌려 놓는다.

원문을 지우거나 갈아엎지 않는다. 위에 파생 읽기 코퍼스만 쌓는 2단 구조다. 사전 누적 개선은 언제든 재빌드로 반영된다.

```
readable-final  (원본형, 건드리지 않음)
      │
      │  scripts/build_readable_corrected.py
      ▼
derived/readable-corrected  (단어 보정 파생본)
```

---

## 저장소 관계

| repo | 역할 |
|---|---|
| [`gov-gazette-md`](https://github.com/hosungseo/gov-gazette-md) | 원본형 관보 Markdown 코퍼스 (readable-final) |
| **`ai-readable-gazette-kr`** | 이 저장소. 사전 기반 보정 파생본 + 정적 리더 |
| [`ai-readable-government`](https://github.com/hosungseo/ai-readable-government) | press + gazette 통합 리더 |

원천은 `gov-gazette-md`, 이 저장소는 그 위에 한 겹 얹은 개선본, 통합 리더는 그 둘을 읽는다.

---

## 커버리지

- **기간**: 2020-01-02 → 2026-04-07
- **날짜 그룹**: 1,474
- **문서**: 128,403 (인덱스 기준) · 128,471 (원시 파일 기준)
- **기관**: 1,426

기관 분류 (참고):

| 카테고리 | 기관 수 | 문서 수 |
|---|---:|---:|
| 중앙부처 | 343 | 108,862 |
| 사법 | 73 | 7,716 |
| 지자체 | 78 | 2,774 |
| 입법 | 2 | 66 |
| 교육 | 551 | 4,113 |
| 공공기관 | 12 | 40 |
| 기타 | 367 | 4,832 |

---

## 리더 (GitHub Pages)

<https://hosungseo.github.io/ai-readable-gazette-kr/>

정적 HTML 리더. 빌드 툴 없이 바로 열린다.

- **Home**: 월별 밀도 히트맵, 최근 날짜, 기관 분류 트리
- **Browse**: 날짜 / 기관 / 제목 검색 탭, 문서 리스트, 인라인 리더
- **About**: 방법론, 보정 사전 v4~v7 내역, 원칙

본문은 `Noto Serif KR` 로 렌더, 메타·사이드바는 `Pretendard`, ID·버전은 `JetBrains Mono`. `prefers-color-scheme` 기반 다크 모드, `@media print` 로 본문만 출력 가능.

Pages는 별도 `gh-pages` 브랜치에서 서빙된다. 코퍼스 전량을 체크아웃하지 않으므로 빌드가 가볍다. raw md 본문은 실행 시점에 `raw.githubusercontent.com` 에서 fetch 된다.

---

## 보정 파이프라인

`scripts/build_readable_corrected.py` 한 파일이 전량을 처리한다. 평균 2–3분.

```
readable-final/YYYY-MM-DD/NNN_*.md
      │
      ▼
  1. COMMON_REPLACEMENTS          공통 어휘
  2. FINANCE_REPLACEMENTS         금융·기관명
  3. RELATION_REPLACEMENTS        관계어
  4. PLACE_REPLACEMENTS           지명
  5. LEGAL_REPLACEMENTS           법령·공직
  6. RESIDUAL_TOKEN_REPLACEMENTS  v1~v7 누적 compound
  7. cell_replacements            표 셀 단위
  8. token_patterns               regex
  9. focused_patterns             긴 구문 regex
 10. v3_patterns                  숫자+단위 regex
 11. single_char_final            전역 단일 문자
 12. ALL_REPLACEMENTS 2-pass      single char 후 재적용
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

### 검증된 regex 패턴

- `(\d{4})끄` → `\1년` — 연도 접미어 (약 40,000건)
- `(\d+(?:\.\d+)?)묀뢬미(퀰|만)` → `\1개월미만` — 개월 단위

### 진척도

| 단계 | 상태 |
|---|---|
| v1 ~ v3 | 재산공개형 반복 표현 보정 완료 |
| v4 ~ v7 | 상위 10개 고빈도 잔존 토큰 거의 전부 제거. HS 관세 외래어, 법령 상용구, 지명, 화학/폴리머/섬유 compound 대량 추가 |
| v7 시점 | 잔존 토큰 (threshold 100 기준) 786개, diminishing returns 진입 |

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
  residuals-v7-after.tsv        최신

docs/                           정적 리더 (소스 보관)
  index.html · style.css · app.js
  data/
    meta.json                   커버리지 · 기관 트리 · 월별 히트맵
    titles.json                 제목 검색 인덱스 (lazy load)
    dates/YYYY-MM-DD.json       날짜별 문서 리스트

derived/
  readable-corrected/           보정본 128,471개 (이 저장소의 본체)
    YYYY-MM-DD/NNN_*.md
```

Pages 서빙은 `gh-pages` 브랜치에서 이루어진다. `docs/` 내용이 그 브랜치 root에 배포된다.

---

## 사용법

### 코퍼스 재빌드

```bash
# readable-final 이 같은 프로젝트에 존재할 때
python3 scripts/build_readable_corrected.py
# → derived/readable-corrected/ 전량 재생성
```

### 잔존 토큰 스캔

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

### 검증 루프 (사전 확장 시)

1. `extract_residual_tokens.py` 로 상위 토큰 뽑기
2. `dump_char_contexts.py` 로 이웃 문자 분포 확인
3. `build_readable_corrected.py` 에 compound 또는 single_char 추가
4. 스모크 테스트 → 재빌드 → 재스캔으로 효과 검증

---

## 중요 정책

**한 글자 전역 치환은 이웃 분포 검증 후에만**.

과거 벀→모친, 릨→부친 무작정 전역 치환으로 "모친동산", "고지거모친" 같은 과보정 사고가 있었다. 현재는 1,000+ 샘플에서 단일 매핑 수렴 확인 + phrase 선행 등록으로 충돌을 방지한다. 검증되지 않은 짧은 치환은 모두 compound 단위로만 허용한다.

---

## 원칙

- source first
- readable second
- hype never
- trust over dashboard
- archive over campaign

---

## 라이선스

원천 관보는 대한민국 정부 공공데이터다. 보정 스크립트 및 파생 코퍼스는 공익 목적 재배포를 전제로 한다.
