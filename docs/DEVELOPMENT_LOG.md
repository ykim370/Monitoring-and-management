# Development record

## Version 1 — synthetic prototype

Defined the interface and transparent swing score; implemented deterministic synthetic OHLCV, revenue and management guidance examples. Built holdings, candidate rankings, candles, pivot trendlines, fundamental tabs and normalized comparisons. Validated with nine calculation tests and ten browser checks. Deployed owner-private on Sites. This stage did not establish predictive performance.

## Version 2 — real Alpha Vantage integration

Verified the premium key against Daily Adjusted prices, Income Statement and Earnings Estimates endpoints. Added a shared server adapter used by local Node and a deployable Worker. Kept credentials in environment variables and configured the production value as a secret.

Removed synthetic market data and default demo holdings from the production bundle. Added split adjustment, fiscal-date and currency validation, missing-data handling, partial-load progress, per-process pacing, internal caching and safe provider errors. Real management guidance is unavailable in the selected API endpoints, so that factor is explicitly unscored. Analyst forecasts are shown separately.

Added a VS Code debugger configuration, local environment template, development scripts and documented formulas. Kept the Git history so the prototype and the real-data transition remain reviewable. The implementation was developed with Codex assistance from the user's functional and strategy requirements.

## Validation scope

Automated checks establish software behavior and arithmetic. They do not establish trading profitability, reliability of provider fundamentals, a point-in-time historical holdout, broker execution quality, or suitability of a trade.

The full live browser check loaded 24 price histories and 23 usable revenue series. AMZN's newest quarter had an unspecified reporting currency in the provider response; the validator rejected that financial series and kept the price chart available. This demonstrated the production missing-data path without substituting or inventing figures.


## Production connection repair — 2026-09-21

- Reproduced HTTP 503 on the private Sites deployment. Sanitized Worker logs identified Cloudflare's rejection of `redirect: "error"`, which local Node tests had accepted.
- Switched to `redirect: "manual"` and explicitly reject 3xx responses; the provider key is never forwarded to redirect destinations. Added a transport regression test.
- Verified deployed AVGO prices, revenue and estimates returned HTTP 200 from Alpha Vantage.
- A full-load check then exposed the provider's “higher API call volume” notice. Classified it as HTTP 429 rather than an invalid-key error, paced upstream calls at 2 seconds, serialized the browser's symbol loads, and added two bounded 60-second retries per refresh.
- Added a browser test exercising two throttles followed by recovery; all 21 unit tests and 10 browser scenario groups pass. These browser scenarios use fixtures. Separate production checks use actual deployed responses.

- Final hosted full-load check: the JavaScript page rendered without browser errors, but Alpha Vantage continued returning its volume notice after the bounded cooldowns. The full 24-stock production load therefore did **not** pass. The app accurately displayed RATE_LIMIT and did not generate substitute prices. A contemporaneous direct Node request with the same supplied key returned valid OHLCV data. This establishes a production-path/provider throttling issue, not proof of a particular plan limit or IP policy.
- Reapplied the user-supplied key as a production secret (environment revision 3); the volume notice persisted. No public audience change was made.


## Priorities 1–8 — September 2026

Implemented and pushed in order: health/persistence, portfolio risk, daily change snapshots, private plans, calendar, alert rules, journal/outcomes, and holdings import/sync. GitHub checkpoints contain exact source-tree matches to each local checkpoint. Tests use explicit provider fixtures, including outages and throttling, and validate private account isolation, same-origin writes, optimistic conflicts, transactional duplicate handling, and reload/cross-browser persistence. The deployment remains owner-private. See FEATURES.md for exact scope and limitations.

### Shared budget and circulating refresh (2026-09-29 NZ)
Added a D1-backed rolling 70/minute reservation budget shared by all market endpoints and Worker instances, crash-expiring per-source leases, global provider cooldown, bounded retries and exponential source backoff. Added visible budget/retry status and automatic visible-tab refresh, missing/overdue-first ordering, two loading lanes and a pause control. Existing stored data remains authoritative across visits. Clarified unrequested estimates and non-price date labels. Added migration 0005 and budget/concurrency/cache/rotation tests; no API key or market payload committed. Includes the previously completed Priorities 2–8 in the next private publication.

### Fundamental snowflake screener (2026-09-29 NZ)
User selected the current 24 stocks and Value/Future/Past/Health/Dividend axes. Added independently specified, inspectable 0–5 scoring; overview/annual balance/annual cash-flow endpoints through existing persistent cache and shared budget; EPS estimate metadata; a stored-data screener API; interactive radar filters, search, industry/sort, presets, evidence modal and chart links. New data remains unavailable until Alpha Vantage returns it; production never imports test fixtures.

### Snowflake minimum-filter diagnosis and recovery (2026-09-30 NZ)
Screenshot used Value>=1, Future>=3, Past>=1, Health>=1, Dividend>=1 and complete-only. Live feed had zero complete stocks, but UI incorrectly described this as no qualifying stocks. Added separate pending/below/match states and visible AND/>= summary, mathematically justified partial-score lower bounds, per-request failure recovery, cursor rotation, backoff-aware tasks and fundamental collection priority. Added regression tests for the exact thresholds (equal/better accepted), strict complete-only and timeout/cooldown recovery. Provider throttling remains separately diagnosed from filtering; no scores or matches are fabricated.

## Screener-first workspace and opportunity/risk radar
- Primary navigation and page order now follow screener → radar → chart evidence; portfolio and operational panels follow research.
- Radar adds directional strong-signal and confirmed-breakout filters, expandable score contributions, source price dates and 5/20/60-session ATR scenario percentages.
- Query filtering occurs before ranking, so a single eligible matching stock is displayed. Lists remain disjoint; relative rank is explicitly distinguished from bearish evidence.
- No additional provider requests or score/probability claims introduced. Universe remains the supported 24 stocks.
- Added radar model tests and browser assertions for ordering, single matches, evidence and horizon controls.

## 2026-09-30 (NZ): Long-term uptrend gate with short-term pullback timing
- Added pure SMA, Wilder RSI14 and 21-session pullback model using existing 260-bar adjusted price history, with insufficient-history and invalid-input handling.
- Required long-term trend gates across all radar opportunity modes; separated confirmed, unconfirmed, waiting, risk and unknown states. Kept legacy score for secondary context, without changing persisted historical score semantics.
- Applied the same timing model to the fundamental screener, defaulting to confirmed pullbacks, and made company-research mode explicit.
- Added EMA20/SMA50/SMA200 chart overlays, RSI panel, 1Y range and 5/10/21-session scenarios. Displayed the actual criteria and exclusions in both radar and inspector.
- Validation: 63 unit tests; browser checks with explicit synthetic histories include a downtrending stock's short rally being rejected, confirmation and history gates, screener/radar consistency, evidence and charts, plus mobile/tablet overflow. No claim of strategy profitability or optimal parameters; live provider coverage is independent of this UI/model validation.
