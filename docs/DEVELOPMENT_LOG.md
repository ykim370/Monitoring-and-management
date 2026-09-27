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
