# Security policy

This repository hosts a derived public-records corpus and a static reader.
It has no runtime surface area, no user accounts, no secrets, and no server.
Nonetheless, there are a few classes of issue that would be worth reporting.

## Reporting

Please report the following via GitHub Issues or private email to the
repository maintainer (hosung.seo2026@gmail.com):

- **Content integrity** — a gazette file in `derived/readable-corrected/`
  that diverges from the canonical source at <http://gwanbo.go.kr> in
  ways that could mislead a reader (not OCR artifacts, but structural
  corruption or wrong attribution of institution/date).
- **Correction pipeline bug** — a replacement rule in
  `scripts/build_readable_corrected.py` that produces over-correction in
  real documents (e.g. a valid Korean word being replaced with a wrong
  target).
- **Static reader vulnerability** — any client-side issue in
  `docs/index.html`, `docs/app.js`, `docs/style.css` that could allow
  XSS, link hijacking, or cross-origin data leakage.
- **Dependency supply chain** — the reader loads marked.js and Pretendard
  from jsDelivr, and Noto Serif KR from Google Fonts. If a CDN serves
  compromised content, please report it so the version pin can be rotated.

## Non-issues

- **OCR artifacts** — the source gazette was OCR'd upstream and may
  contain broken syllables. The correction dictionary is a best-effort
  recovery. File an issue with a specific token if you want it added
  to the dictionary (see `CONTRIBUTING.md` for the validation loop).
- **Missing documents** — this corpus covers a specific date range
  (see README). For documents outside the range, use the source at
  <http://gwanbo.go.kr> directly.
- **Gazette content itself** — the gazette reports official acts. Concerns
  about the acts themselves should be directed to the relevant government
  agency, not this repository.

## No runtime secrets

This repository does not accept or store secrets. If a secret is ever
committed, please do not include it in a public issue — email the
maintainer directly.
