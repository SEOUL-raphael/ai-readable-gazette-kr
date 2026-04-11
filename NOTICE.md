# NOTICE — Data provenance and terms

This repository contains two layers with different legal status:

1. **Source code** (`scripts/`, `docs/*.html|css|js`, workflows, config) — MIT Licensed. See [LICENSE](LICENSE).
2. **Gazette corpus and derived index** (`derived/readable-corrected/`, `docs/data/`) — public records; see below.

## 원천 관보 (Source gazette content)

이 저장소의 `derived/readable-corrected/` 폴더에 포함된 관보 본문은 대한민국 정부가 발간하는 **대한민국 전자관보**를 원천으로 하는 파생물입니다. 원천 본문의 저작권 정책은 다음과 같습니다.

> 전자관보 홈페이지에서 제공하는 전자관보는 **저작권법 제7조(보호받지 못하는 저작물)** 에 해당하는 저작물로서 별도의 이용허락 없이 누구나 자유이용이 가능합니다.
>
> — 행정안전부 전자관보 홈페이지 저작권 정책

즉 원천 관보는 저작권법 제7조에 따라 **보호받지 못하는 저작물**이므로, 별도의 라이선스 부여 없이 자유롭게 열람·복제·재배포·변형이 가능합니다.

## 파생본에 대한 권리 선언 (Derivative work dedication)

이 저장소의 파생 코퍼스 `derived/readable-corrected/` 는 원천 관보 md에 사전 기반 보정(OCR 복원, 단어 치환)을 적용한 결과물입니다. 파생 작업의 성격은 비창작적이며(오타 교정), 저작권 보호를 기대할 수 있는 창작적 기여가 크지 않지만, **추가적인 권리 주장을 최소화하기 위해** 이 저장소의 유지 관리자는 파생본 전체에 대해 가능한 범위에서 **공공 도메인에 헌납(public domain dedication)** 하는 것을 선언합니다.

실무적으로 이는 CC0 1.0 Universal Public Domain Dedication 에 준하는 효력을 의도합니다 (<https://creativecommons.org/publicdomain/zero/1.0/>).

## 출처 표시 권장 (Attribution requested, not required)

법적 의무는 아니지만, 원천 정책의 관행(행정안전부 전자관보 출처 표시)을 따라 다음과 같은 형태의 출처 표시를 권장합니다.

> 본 저작물은 행정안전부 대한민국 전자관보 (<http://gwanbo.go.kr>)에서 제공하는 관보를 원천으로 하며, `hosungseo/ai-readable-gazette-kr` 저장소의 OCR 보정 파생 코퍼스를 이용하였습니다.

## Summary (English)

- **Source gazette text**: Not protected under Korean Copyright Act Article 7 (unprotected works). Freely usable without license.
- **Corrected derivative corpus**: The maintainer of this repository dedicates the derivative work to the public domain, equivalent to CC0 1.0, to maximize downstream reuse.
- **Attribution**: Not legally required but practically recommended. Please credit the Korean Ministry of the Interior and Safety's Electronic Gazette (<http://gwanbo.go.kr>) as the original source, and optionally cite this repository for the correction pipeline.
- **Repository code**: Licensed under MIT. See [LICENSE](LICENSE).

## No warranty

The data is provided AS IS. OCR correction is best-effort and may contain
errors. See `scripts/build_readable_corrected.py` and `reports/residuals-*.tsv`
for the current state of the correction dictionary. Do not rely on this
derived corpus for legally binding work without verifying against the
canonical source at <http://gwanbo.go.kr>.
