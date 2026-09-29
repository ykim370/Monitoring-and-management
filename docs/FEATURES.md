# Swing Desk — eight priorities

Each priority is a separate GitHub checkpoint. All market features use actual provider responses at runtime; tests use explicitly labelled fixtures.

1. **Data health:** Durable, validated last-known prices and fundamentals in D1; per-source attempt/success timestamps, price dates, missing fields and sanitized errors. Failed refreshes return labelled retained data. Retained or old prices are excluded from ranking.
2. **Portfolio risk:** Position and sector weights, selected-position shock losses, and notional exposure / manually entered equity. These are long-underlying-unit scenarios. Broker margin, cash, financing and currency conversion are not connected.
3. **What changed:** Trading-date snapshots from comparable data; score-factor differences; top-10 membership changes only when symbol coverage matches and includes at least 20 stocks. First use captures a baseline, not invented history.
4. **Trade plans:** Long/short entry, stop, target, units, estimated total costs and reasoning. Stores original available price-chart and score evidence. No orders are sent.
5. **Earnings:** Alpha Vantage EARNINGS_CALENDAR, filtered to watchlist or holdings. Six-hour cache and retained fallback. Reporting dates are date-only; exact NZ release times are unavailable. Retrieval timestamps use Pacific/Auckland.
6. **Alerts:** Private rules and event history, atomic deduplication, reset-before-repeat and cooldown. Score/price/breakout rules skip stale or insufficient evidence. Checks after page refresh and each visible-tab minute use cached daily data. Browser notifications require opt-in and the open page. No background delivery, emails or continuous real-time monitoring.
7. **Journal:** Manually entered trades, preserved original evidence, recorded exits and cost-adjusted P&L. Prospective outcomes use 5/10/20 available sessions strictly after the UTC capture date. Reference and future prices use the same split-adjusted basis; dividends excluded. Costs are the entered fixed estimate. Outcomes remain pending until data arrives. Historical-entry evidence is explicitly capture-time evidence, not point-in-time reconstructed history.
8. **Import and sync:** Private per-user holdings survive browser/device changes. CSV column mapping and non-mutating preview; positions replace the snapshot, transactions update it using weighted-average cost. Transactions need stable broker IDs; exact repeats are skipped, conflicting IDs rejected. Long supported stocks only. Same-day transactions follow file order. Costs are not capitalized into imported average price. Version checks reject concurrent stale edits, and imports commit atomically. Old browser holdings require explicit migration.

## Storage and identity

Production uses Sites-injected authenticated user IDs and owner-private hosting. Every private record query is scoped to user ID. Mutations require matching Origin and JSON where a body is accepted. Prepared SQL prevents input interpolation; optimistic versions prevent silent overwrite. Alerts and portfolio/transaction imports use atomic batches. Local Node development uses SQLite and an explicit local-owner identity on its loopback-only server. Development identity is absent from the production Worker.

Generated Drizzle migrations are versioned; applied migrations are immutable. Provider data and personal records are never committed to Git. The API key stays in the server environment.

## Verification

Run `npm test`, `npm run test:browser`, `node tests/features-browser.cjs`, and `npm run build`. Browser tests cover responsive layouts, plans, calendar precision, alerts, journal closes, import preview/confirm, duplicate imports, and holdings in a separate browser. Tests use fixtures and do not establish provider uptime or trading profitability.

## Shared Alpha Vantage budget and rotating refresh

- D1 retains successful normalized prices, revenue, estimates and earnings calendar across reloads and Worker restarts. Prices expire after one hour; fundamentals/calendar after six hours. These are daily price observations, not realtime quotes.
- Every uncached price, revenue, estimate and calendar request uses the same atomic D1 budget: at most 70 reservations in any rolling 60 seconds, with at least 850 ms between reservations. Five of the user's stated 75/minute allowance are left as headroom. Reservations may conservatively include a request subsequently satisfied by a concurrent cache fill; the panel reports reserved slots, not provider billing.
- An atomic per-source lease prevents duplicate concurrent fetches across Worker instances. Leases expire after 90 seconds to recover from crashes; provider calls time out after 25 seconds. If budget storage fails, external fetching pauses instead of bypassing the limit.
- Provider throttling pauses all endpoints for 60 seconds. Source failures retry after 1, 2, 4, 8, 16 and then 30 minutes. A full local budget uses a short retry delay and does not increment provider failure counts. Last-known data remains visible with a warning and is excluded from rankings.
- While the tab is visible, each completed cycle schedules the next one 60 seconds later. Two loading lanes circulate through missing, overdue and fresh records, prioritising selected/held stocks within each group and then oldest attempts. Cached reads spend no API calls. Previously requested estimates/calendar participate; unused estimates remain on demand. A checkbox pauses future automatic cycles; an in-flight cycle finishes normally. Hidden tabs pause future cycles and check again on return.
- This is a page-driven refresh loop, not a background service when all tabs are closed. Reopening resumes from persisted data and shared retry state. Multiple tabs share the budget and data.
- The limiter covers this Site only. Other projects using the same API key are not observable; five calls of headroom cannot guarantee spare capacity for them. Provider notices always take precedence over the configured plan allowance.
- Tests use fixture payloads: concurrent reservation races, rolling-window exhaustion/recovery, per-source leases, exponential backoff, global cooldown, crash recovery, storage outage, cached data after memory reset, rotation ordering and browser timer/pause behaviour.

## Snowflake screener (current 24-stock universe)

A five-axis fundamental screener, independently defined by Swing Desk. The reference screenshots informed the interaction; scores do not reproduce Simply Wall St's proprietary methodology and are not return probabilities, fair-value estimates or trading instructions.

Each axis has five fixed binary checks, one point per pass. It is N/A unless all five checks can be evaluated; missing/stale inputs never become zero or a passing value. A confirmed zero dividend yield produces Dividend 0/5. Filters combine minimums with AND; a zero minimum disables that axis filter. Unknown axes cannot satisfy active thresholds. Partial shapes show available points without an invented closed polygon.

- **Value:** positive P/E <25, forward P/E <25, PEG <1.5, price/book <3, EV/EBITDA <15. These are fixed, non-sector-adjusted thresholds, not intrinsic valuations.
- **Future:** forecast revenue growth >0%, >=10%, >=20%; forecast EPS growth >0%, >=10%. Uses the earliest two consecutive future fiscal-year consensus estimates (300–430 days apart), positive base values and positive analyst counts. It does not compare unlike annual/quarterly periods or turn loss-to-profit changes into misleading percentages.
- **Past:** positive quarterly revenue YoY growth; positive quarterly earnings YoY growth; positive profit margin; margin >=10%; ROE >=15%.
- **Health:** current ratio >=1 and >=1.5; liabilities/assets between 0 and 0.5; positive shareholder equity; positive annual operating cash flow.
- **Dividend:** positive yield; yield >=2%; nonnegative DPS/EPS payout <=60%; positive annual free cash flow; free cash flow covers positive annual common dividends. Free cash flow is operating cash flow minus absolute capital expenditures. Annual cash-flow checks are not a promise of dividend sustainability.

Sources: Alpha Vantage OVERVIEW, BALANCE_SHEET, CASH_FLOW and EARNINGS_ESTIMATES. Overview/estimates use six-hour caches; statements use 24-hour caches. The existing shared 70/minute budget and leases cover every endpoint. Latest-quarter overview data older than 200 days and annual reports older than 550 days cannot contribute to scores. The modal exposes source retrieval timestamps, fiscal dates, raw ratio inputs, failed checks and availability.

The screener reads saved data first and begins filling missing/expired sources when opened. It collects one source at a time, stops a cycle at provider/budget throttling, and retries after 60 seconds while visible, subject to shared per-source backoff. Initial collection can take several minutes or longer during provider throttling. No extra database migration is required: the existing market_cache stores normalized fundamentals. Old estimate packets without the new EPS fields are refreshed through the normal budget.

UI: pointer/keyboard snowflake handles, accessible range sliders, keyword/company/ticker search, industry selector, axis/market-cap sorting, three presets, reset, complete-only filter, per-company evidence and trading-chart links. Scope is the existing 24 US-listed stocks; it is not an all-market search. Keywords search actual available company descriptions; no invented thematic tags are added.

Verification: fixture-based scoring, missing-data semantics, stale/aged inputs, invalid forecast bases/periods, combined filters, normalization, cache/budget integration; browser search, sliders, pointer/keyboard controls, presets, evidence and 390/768px overflow checks. Test fixtures are not used in the production dashboard.

### Minimum-filter and collection recovery fix

Active snowflake filters mean AND of inclusive lower bounds (`>=`), not shape equality. Results now distinguish confirmed matches, stocks awaiting sufficient data, and stocks proven below at least one minimum. An incomplete axis has a lower bound equal to its known passed checks and an upper bound including all unknown checks. It can establish a minimum without inventing unknown values: e.g. three confirmed passes satisfy >=3 even if two checks are unknown. Its displayed score is explicitly `≥3/5 · partial`; it does not become a complete snowflake. Selecting “Only complete snowflakes” still requires all five axes to be fully evaluated. Pending stocks are listed separately and never claimed as matches.

Collection now continues after an individual network/JSON timeout instead of aborting the whole pass. A rotating cursor advances past throttled sources; shared leases/backoff entries are skipped until due, and the provider cooldown time is exposed. Ordinary price loading yields while fundamentals are actively collected. All calls retain the shared API budget; no provider restrictions are bypassed. The hosted key was reapplied from the user-supplied credential, and surrounding whitespace is removed server-side.

### Screener-first research
The initial workflow is fundamental screening, opportunity/risk ranking, then chart inspection. Radar filters support relative ranks, strong signals (score ≥60 / ≤40), and confirmed directional breakouts. Search applies before ranking. Expand each row for signed score contributions; price dates and selectable ATR scenario percentages accompany every result. Missing or stale evidence is not ranked, and the universe remains 24 supported stocks. The / shortcut focuses the main screener.

### 21-session uptrend pullback model (v1)
The screener defaults to confirmed pullbacks and shares the same model as the opportunity/risk radar and stock inspector. Company-research mode remains available but is explicitly not a buy list. Indicators use existing split-adjusted daily OHLCV; no extra provider calls are made.

Long-term mandatory gate: close > SMA200, SMA50 > SMA200, both averages above their values 21 sessions earlier, and positive 126-session return. At least 221 valid, increasing-date bars are required. Timing requires a 0.5–3 ATR pullback from the preceding 21-session highest close, distance to EMA20 between −0.75 and +0.75 ATR, close ≥ SMA50 − 0.5 ATR, and Wilder RSI14 between 40 and 60. Confirmation requires close above the previous high, increasing RSI14, and volume at least the preceding 20-session average. ATR is the existing 14-session mean of True Range.

Default opportunity candidates pass every gate. Watch mode explicitly includes unconfirmed pullbacks; failed trend/support conditions appear as buy exclusions, not short recommendations. Unknown history never counts as bearish or eligible. The old composite score remains secondary and cannot bypass any gate. Freshness and same-date price/revenue coverage still apply. Empty results are valid; lists are never filled with ineligible stocks.

The explorer shows SMA50/SMA200 and EMA20, an RSI chart with 40–60 reference band, exact check values, and a 1-year display option. Scenario controls are 5/10/21 sessions. These are research heuristics, not backtested optimum settings, profit probabilities, fundamental undervaluation estimates or automatic trade/exit instructions. Earnings dates, sector and broad-market conditions remain separate checks. Review trend/support daily during a maximum 21-session research horizon.

Indicator reference: https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI . The combination and numerical cutoffs are this project's own rules, not Fidelity recommendations.
