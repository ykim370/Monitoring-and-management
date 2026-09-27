# Strategy specification

This is an interpretable heuristic screen, not a forecasting model or automated trading system.

## Score

Start at 50. Add contributions, clamp to [0,100], then round:

| Component | Rule | Range |
|---|---|---|
| Trend | Close > EMA20: +8 else -8; EMA20 > EMA50: +7 else -7 | ±15 |
| Momentum | clamp(20-session return / 12%, -1, 1) × 10 | ±10 |
| Triangle | Confirmed above resistance: +10; below support: -10; otherwise zero | ±10 |
| Revenue | clamp(YoY / 25%, -1, 1) × 5; three consecutive QoQ increases: +3 else -3 | ±8 |
| Management guidance | Unavailable; omitted, not replaced by analyst consensus | N/A |

EMA uses alpha = 2 / (period + 1), seeded with the first close. Up to 260 daily bars reduce initialization effects. Missing revenue contributes zero with explicit missing coverage. Weights are not rescaled. With revenue present the available weighting is 43/50 = 86%; without revenue it is 35/50 = 70%.

Revenue YoY requires matching reporting currencies and fiscal dates roughly one year apart (365 ± 40 days). Consecutive quarter checks require four same-currency observations spaced 60–120 days apart. This tolerates non-calendar fiscal years without silently treating missing quarters as consecutive.

## Triangle detection

Search indices n−44 through n−5. A pivot must exceed (high) or fall below (low) each of its two neighbors on either side. Fit ordinary least squares lines to at least two high pivots and two low pivots. Require negative resistance slope, positive support slope, positive final channel width and final width <80% of initial width.

The latest close must lie outside the projected lines, and its split-adjusted volume must be ≥1.3 times the preceding 20-session average. This is a current pattern-state detector, not a first-crossing event backtest. Pivot confirmation uses following bars; the current calculation excludes unconfirmed end pivots, and historical backtesting would have to replay this causally.

## Scenarios

True range = max(high−low, abs(high−previous close), abs(low−previous close)). ATR14 is the simple mean of the latest 14 true ranges, not Wilder's smoothing.

Let b=(score−50)/50 and k=sqrt(horizon/20).

- Upper = close + ATR14 × k × (2.5 + 0.7b)
- Lower = max(0.01, close − ATR14 × k × (2.5 − 0.7b))
- Potential (%) = (target/close − 1) × 100
- Reward/risk = upside distance / downside distance

These are illustrative volatility scenarios. The square-root horizon scaling and coefficients are design assumptions, not fitted confidence intervals. USD long underlying positions exclude leverage, spread, financing, FX, tax and broker-specific instrument specifications.

## Comparison

Compare up to four stocks using only the intersection of their trading dates, normalized to 100 on the first common session. Financial growth rates can be compared; raw reported revenue currencies are not converted.
