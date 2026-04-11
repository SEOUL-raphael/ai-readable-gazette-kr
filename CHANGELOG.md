# CHANGELOG

All notable changes to the correction dictionary (`scripts/build_readable_corrected.py`)
and the derived corpus (`derived/readable-corrected/`).

Format follows Keep-a-Changelog (<https://keepachangelog.com/>), though entries
are coarse and grouped by dictionary version rather than strict semver.

## [v7] — 2026-04-11

Last round. Hit diminishing returns — most top residual tokens below threshold
100 are ambiguous or require per-domain expert review.

### Added

- **Global single-char**: `죁 → 직` (39 neighbors, 100% consistent across
  퇴직/순직/직업/직인/직접/직종/직위 compounds)
- **Compound**: `릩욬 → 목재`, `뮕원 → 법원`, `대뮕원 → 대법원`,
  `뮕원및헌재 → 법원 및 헌재`, `피묩표 → 피복한`, `피묩된 → 피복된`,
  `피묩 → 피복`, `국묩거사시설용지 → 국방 군사시설용지`,
  `국묩거사시설 → 국방 군사시설`, `틉죁물 → 평직물`, `죁물 → 직물`,
  `죁물로 → 직물로`, `며왼띠이며 → 나일론이며`, `며왼띠 → 나일론`, `륔틸 → 메틸`
- **Compound (v5 residue fix)**: `스테이퐌자료의 → 스테이플 재료의` and variants
  (HS code 쀬옠=재료 context)

### Post-v7 residuals (above threshold 100)

786 distinct tokens. Remaining hard cases: `괰계 (2769)`, `묘닄체 (2663)`,
`삌찝 (2547)`, `옠뢬 (1264)`, `번섘 (1067)`, `묩뮕으로 (1029)`, `뮕원 (1010)`.
These are ambiguous or require domain-specific lexicon to resolve.

## [v6] — 2026-04-11

### Added

- **Global single-char**: `뵄 → 비` (578 neighbors, 뵄고/뵄상/뵄생/뵄스/뵄서/뵄외
  consistently → 비 suffix; 설뵄/한뵄/회뵄/원뵄 → 비 prefix)
- **Compound**: `뵄금속 → 비금속`, `묀양시 → 밀양시` (경상남도 밀양시 지명),
  `묀양시청 → 밀양시청`, `닄포표 → 도포한` (HS tariff coated paper),
  `닄포된 → 도포된`, `닄포 → 도포`
- **Regression fix**: `스테이퐌자료*` — HS code context requires 쀬옠=재료
  (not 자료), so post-v5 compound fix emitted

## [v5] — 2026-04-11

Biggest single-round gain. Introduced six verified global single-char
substitutions covering loanwords (polymer/plastic/pharma/units) and
Korean particles.

### Added

- **Global single-char**: `왴 → 이` (subject particle, 1961 neighbors),
  `앀 → 외` (177 neighbors), `솤 → 스` (649), `큌 → 테` (94),
  `롴 → 르` (106), `퐄 → 프` (5806 — biggest single-char win)
- **Compound (loanwords)**: 뵄쿀민→비타민, 퐄로뵄쿀민→프로비타민,
  옠닄체→유기체, 핔옠닄체→화유기체, 폴뢬에솤큌롴→폴리에스테르,
  에솤큌롴→에스테르, 퐌라솤틱→플라스틱, 데시큍솤→데시벨,
  륔가파솤쵼→메가파스칼, 초뾰쁀룰로오솤→니트로셀룰로오스
- **Compound (regulations)**: 묀폐용괰→개폐용기, 처뢬→처리 (+ 처리하지/
  처리한/처리된/처리되 variants), 기술가뢬뮕→기술규범, 핔푙적으로→화학적으로,
  묩죁용→포장용, 행정쀬옠로→행정자료로, 외조쀬옠로→외조자료로,
  쀬옠로→자료로, 쀬옠의→자료의, 여쀱왴므로→여성이므로, 여쀱→여성,
  식물쀱→식물성, 갑물쀱→광물성, 므쀱→모성, 구쀱→구성 (+ 구성하는/
  구성되/구성된), 염섘장표→염수장한

### Dictionary update tooling

- `extract_residual_tokens.py` — `SAFE_HANGUL_OVERRIDE` expanded with 피/버
  to suppress false positives introduced by v4 compound additions
  (피고인/피해자/피의자/오피스텔/컨버터 were spuriously flagged)

## [v4] — 2026-04-11

First large-scale expansion round. Top 10 high-frequency residuals eliminated.

### Added

- **Global single-char**: `옄 → 위` (preserves 관옄→관장 via pre-registered
  phrase rule in COMMON_REPLACEMENTS), `뮈 → 번`, `픸 → 호`
- **Regex**: `(\d{4})끄 → \1년` — year suffix, ~40,000 occurrences cleaned
  in one rule
- **Regex**: `(\d+(?:\.\d+)?)묀뢬미(퀰|만) → \1개월미만`
- **Compound (residual cleanup)**: 뷀많 품목번호·유기체·적합한·결합되·
  부동산 compound 계열, 수청동 (당진시 수청동), 포유동물, 식품위생법,
  방위사업청, 고위공무원, 중위, 대위, 구분지상권, 화합물 (핔푩물/피푩물),
  폴리아미드, 기타이자수입, 상위/순위/학위/허위 (등 옄→위 compound 보강)

## [v3 and earlier] — 2026-04 (pre-session history)

v1–v3 covered the baseline dictionary:

- Common vocabulary (COMMON_REPLACEMENTS): 왘→의, 묏→및, 건먼→건물, 아툌트→아파트
- Finance/bank names (FINANCE_REPLACEMENTS): 걭민와행→국민은행,
  한걭카카씤은행(주)→한국카카오은행(주), 걐보생릅보험→교보생명보험
- Relation terms (RELATION_REPLACEMENTS): 본외→본인, 묰우욐→배우자,
  욥남→장남, 욥끀→장녀
- Place names (PLACE_REPLACEMENTS): 쀜빙고동→서빙고동, 얩외시→용인시,
  쀸입특별욐쵘시→세종특별자치시
- Legal/civil-service (LEGAL_REPLACEMENTS)
- Wealth-disclosure table headers: (단옄:천원)→(단위:천원), (삌계)→(합계),
  묰괰량→배기량
- Turning point: a variable-length lookbehind regex error was causing
  `fix_text()` to silently fail mid-pipeline. Fixed by rewriting the
  lookbehind to an explicit pattern. Lesson: suspect script/regex errors
  before "dictionary insufficient" hypotheses.

## Correction pipeline structure

```
readable-final/YYYY-MM-DD/NNN_*.md
      │
      ▼
  1. COMMON_REPLACEMENTS      phrase pass 1
  2. FINANCE_REPLACEMENTS
  3. RELATION_REPLACEMENTS
  4. PLACE_REPLACEMENTS
  5. LEGAL_REPLACEMENTS
  6. RESIDUAL_TOKEN_REPLACEMENTS  (v1~v7 accumulated compounds)
  7. cell_replacements        table-cell safe substitutions
  8. token_patterns           regex
  9. focused_patterns         long-phrase regex
 10. v3_patterns              numeric+unit regex (year suffix, 개월미만)
 11. single_char_final        global single-char (v4~v7 validated)
 12. ALL_REPLACEMENTS         phrase pass 2 (compounds that only surface
                               after single-char runs, e.g. 옄쵘→옄치→위치)
      │
      ▼
derived/readable-corrected/YYYY-MM-DD/NNN_*.md
```

## Validation loop

Each dictionary extension follows the same loop:

1. `scripts/extract_residual_tokens.py` — extract high-frequency broken tokens
2. `scripts/dump_char_contexts.py` — inspect neighbor distribution for candidate
   single-char substitutions
3. Edit `scripts/build_readable_corrected.py` — add compound or single-char
4. Smoke-test with fix_text against a curated set
5. Rebuild the full 128,403-file corpus (~2–3 min)
6. Re-scan to confirm reduction in target tokens

## Repository housekeeping

### 2026-04-12

- **Removed**: `derived/readable-corrected/day-2026-04-01/` (68 duplicate
  files differing only in `source_raw_md` frontmatter path). Unique file
  count is now a single 128,403 (matches index).
- **Added**: LICENSE (MIT for code), NOTICE.md (data provenance and public
  domain dedication), CHANGELOG.md, .gitattributes (linguist +
  line-ending normalization), .editorconfig, SECURITY.md
- **Added**: `.github/workflows/sync-pages.yml` — auto-sync `docs/` on
  main → gh-pages branch for GitHub Pages
- **Pinned**: marked.js CDN version (`marked@12.0.2`)
- **Fixed**: `build_readable_corrected.py` file permissions to 644
- **Pages**: moved from `main/docs` source to `gh-pages` orphan branch
  (main had Korean long-filename checkout failures on the Pages runner)
