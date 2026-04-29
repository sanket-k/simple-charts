# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Server

No build system, no npm, no TypeScript, no bundler. All dependencies load via CDN. Run with any local HTTP server (ES modules won't work over `file://`):

```bash
python3 -m http.server 8080   # or: npx serve .   or: php -S localhost:8080
```

Then open `http://localhost:8080`. No test suite exists.

**Git commits**: `type: description` using types `feat`, `fix`, `clean up`, `refactor`, `docs`, `style`, `chore`.

## File Structure

```
├── index.html                  # Single HTML file — 3-column layout, all controls
├── styles.css                  # All CSS — design tokens, theme blocks, layout, components
├── src/
│   ├── main.js                 # Entry point: init(), event wiring, sample data
│   ├── render.js               # Chart render dispatcher (routes to builders)
│   ├── state.js                # Single mutable state object
│   ├── dom.js                  # DOM cache ($, $$, dom object ~190 refs)
│   ├── constants.js            # PALETTE, DEFAULT_COLORS, PRESET_PALETTES, CONFIG
│   ├── utils.js                # debounce, safeInt, safeFloat, hexToRgba, showToast
│   ├── format.js               # formatNumber (auto, raw, comma, currency, percent, short)
│   ├── chart-format.js         # Y-tick, data-label, tooltip formatter builders
│   ├── date-utils.js           # tryParseDate, isDateColumn, formatDateLabel
│   ├── data.js                 # Parsing pipeline: CSV, JSON, manual, downsample, zoom
│   ├── charts/
│   │   ├── base-options.js     # FONTS tokens, getTooltipBase, getLegendBase, theme plugins
│   │   ├── compare-utils.js    # Shared helpers for dumbbell/bubble-compare/overlay
│   │   ├── line.js             # Standard chart builders (one file per type)
│   │   ├── bar.js              # bar (vertical + horizontal)
│   │   ├── pie.js, donut.js, area.js, radar.js, scatter.js
│   │   ├── waterfall.js, combo.js, timeline.js
│   │   ├── segmented.js, innovator.js, kano.js
│   │   ├── dumbbell.js, bubble-compare.js, overlay.js
│   └── ui/
│       ├── theme.js, colors.js, settings.js
│       ├── dual-axis.js, combo-ui.js, line-style-ui.js
│       ├── branding.js, timeline-ui.js, zoom-ui.js
│       ├── export.js, clipboard.js
├── hub/                        # Product docs (PRD, tech spec, user manual, style guide)
└── dist/                       # Pre-built deployed output
```

## Architecture

```
index.html ──► src/main.js (entry, init())
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    render.js    data.js     ui/*.js
        │           │           │
   charts/*.js  (parsing)   (events)
```

- **Single mutable state** (`state.js`) — imported by every module, direct mutation is the norm
- **DOM cache** (`dom.js`) — `$()`, `$$()`, `dom` object (~190 refs). Queried once at load, never in render loops
- **No circular deps** — strict DAG. Cycles broken via `window.__` bridges set in `main.js`:
  - `window.__renderChart` — immediate render
  - `window.__debouncedRender` — 300ms debounced render
  - `window.__updateAfterDataLoad` — full data pipeline after parse
- **Named exports only** — no `export default` anywhere

### Chart Builder Pattern

Each chart type is a file in `src/charts/` exporting a builder function that returns a Chart.js config. `render.js` dispatches via `switch` on `state.currentChartType`. "Self-managed" charts (innovator, kano, segmented, dumbbell, bubble-compare, overlay) build their own options from scratch using shared helpers from `base-options.js`.

### Data Pipeline

`Input → parseInputText() → rawParsedData → applyDownsampling() → parsedData → applyZoom() → render`

### Per-Chart Data Store

Switching chart types saves/restores textarea content and parsed data via `state.chartDataStore[type]`.

## CDN Globals

`Chart` (4.4.7), `ChartDataLabels` (2.2.0), `Papa` (PapaParse 5.4.1) — accessed as `window.*`, never imported or npm-installed.

## Design Tokens

- **CSS variables** for all colors, spacing, radii — theme-switched via `[data-theme="dark"]`/`[data-theme="light"]` on `<html>`. New UI elements must use CSS variables in **both** theme blocks.
- **FONTS** object in `charts/base-options.js` — all Chart.js font objects must use `FONTS.*` tokens (e.g. `FONTS.title`, `FONTS.tick`), never inline font families.
- **Chart colors** from `PALETTE` constant or `getThemeColors()` called inside `beforeDraw()` plugin hooks.
- **Design helpers** in `base-options.js`: `getTooltipBase()`, `getLegendBase()`, `ASPECT_RATIOS`.
- **Compare helpers** in `compare-utils.js`: `getLogXAxis()`, `getCategoryYAxis()`, `drawRatioPill()`.

## Adding a New Chart Type

1. Create `charts/<type>.js` with builder function
2. Import and add `case` in `render.js`
3. Add button in `index.html`
4. Add settings panel HTML + toggle visibility in `ui/settings.js`
5. Add sample data in `main.js`
6. Cache new DOM elements in `dom.js`

## Adding a New UI Feature

1. Create `ui/<feature>.js` with `init` function
2. Call `init<Feature>()` in `main.js`
3. Add HTML, cache DOM in `dom.js`
4. After state mutations, call `window.__debouncedRender()` (or `__renderChart()` for immediate)

## Available Tools

- **Chrome DevTools MCP** — enabled for inspecting the running app. Use snapshots, console messages, DOM interaction, and performance traces. Do **not** use screenshots/images.
- **Context7 MCP** — enabled for looking up up-to-date library documentation (Chart.js, PapaParse, etc.) when needed.
- **CLI** — use for git operations, file management, running the dev server, and any shell tasks.

## Key Conventions

- Files: `kebab-case`, functions: `camelCase`, constants: `UPPER_SNAKE_CASE`
- Feedback: `showToast(msg, 'success'|'error'|'warning')` — never `alert()`
- Data limits: 500pts→monthly downsample, 2K→quarterly, 10K→warning, 50K→hard limit, 30 bars max, 12/10 pie/donut slices
- `hub/` contains product docs (PRD, tech spec, user manual, style guide) — reference only, not consumed at runtime
