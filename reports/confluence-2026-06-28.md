# BOUT Confluence Report — 2026-06-28

## Overall Market Context
Mock model summary: today's rhythm, heat map, and order-flow/ICT reads combine into mixed contextual bias across the analyzed basket — conditions to monitor, several setups requiring confirmation rather than a clean directional picture. This is a templated placeholder response — connect a real model provider (claude, openai, or ollama) with `bout model set <provider>` for live AI synthesis. Research and market context only, not financial advice.

## Strongest Bullish Factors
- None flagged.

## Strongest Bearish Factors
- BTC: order flow and ICT context both read bearish (order flow confidence: high) — setup to watch, requires confirmation.

## Conflicting Signals
- CL: order flow reads bullish while ICT context reads bearish — conflicting signals, requires confirmation either way.
- CL: order flow leans bullish but volume reads "rejects" the move — contextual bias without volume support.
- DXY: order flow reads bearish while ICT context reads bullish — conflicting signals, requires confirmation either way.
- DXY: order flow leans bearish but volume reads "rejects" the move — contextual bias without volume support.

## Best Assets To Watch
- **BTC** (bearish) — Order flow (bearish, high confidence), ICT context (bearish-leaning), and volume (unclear) combine into a bearish contextual bias — setup to watch, requires confirmation.

## Matching Strategies (setups to watch)
- **News Reaction Retest** [strong] — High-importance news today provides the required context. Current rhythm state ("event-driven") favors this strategy.
- **Oil Inventory Reaction** [strong] — Today's calendar includes an event matching "Crude Oil". Current rhythm state ("event-driven") favors this strategy.
- **ICT Liquidity Sweep + Market Structure Shift** [strong] — Liquidity sweep and market structure shift are aligned on at least one analyzed symbol. Current rhythm state ("event-driven") favors this strategy. A related order-flow concept is flagged on a relevant symbol.
- **VWAP Reclaim** [partial] — Volume isn't currently confirming on the relevant symbol(s) — would need that for a stronger read. A related order-flow concept is flagged on a relevant symbol.
- **Opening Range Breakout (ORB)** [partial] — Current rhythm state ("event-driven") favors this strategy. Volume isn't currently confirming on the relevant symbol(s) — would need that for a stronger read. A related order-flow concept is flagged on a relevant symbol.
- **Forex Session Breakout** [partial] — An ICT kill zone is currently active (Asian range). Current rhythm state ("event-driven") favors this strategy.
- **Trend Continuation Pullback** [weak] — Volume isn't currently confirming on the relevant symbol(s) — would need that for a stronger read.

## Strategies To Avoid Today
- **Liquidity Sweep Reversal** — Current rhythm state ("event-driven") is one this strategy explicitly avoids. A high-impact event is on today's calendar, which this strategy's avoid conditions flag. A related order-flow concept is flagged on a relevant symbol.
- **Gold / DXY / Yield Confirmation** — Gold/USD relationship is not holding today per the heat map read — cross-asset confirmation is absent.

## Risk Warnings
- (high) 2 high-impact event(s) on today's calendar (CPI (Consumer Price Index) m/m, FOMC Rate Decision + Press Conference). Expect elevated volatility around release times.
- (medium) 3 high-importance headline(s) in the feed — review before sizing up.

## Source / Data Trail
- Economic calendar: data/sample/calendar.sample.json (sample data)
- News headlines: data/sample/news.sample.json (sample data)
- Order flow, volume, ICT concepts: structured mock/placeholder data (src/analysis/orderFlow.ts, volumeAnalysis.ts, ictConcepts.ts)
- Heat map: structured mock/placeholder data (src/analysis/heatMap.ts)
- Market rhythm: session timing is real-clock based; trending/ranging/choppy read is mock (src/analysis/marketRhythm.ts)
- ICT kill zone: real-clock based (src/analysis/ictConcepts.ts)
- Strategy templates: data/sample/strategies.json
- Model provider: mock

---
Research and market context only. Not financial advice.
