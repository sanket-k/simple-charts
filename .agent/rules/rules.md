# Simple Charts — AI Assistant Rules

## 1. Tech Stack

| Layer | Tech | Version | Notes |
|-------|-----|---------|-------|
| Language | Vanilla JS (ES Modules) | ES2020+ | No TypeScript, no transpilation |
| Charts | Chart.js (CDN global) | **4.4.7** | `window.Chart` — never npm install |
| Date Axis | chartjs-adapter-date-fns | **3.0.0** | CDN |
| Annotations | chartjs-plugin-annotation | **3.1.0** | CDN |
| Data Labels | chartjs-plugin-datalabels | **2.2.0** | CDN, `window.ChartDataLabels` |
| CSV | PapaParse (CDN global) | **5.4.1** | `window.Papa`, web workers |
| Fonts | Inter (300–700) + JetBrains Mono (400–500) | — | Google Fonts CDN |
| CSS | Plain CSS, single file | — | No Tailwind, no preprocessor |
| Build | **None** | — | `python3 -m http.server 8080` |

**Quirks**: ES modules won't work over `file://`. `Chart`, `ChartDataLabels`, `Papa` are CDN globals. All HTML in `index.html`, all CSS in `styles.css`.

## 2. Architecture

```
index.html ──► src/main.js (entry, init())
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    render.js    data.js     ui/*.js
        │           │           │
   charts/*.js  (parsing)   (events)
```

- **Single mutable state** in `state.js` — imported by every module, direct mutation
- **DOM cache** in `dom.js` — `$()`, `$$()`, `dom` object. Query once at load, never in render loops
- **No circular deps** — strict DAG. Use `window.__` bridges to break cycles:
  - `window.__renderChart` — immediate render
  - `window.__debouncedRender` — 300ms debounced render
  - `window.__updateAfterDataLoad` — full data pipeline after parse

## 3. Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| Files | `kebab-case` / single word | `dual-axis.js`, `line.js` |
| Variables/Functions | `camelCase` | `chartInstance`, `renderChart()` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_COLORS`, `CONFIG`, `PALETTE` |
| DOM helpers | `$` / `$$` | `$('#chartCanvas')`, `$$('.panel')` |
| CSS classes | `kebab-case` | `chart-type-btn`, `panel-section` |
| Exports | **Named only** — never `export default` | |

**Domain terms**: `parsedData` (processed data), `rawParsedData` (pre-downsample), `chartInstance` (active Chart.js), `currentChartType` (string enum of 14 types), `downsample` (time-based bucketing).

## 4. Design Tokens

**Colors** (CSS variables, theme-switched via `[data-theme]`):

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--brand-orange` | `#F7931A` | `#F7931A` | Primary accent |
| `--bg-primary` | `#111622` | `#FFFBF6` | Page/chart background |
| `--text-primary` | `#F8FAFC` | `#1E293B` | Headings |
| `--text-secondary` | `#94A3B8` | `#475569` | Descriptions |
| `--border-focus` | `#F7931A` | `#F7931A` | Focus rings |

**Chart palette**: `#F7931A` `#60A5FA` `#34D399` `#F472B6` `#A78BFA` (5 default + 5 extra). Semantic: positive `#34D399`, negative `#F87171`.

**Chart.js fonts** (JS constant `FONTS` in `charts/base-options.js`):
All chart font objects MUST use `FONTS.*` tokens. Never inline `family: "'Inter', sans-serif"`.
Available tokens: `title`, `subtitle`, `legend`, `tick`, `tickSmall`, `axisTitle`, `axisTitleLg`, `tooltipTitle`, `tooltipBody`, `datalabels`, `datalabelsBold`, `datalabelsSm`, `datalabelsXs`, `annotation`, `pointLabel`, `kanoQuadrant`, `source`, `brand`, `ratioPill`.

**Chart.js design helpers** (functions in `charts/base-options.js`):
`getTooltipBase()` — shared tooltip config (colors, fonts, border).
`getLegendBase()` — shared legend config (position, colors, point style).
`ASPECT_RATIOS` — `{ standard: false, square: true, circle: 1.6 }`.

**Compare chart helpers** (functions in `charts/compare-utils.js`):
`getLogXAxis()` — logarithmic X-axis config. `getCategoryYAxis(labels)` — categorical Y-axis. `drawRatioPill(ctx, x, y, text, colors, opts?)` — canvas ratio pill.

**Other tokens**: `--font-sans: Inter`, `--font-mono: JetBrains Mono`, base `14px`. Spacing: `--sp-1`(4px) through `--sp-10`(40px). Radii: `--radius-xs`(4px) through `--radius-xl`(20px). Transition: `--duration: 0.2s`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.

## 5. Component Rules

1. **Named exports only** — no `export default` anywhere
2. **Single mutable state** — all runtime state in `state.js`, direct mutation, no immutability
3. **DOM cache** — elements cached in `dom.js` at load; never `document.querySelector` in render loops
4. **No circular deps** — strict DAG; use `window.__` bridges to break cycles
5. **Trigger render after mutation** — `window.__renderChart()` (immediate), `window.__debouncedRender()` (300ms), or `window.__updateAfterDataLoad()` (full pipeline)
6. **CDN globals** — `Chart`, `ChartDataLabels`, `Papa` are `window` globals, never import or npm install
7. **Toast for feedback** — `showToast(msg, 'success'|'error'|'warning')`, never `alert()`
8. **CSS variables only** — never hardcode colors; new theme props go in both dark and light blocks

## 6. Key Patterns

**State → Render** (most common — settings inputs):
```javascript
el.addEventListener('input', () => {
  state.userBgColor = dom.chartBgColor.value;
  if (window.__debouncedRender) window.__debouncedRender();
});
```

**Chart Builder** (every chart type follows this):
```javascript
export function buildLineChart(labels, datasets, c, colors, tension, useTimeAxis, displayData) {
  return { type: 'line', data: { labels, datasets: datasets.map((ds, i) => ({
    label: ds.name, data: ds.values, borderColor: colors[i % colors.length], tension,
  }))}, options: getBaseChartOptions() };
}
```

**Data Pipeline**: `Input → parseInputText() → rawParsedData → applyDownsampling() → parsedData → applyZoom() → render`

**Theme Plugins** (read colors at draw time, not init): `getThemeColors()` called inside `beforeDraw()`.

**Self-Managed Charts** (charts that build options from scratch — compare, segmented, kano, innovator):
```javascript
import { FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
// Use FONTS.* for all font objects, spread helpers for tooltip/legend:
plugins: {
  legend: getLegendBase(),
  tooltip: { ...getTooltipBase(), callbacks: { ... } },
  title: { font: FONTS.title, ... },
}
```

```
src/
├── main.js, render.js, state.js, dom.js, constants.js, utils.js
├── format.js, chart-format.js, date-utils.js, data.js
├── charts/          # One builder per type + base-options.js (design tokens, config helpers, plugins)
└── ui/              # Event modules: theme, colors, settings, dual-axis, combo-ui,
                     # line-style-ui, branding, timeline-ui, zoom-ui, export, clipboard
hub/                 # PRD.md, TECHNICAL_SPECIFICATION.md, USER_MANUAL.md, STYLE_GUIDE.md
index.html           # All HTML (3-column grid layout, all controls)
styles.css           # All CSS (design tokens → theme blocks → layout → components → responsive)
```

## 8. Workflow

**Dev server**: `python3 -m http.server 8080` or `npx serve .`

**Git commits**: `type: description` — types: `feat`, `fix`, `clean up`, `refactor`, `docs`, `style`, `chore`

**Data limits**: 500pts→monthly downsample, 2K→quarterly, 10K rows→warning, 50K→hard limit, 30 bars max, 12/10 pie/donut slices.

## 9. Guidelines

**Before changing code**: read relevant modules → check `state.js` for state → check `dom.js` for DOM → check `constants.js` for config.

**New chart type**: create `charts/<type>.js` → import in `render.js` + add `case` → add button in `index.html` → add settings panel → toggle visibility in `settings.js` → add sample data in `main.js` → cache DOM in `dom.js`.

**New UI feature**: create `ui/<feature>.js` with `init` → call `init<Feature>()` in `main.js` → add HTML → cache in `dom.js` → call `window.__debouncedRender()` after state changes.

**Checklist**: named exports ✓ | CSS variables not hardcoded ✓ | JS colors from `PALETTE`/`getThemeColors()` ✓ | DOM cached ✓ | toast not alert ✓ | both theme blocks ✓ | reduced-motion ✓ | no npm ✓ | no circular imports ✓ | `kebab-case` files ✓ | `camelCase` functions ✓ | `UPPER_SNAKE_CASE` constants ✓

## MCP (use when required)
- Context7 (for updated libraries)

## tasks tracking
**Always update `todo.md`** after completing a task to track progress
[x] Completed task
[ ] Pending task
[/] In progress