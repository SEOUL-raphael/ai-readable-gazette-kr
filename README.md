# ai-readable-gazette-kr

대한민국 관보 PDF를 OCR로 변환한 뒤 사전 기반으로 OCR 깨진 글자를 보정한 **사람/AI 양쪽이 읽기 쉬운 관보 파생 코퍼스**.

## 관계

- **원천 코퍼스**: [`hosungseo/gov-gazette-md`](https://github.com/hosungseo/gov-gazette-md) 의 `readable-final/`
- **이 저장소**: `gov-gazette-md/readable-final/` → 보정 파이프라인 → `derived/readable-corrected/`
- **리더**: [`hosungseo/ai-readable-government`](https://github.com/hosungseo/ai-readable-government) 이 양쪽 저장소를 통합해서 제공

## 2단 구조 원칙

```
readable-final  (원본형, 건드리지 않음)
      │
      │  build_readable_corrected.py
      ▼
derived/readable-corrected  (단어 보정형 파생본)
```

원문을 지우거나 갈아엎지 않고, 위에 파생 읽기 코퍼스만 쌓는다. 사전 누적 개선은 언제든 재빌드로 반영된다.

## 범위

- **기간**: 2020-01-02 ~ 2026-04-07 (1,475개 날짜 폴더)
- **문서 수**: 128,471개 관보 md 전량 보정

## 파이프라인

```
readable-final/YYYY-MM-DD/NNN_*.md
      │
      ▼
scripts/build_readable_corrected.py
      │   1. COMMON_REPLACEMENTS    (공통 어휘)
      │   2. FINANCE_REPLACEMENTS   (금융·기관명)
      │   3. RELATION_REPLACEMENTS  (관계어)
      │   4. PLACE_REPLACEMENTS     (지명)
      │   5. LEGAL_REPLACEMENTS     (법령·공직)
      │   6. RESIDUAL_TOKEN_REPLACEMENTS  (v1~v7 누적 compound)
      │   7. cell_replacements      (표 셀 단위)
      │   8. token_patterns         (regex)
      │   9. focused_patterns       (긴 구문 regex)
      │  10. v3_patterns            (숫자+단위 regex)
      │  11. single_char_final      (전역 단일 문자)
      │  12. ALL_REPLACEMENTS 2-pass (single char 후 재적용)
      ▼
derived/readable-corrected/YYYY-MM-DD/NNN_*.md
```

## 검증된 전역 단일 문자 치환 (v4~v7)

이웃 문자 분포를 샘플 스캔으로 검증한 후에만 전역 치환 추가. 충돌되는 phrase 규칙은 `COMMON_REPLACEMENTS` 등에 선행 등록하여 2-pass 파이프라인이 순서를 보장한다.

| 버전 | 매핑 | 근거 |
|---|---|---|
| v4 | 옄→위, 뮈→번, 픸→호 | 이웃 분포 단일 매핑 수렴 |
| v5 | 왴→이, 앀→외, 솤→스, 큌→테, 롴→르, 퐄→프 | 외래어·입자 일관 |
| v6 | 뵄→비 | 뵄고·설비 계열 |
| v7 | 죁→직 | 직업·직물 계열 |

## 검증된 regex 패턴

- `(\d{4})끄` → `\1년` — 연도 접미어 (~40,000건 해결)
- `(\d+(?:\.\d+)?)묀뢬미(퀰|만)` → `\1개월미만` — 개월 단위

## 진척

- **v3까지**: 재산공개형 반복 표현 보정 완료
- **v4~v7**: 상위 10개 고빈도 잔존 토큰이 거의 전부 제거됨. HS 관세 외래어, 법령 상용구, 지명, 화학/폴리머/섬유 compound 대량 추가
- **v7 완료 시점**: 잔존 토큰 (threshold 100) 786개, diminishing returns 진입

## 디렉토리

```
scripts/
  build_readable_corrected.py   메인 보정 스크립트 (사전+regex+single_char)
  extract_residual_tokens.py    잔존 깨진 토큰 frequency 추출기
  dump_char_contexts.py         단일 문자 이웃 분포 분석
  analyze_char_ambiguity.py     매핑 모호성 분석

reports/
  residuals-v4.tsv              v4 스캔 결과
  residuals-v4-after.tsv        v4 빌드 후 스캔
  residuals-v5.tsv              v5 스캔
  residuals-v5-after.tsv
  residuals-v6-after.tsv
  residuals-v7-after.tsv        최신

derived/
  readable-corrected/           보정본 128,471개 (이 저장소의 본체)
    YYYY-MM-DD/NNN_*.md
```

## 사용법

### 재빌드 (원천 저장소가 업데이트되면)

```bash
# gov-gazette-md의 readable-final을 로컬에 두고
cd gov-gazette-md
python3 scripts/build_readable_corrected.py
# derived/readable-corrected/ 에 전량 재생성 (약 2~3분)
```

### 잔존 토큰 스캔

```bash
python3 scripts/extract_residual_tokens.py \
  --top 200 --min-count 100 \
  --out reports/residuals-vN.tsv
```

### 검증 루프

1. `extract_residual_tokens.py` 로 상위 토큰 뽑기
2. `dump_char_contexts.py` 로 이웃 문자 분포 확인
3. `build_readable_corrected.py` 에 compound 또는 single_char 추가
4. 스모크 테스트 → 재빌드 → 재스캔으로 효과 검증

## 중요 정책

**한 글자 전역 치환은 이웃 분포 검증 후에만**. 과거 벀→모친, 릨→부친 무작정 전역 치환으로 "모친동산", "고지거모친" 같은 과보정 사고가 있었다. 현재는 1000+ 샘플에서 단일 매핑 수렴 확인 + phrase 선행 등록으로 충돌 방지.

## 라이선스

원천 관보는 대한민국 정부 공공데이터. 보정 스크립트 및 파생 코퍼스는 공익 목적 재배포를 전제로 함.
