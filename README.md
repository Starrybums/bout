# BOUT

**B**riefing, **O**rder Flow, **U**pdates, **T**iming.

A terminal-native AI market research desk for retail traders. BOUT helps you
understand what the market is about before you trade — combining macro news,
market context, order flow concepts, volume, heat maps, market rhythm,
ICT-style concepts, strategy confluence, risk warnings, and journal feedback.

**[justbout.online](https://justbout.online)** · *Know what the market is about before you trade.*

> **BOUT provides market context, educational analysis, and risk awareness
> only. It does not provide financial advice and makes no guarantees about
> future price action.** Nothing it produces is a recommendation to buy,
> sell, or hold any asset. There is no live broker execution anywhere in
> this codebase.

BOUT is **not**:
- a live trading bot
- a broker execution tool
- a signal-selling product
- financial advice
- a guaranteed profit system

You'll see language like *setup to watch*, *conditions to monitor*, *requires
confirmation*, *contextual bias*, and *risk warning* throughout BOUT's
output — never "buy now," "guaranteed trade," or "perfect signal."

---

## Requires your own AI provider

BOUT itself is free and open source, but **`bout brief` and `bout confluence`
require a configured AI provider to run — there is no offline/mock AI mode.**
Pick one:

- **Claude** or **OpenAI** — needs your own API key, billed per-token by that
  provider (separate from any ChatGPT/Claude.ai subscription)
- **Ollama** — free, runs a model locally, no API key, no per-token cost

Without one of these configured, `bout brief` and `bout confluence` will
refuse to run and tell you so. `bout journal add` still works fully without
one — the R:R math and rule-violation checks are non-AI heuristics; only the
bonus AI coaching note is skipped.

## What's actually in this build

- A working CLI (`bout ...`) covering every command listed below.
- Model providers (Claude, OpenAI, Ollama) you configure with your own
  keys/local server — see **Configuring AI model providers** below.
- **Sample** economic-calendar and news data, and **structured mock/placeholder**
  data for order flow, volume, heat maps, and ICT concepts — clearly labeled
  as such everywhere it's used, with clean interfaces so real feeds can be
  connected later without changing callers.
- Two pieces of genuinely **real**, non-mock logic mixed in deliberately:
  session timing (premarket/lunch/power-hour/etc.) and ICT kill-zone windows
  are both computed from the real clock (US Eastern Time), not randomized.
- A **Confluence Engine** that combines macro events, news, watchlist, order
  flow, volume, heat map, rhythm, ICT concepts, and a 9-strategy knowledge
  base into one report (`bout confluence today`), plus a short snapshot of
  the same inside `bout brief today`.
- A local SQLite database (via Node's built-in `node:sqlite`) for your
  watchlist and trade journal.
- Markdown reports written to `reports/` for every brief, confluence report,
  journal review, and daily report.

## What's intentionally NOT in this build

- No live broker connections, no order execution, no automated trading.
- No live/paid market-data or news APIs — every analysis module clearly uses
  mock or sample data, ready to be swapped for a real vendor later.
- No backtest *engine* — `backtestAgent.ts` parses and validates strategy
  YAML files but doesn't run historical simulations yet.
- No browser dashboard — `apps/dashboard/` is a placeholder for a later phase.
- No SMS/Telegram/Discord alerts, no payments — `alert test` prints to the
  terminal only.

---

## Install

Requires **Node.js 22.5+** (BOUT uses Node's built-in `node:sqlite` module,
so there's no native dependency to compile).

```bash
cd bout
npm install
npm run build
npm link        # makes the `bout` command available globally (optional)
```

Don't want to `npm link`? Run it directly:

```bash
node dist/apps/cli/index.js <command>
```

Or skip the build entirely during development:

```bash
npm run dev -- <command>     # uses tsx, no compile step
```

Then initialize:

```bash
bout init
```

This creates `data/local/` (config + SQLite DB) and `reports/` if they don't
already exist. Safe to run again later — it won't overwrite anything.

---

## Commands

### Briefing & context

| Command | What it does |
|---|---|
| `bout init` | One-time setup of local config/data directories |
| `bout brief today` | Daily briefing: macro events, news impact cards, risk level, watchlist, **Confluence Snapshot**, things to avoid |
| `bout news scan [--hours <n>]` | Scans sample headlines, classifies them into impact cards (default: last 48h) |
| `bout calendar today` | Today's economic calendar events |
| `bout calendar upcoming [--days <n>]` | Calendar events over the next N days (default 7) |

### Market analysis

| Command | What it does |
|---|---|
| `bout analyze orderflow [--symbol <sym>]` | Bid/ask imbalance, cumulative delta, absorption, sweeps, trapped traders, volume-at-price (mock) |
| `bout analyze volume [--symbol <sym>]` | Relative volume, spikes, exhaustion, divergence, high/low-volume nodes (mock) |
| `bout analyze heatmap` | Sector / forex-strength / crypto / commodity heat map + risk-on/risk-off tone (mock) |
| `bout analyze rhythm` | Current session (real clock), trending/ranging/choppy/event-driven read, danger zones |
| `bout analyze ict [--symbol <sym>]` | FVG, liquidity sweep, BOS, MSS, premium/discount, equal highs/lows, kill zones (educational) |
| `bout confluence today` | Combines every module above into one report — see below |

`--symbol` is optional on the per-symbol commands; without it, BOUT analyzes
your watchlist (or a default basket if your watchlist is empty).

### Strategy knowledge base

| Command | What it does |
|---|---|
| `bout strategy list` | List all 9 strategy templates |
| `bout strategy show <slug-or-name>` | Full detail: required context, confirmation/invalidation signs, risk notes, best session, avoid conditions |

### Watchlist, journal, reporting

| Command | What it does |
|---|---|
| `bout watch add <symbol>` | Add a symbol to your watchlist (e.g. `NQ`, `ES`, `GC`, `CL`, `DXY`, `EURUSD`, `BTC`) |
| `bout watch list` | List your watchlist with mock prices |
| `bout journal add --symbol ... --direction ... --entry ... --exit ... --stop ... --target ... [--setup ...] [--emotion ...] [--notes ...]` | Log a trade; runs the Journal Agent and prints/saves an AI-assisted review |
| `bout journal list` | List logged trades with realized R:R |
| `bout report daily` | End-of-day summary: trades, win/loss, average R:R |
| `bout model list` / `bout model set <provider>` | Show/switch AI model provider: `claude` \| `openai` \| `ollama` — one is required for `brief`/`confluence` |
| `bout alert test` | Send a test alert to the terminal |

Run `bout <command> --help` or `bout --help` any time for built-in usage.

---

## `bout confluence today`

This is the synthesis command. It runs order flow, volume, ICT concepts, the
heat map, and market rhythm across your watchlist (or a default basket),
cross-references the strategy knowledge base, and reports:

- **Overall market context** — an AI-assisted (or heuristic-fallback) summary
- **Strongest bullish/bearish factors** — drawn only from order flow, volume,
  and ICT reads (never from fabricating a direction onto calendar/news data)
- **Conflicting signals** — where modules disagree with each other
- **Best assets to watch** — symbols where multiple modules align
- **Matching strategies** — which of the 9 templates fit today's conditions, tiered strong/partial/weak
- **Strategies to avoid today** — templates whose avoid-conditions are currently true
- **Risk warnings** and a **source/data trail** listing exactly what's real-clock-based vs. mock
- The disclaimer: *"Research and market context only. Not financial advice."*

Every report is also saved to `reports/confluence-YYYY-MM-DD.md`.

---

## Configuring AI model providers

**Required** — `bout brief` and `bout confluence` will refuse to run until one
of these is set up:

1. Copy `.env.example` to `.env`.
2. Fill in the provider you want:
   - **Claude:** `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`) — get a key at [console.anthropic.com](https://console.anthropic.com/settings/keys), billed per-token
   - **OpenAI:** `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`) — billed per-token
   - **Ollama:** `OLLAMA_BASE_URL` + `OLLAMA_MODEL` (run `ollama pull <model>` first) — free, local, no key needed
3. Switch the active provider:
   ```bash
   bout model set claude   # or openai, or ollama
   bout model list         # confirms what's active/configured
   ```

`bout journal add` is the one exception — its R:R math and rule-violation
checks are non-AI heuristics and work with no provider configured at all;
only its bonus AI coaching note is skipped until you set one up.

If a provider isn't configured, BOUT doesn't crash — agents that call the
model fall back to a clear error message plus a structural/heuristic summary.

---

## Project structure

```
bout/
  apps/
    cli/                      # CLI entry point + one file per command group
      index.ts
      commands/
        analyze.ts             # orderflow / volume / heatmap / rhythm / ict
        strategy.ts             # list / show
        confluence.ts           # today
        ...                     # brief, news, calendar, watch, journal, report, model, alert, init
    dashboard/                 # Phase 2 placeholder — not built yet
  src/
    agents/                    # macro, news, risk, journal, backtest — clear input/output types
    analysis/                  # orderFlow, volumeAnalysis, heatMap, marketRhythm, ictConcepts, confluenceEngine, mockSignal
    tools/                     # calendar, news, market data (mock), strategy loader, notifications
    memory/                    # sqliteStore (watchlist + journal), markdownStore (reports), vectorStore (placeholder)
    config/                    # defaults, .env loading, config.json persistence
    types/                     # all shared types in one file
    modelRouter.ts              # routes to claude / openai / ollama — no mock/offline path
  data/
    sample/
      calendar.sample.json      # sample economic calendar
      news.sample.json          # sample headlines
      strategies.json           # 9-strategy knowledge base used by confluence + `strategy` commands
    strategies/                 # YAML strategy defs used by the backtest placeholder (separate from strategies.json)
  reports/                     # generated briefs, confluence reports, daily reports, journal reviews (markdown)
  .env.example
  package.json
```

---

## Current limitations

- Calendar and news data are **static sample files**, not a live feed.
- Order flow, volume, heat map, and most ICT concepts are **structured mock
  data**, deterministic per day/symbol but not connected to anything real.
  Two exceptions are genuinely real: session-timing buckets in the rhythm
  module and kill-zone detection in the ICT module both read the actual clock.
- Order blocks and previous-day high/low are left as explicit placeholders
  (not mocked) because fabricating specific price levels would cross into
  inventing data — see the notes in `ictConcepts.ts`.
- News "importance" and most directional reads are keyword/heuristic-based,
  not AI-classified.
- The backtest agent only parses/validates strategy YAML — it doesn't run
  historical simulations against real price data.
- Alerts only print to the terminal.

## Roadmap (rough order)

1. Real market-data + news API integration (behind the same tool interfaces).
2. Backtest engine: replay strategy rules from `data/strategies/*.yaml`
   against real historical OHLCV data.
3. Telegram and Discord alert channels (stubs already in `notificationTool.ts`).
4. Vector store wired to real embeddings for "find similar setups" search.
5. Browser dashboard (`apps/dashboard/`) reading from the same SQLite DB and
   `reports/` markdown the CLI already produces.
6. Chart-screenshot ingestion so order flow/volume/ICT modules can read
   real candle structure instead of mock data.

---

## A note on intent

BOUT is built for research, context-gathering, and journaling discipline —
not for outsourcing trading decisions to an AI. Every AI-generated summary in
this app is explicitly labeled, every mock/placeholder data source says so in
its own output, and every brief/report ends with the same disclaimer you see
at the top of this file: **research and market context only, not financial
advice.**
