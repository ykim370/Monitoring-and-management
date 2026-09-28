# Swing Desk

A private, read-only swing-trading research dashboard using **real Alpha Vantage data**. Designed for a Capital.com trading workflow; it is not connected to the broker and cannot place orders.

## Run in VS Code now

Requirements: Node.js 22.13+ and an Alpha Vantage key with Daily Adjusted access.

```sh
git clone git@github.com:ykim370/Monitoring-and-management.git
cd Monitoring-and-management
npm ci
```

Copy `.env.example` to `.env`, then set `ALPHAVANTAGE_API_KEY` locally. Do not put the key in browser JavaScript or commit `.env`.

```sh
npm run dev
```

Open `http://localhost:3000`. In VS Code, open the repository folder and choose **Run and Debug → Swing Desk: server** for breakpoints (stop `npm run dev` first to avoid sharing port 3000). `npm start` runs without automatic restart. This JavaScript/Node project also opens in Visual Studio, but VS Code is the simpler fit; no conversion is required.

## What is real, and what is missing

- Prices: `TIME_SERIES_DAILY_ADJUSTED`, up to 260 sessions. Historical OHLC and volume are adjusted for subsequent splits. Dividends are not adjusted. The last daily close is the displayed price.
- Revenue: `INCOME_STATEMENT`, eight fiscal quarters, in the provider's reported currency. Revenue values are displayed in millions.
- Analyst consensus: `EARNINGS_ESTIMATES`, loaded only when the outlook tab is selected. Forecast fiscal years are separate observations, not revision history. The endpoint does not specify a currency field; the UI labels that limitation.
- **Company-issued revenue guidance revision history is not available in this integration.** It stays N/A and contributes no score. Analyst forecasts are not substituted for it.
- Holdings start empty. Enter actual quantities and average cost manually. These are saved privately for your signed-in user. Old browser-only positions can be migrated explicitly from Import & sync.
- No synthetic prices are loaded by the production app. Synthetic fixtures exist only under `tests/fixtures/`.
- This is real end-of-day data, not real-time quotes. Premium access does not automatically mean US real-time data entitlement.

See [Alpha Vantage documentation](https://www.alphavantage.co/documentation/).

## Data handling

The browser requests same-origin `/api/prices`, `/api/revenue` and `/api/estimates`. The Node server (local development) or Worker (Sites) supplies the secret to Alpha Vantage. Errors and responses never include the key.

The server validates provider notices and OHLCV records, normalizes payloads, coalesces identical requests, retains last-known data in D1, paces upstream starts (default 2,000 ms), and caches prices for one hour and fundamentals for six hours. In Sites, the internal Worker cache survives individual Worker instances subject to normal edge cache eviction. Local Node caching is in memory.

Open the page or press Refresh to request data. A cold load of 24 symbols needs up to 48 upstream requests; data and rankings appear progressively. There is no background scheduled monitoring. Rate limits produce explicit errors and a cooldown. The browser loads one symbol at a time and retries throttled requests after 60 seconds, at most twice per refresh. The pacing queue is per process/Worker instance, not a globally coordinated quota; multiple simultaneous sessions may still hit the provider limit.

Ranks use only stocks with comparable revenue and the same newest price date, excluding prices older than four calendar days. This simple freshness rule is disclosed; it does not incorporate an exchange holiday calendar. Incomplete coverage can show fewer than ten candidates per side, and the two lists never overlap. Candidate lists are relative rankings, not calibrated predictions.

## Strategy and limitations

See [`docs/STRATEGY.md`](docs/STRATEGY.md) for exact formulas and [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) for the build process. Weights and ATR coefficients are heuristic, not fitted or profitability-validated. Fundamentals are the provider's current reported history, not point-in-time backtest data.

## Test and build

```sh
npm test
npm run build
```

`npm test` covers API errors/caching, split handling, missing data, ranking, scenarios and holdings. Browser checks use explicit mocked provider payloads, while a separate live smoke check verifies the real adapter.

For browser testing on Linux:

```sh
node scripts/prepare-test-browser.cjs
npm run test:browser
```

On macOS/Windows run `npx playwright install chromium` and `npm run test:browser`; the harness uses the installed Playwright browser. `SWING_CHROMIUM_PATH` can override the executable. Screenshots/test outputs stay under ignored `artifacts/`.

## Deployment and Git

`npm run build` produces `dist/server/index.js` (Worker), `dist/server/wrangler.json`, and `dist/client/` (static assets). `.openai/hosting.json` retains the existing Sites project identity. Store the production key in a Sites secret called `ALPHAVANTAGE_API_KEY`; keep the Site owner-private.

The entire development history is preserved in Git. The Sites source repository and the user-owned GitHub repository are separate remotes. Push ordinary source and lockfiles; never push `.env`, cached paid data, artifacts, or `node_modules`.

## Troubleshooting provider access

On Sites, Fetch supports `redirect: "manual"`; the server rejects redirect responses explicitly. The provider's “higher API call volume” notice means throttling and is shown as `RATE_LIMIT`, not invalid credentials. The dashboard waits and retries twice per refresh. If the notice persists, pause other clients using the key and ask Alpha Vantage to confirm the key's request allowance and access from the hosting environment. The app cannot override provider quotas. Missing or throttled data remains visibly unavailable.

## Priority 1 — Data health

The health panel shows price dates, each endpoint's last successful refresh and latest provider attempt, missing sources, and sanitized errors in New Zealand time. D1 stores validated last-known payloads. Failed refreshes retain them with explicit stale warnings; retained data is excluded from rankings. No synthetic fallback is used. Local development uses a SQLite database under the ignored `.data` directory. `npm ci` restores identical self-hosted fonts from a pinned dependency.

## Eight-priority release

See [FEATURES.md](docs/FEATURES.md) for the health panel, risk overview, change feed, private plans, earnings calendar, alerts, journal, CSV import, and account-scoped holdings sync. All eight have separate GitHub checkpoints. Local Node development uses the ignored `.data/swing-desk.sqlite` database and applies the versioned migrations on startup.

`npm ci` restores self-hosted font assets from the exact pinned Fontsource dependency. For the complete feature browser check run `node tests/features-browser.cjs` after preparing the test browser.

### API budget and refresh
The hosted dashboard now shares a durable 70-request rolling-minute budget across prices, revenue, estimates and earnings calendar. It caches responses, prevents duplicate concurrent fetches, backs off after failures, and rotates the watchlist every 60 seconds after the previous cycle finishes while the tab is visible. Prices are daily data (one-hour cache); fundamentals/calendar use six-hour caches. Fresh reads do not spend provider calls. See `docs/FEATURES.md` for timing, recovery behaviour and the limitation when another project uses the same key.
