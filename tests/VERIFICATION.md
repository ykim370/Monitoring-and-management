# Version 2 verification

- 19 automated API, normalization and signal tests passed (`npm test`).
- 9 browser scenario groups passed (`npm run test:browser`); see `verification-results.json`.
- Browser tests use explicit provider-shaped test fixtures, not production data, to make edge conditions repeatable.
- Desktop (1512px), mobile (390px) and tablet (768px) inspected; no horizontal page overflow.
- Browser checks cover async loading, empty initial holdings, local persistence, horizon recalculation, financial tabs, missing guidance, common-date comparisons, searches, and missing-key failure without synthetic fallback.
- Live adapter smoke check: AVGO prices, revenue and analyst estimates each returned HTTP 200; 260 price bars, 8 quarterly revenue observations and 42 analyst estimate observations normalized successfully. Price as-of date: 2026-09-18.
- No API key is bundled into browser files, returned in responses or committed. Live-data snapshots and screenshots remain outside Git in ignored artifacts.

This validates the software and data connection, not predictive performance or CFD execution. The dashboard does not connect to a broker or place trades.

Full live browser run: all 24 price histories loaded, 23 symbols had usable revenue, both 10-stock ranking lists rendered, and there were zero browser JavaScript errors. AMZN's latest quarterly report returned `reportedCurrency: None`; its revenue signal and ranking eligibility were correctly excluded rather than assuming USD. Its real price chart remains available. Live snapshot files are not committed.
