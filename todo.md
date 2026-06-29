# Phase 1: Modular Architecture — 16-04-2026 to 28-04-2026

- [x] 1.1 Split monolithic `app.js` (4700+ lines) into modular `src/` structure
- [x] 1.2 Per-file concerns: state, render, charts, UI, data, dom, format, constants, utils
- [x] 1.3 Named exports only, strict DAG, no circular deps
- [x] 1.4 DOM cache (`dom.js`) — query once at load, ~229 refs
- [x] 1.5 `window.__` bridges for circular-breaking (render, debouncedRender, updateAfterDataLoad)

---

### 1.1 Modular Rewrite

- [x] Create `src/` directory with 20+ modules: `main.js`, `render.js`, `state.js`, `dom.js`, `data.js`, `utils.js`, `format.js`, `chart-format.js`, `date-utils.js`, `constants.js`
- [x] Create `src/charts/` with per-type builders: line, bar, pie, donut, area, radar, scatter, waterfall, combo, timeline, segmented, innovator, kano
- [x] Create `src/ui/` with feature modules: theme, colors, settings, dual-axis, combo-ui, line-style-ui, branding, timeline-ui, zoom-ui, export, clipboard
- [x] Create `charts/base-options.js` with shared FONTS tokens, tooltip/legend helpers, theme plugins
- [x] Create `charts/compare-utils.js` with shared helpers for comparison charts
- [x] Delete monolithic `app.js`

### 1.2 Supporting Features (pre-registry)

- [x] SVG logo upload with placement options (`branding.js`)
- [x] Multi-group support for segmented bar charts
- [x] Percentage mode for segment values
- [x] Dual-axis support with axis assignments
- [x] Color pickers with custom palette support
- [x] Clipboard paste and keyboard shortcuts
- [x] Theme toggle (dark/light)

---

# Phase 2: Comparison Charts — 29-04-2026 to 30-04-2026

- [x] 2.1 Dumbbell chart
- [x] 2.2 Bubble Compare chart
- [x] 2.3 Overlay chart
- [x] 2.4 Shared comparison utilities
- [x] 2.5 Comparison chart enhancements

---

### 2.1 Dumbbell Chart

- [x] Create `charts/dumbbell.js` with horizontal bar + connector lines
- [x] Add settings UI for dumbbell-specific options
- [x] Wire into render dispatch and settings visibility

### 2.2 Bubble Compare Chart

- [x] Create `charts/bubble-compare.js` with log-scale X axis and ratio pills
- [x] Minimum radius and value display options
- [x] Sorting and swapping functionality
- [x] Decimal precision in ratio calculations

### 2.3 Overlay Chart

- [x] Create `charts/overlay.js` with logarithmic X-axis
- [x] Grouped display mode and opacity settings
- [x] Hide grid lines for cleaner visualization

### 2.4 Shared Comparison Utilities

- [x] Create `charts/compare-utils.js` with `getLogXAxis()`, `getCategoryYAxis()`, `drawRatioPill()`
- [x] Refactor dumbbell and bubble-compare to use shared helpers

### 2.5 Enhancements

- [x] Semantic colors for up/down values (`SEMANTIC` constant)
- [x] Centralized font configuration (`FONTS` tokens in base-options.js)
- [x] Line style customization for dumbbell connectors

---

# Phase 3: Chart Registration System — 30-04-2026 to 02-05-2026

- [x] 3.1 Chart Registry
- [x] 3.2 Per-Chart State Namespacing
- [x] 3.3 Data Validation & Hints
- [x] 3.4 Settings Auto-Discovery

---

### 3.1 Chart Registry

- [x] Create `src/charts/registry.js` with `registerChart()`, `getChartDescriptor()`, `getAllChartDescriptors()`, `getCapabilities()`
- [x] Define descriptor schema: `id`, `label`, `icon`, `builder`, `isSelfManaged`, `capabilities`
- [x] Add `descriptor` export + `registerChart()` to all 16 chart modules
- [x] Add `vbar` as second registration in bar.js
- [x] Refactor `render.js` to use `getChartDescriptor(type).builder(ctx)` instead of 6 `if` blocks + 11-case `switch`
- [x] Delete all static named chart imports from `render.js` (replaced by side-effect imports + registry)
- [x] Auto-generate chart type grid buttons from `getAllChartDescriptors()` instead of hardcoded HTML

### 3.2 Per-Chart State Namespacing

- [x] Add `charts: {}` sub-object to `state.js` for per-chart namespaced state
- [x] Move `state.kanoFeatures` → `state.charts.kano.features`
- [x] Move `state.segmentedSegments` / `segmentedGroups` / `activeGroupIndex` → `state.charts.segmented.*`
- [x] Move `state.innovatorTierCustomNames` / `currentInnovatorLabels` → `state.charts.innovator.*`
- [x] Move `state.timelineEvents` → `state.charts.timeline.events`
- [x] Remove all chart-specific flat properties from `state.js`

### 3.3 Data Validation & Hints

- [x] Add `dataHint` + `dataExample` to all 17 chart descriptors with expected data format
- [x] Move data format info panel to DATA section (right panel, above input tabs), single implementation for all charts
- [x] Remove redundant per-chart `?` panels (segmented, dumbbell, bubble, overlay) and native `title` tooltips
- [x] Add `validateChartData()` in registry.js — per-chart validation with helpful error messages
- [x] Wire validation into render.js — show error/warning toasts for wrong column count, missing data, wrong types

### 3.4 Settings Auto-Discovery

- [x] Add `capabilities` object to each chart descriptor
- [x] Refactor `updateSettingsVisibility()` to use `getCapabilities(type)` instead of 39 `.includes(t)` calls
- [x] Refactor chart-specific panel toggles (7 hardcoded `if` blocks) to data-driven loop
- [x] Refactor shared control toggles (10 inline `.includes()` arrays) to read from capabilities

---

# Phase 4: Export & Data Pipeline — 03-05-2026 to 04-05-2026

- [x] 4.1 Inline Plugin Preservation
- [x] 4.2 TSV Format Support
- [x] 4.3 Data Export
- [x] 4.4 Panel Title Actions

---

### 4.1 Inline Plugin Preservation

- [x] Fix missing connectors/arrows/ratio labels in dumbbell and bubble-compare chart exports
- [x] Root cause: `doExport()` replaced entire plugins array, dropping chart-specific inline plugins
- [x] Fix: preserve inline plugins from cloned config while replacing shared plugins with original module references

### 4.2 TSV Format Support

- [x] Add TSV as supported input format (tab-separated, e.g. from Google Sheets)
- [x] Format toggle: `'csv'`, `'tsv'`, `'json'`
- [x] CSV and TSV both route through `parseDataFromText()` (PapaParse auto-detects delimiters including tabs)
- [x] Bypass JSON auto-detection when format is `'csv'` or `'tsv'`
- [x] Format info-tip panel shows format-specific examples (TSV derived from CSV at runtime)

### 4.3 Data Export

- [x] Add data export options for CSV, TSV, and JSON formats
- [x] Copy functionality for exported data
- [x] Update default export quality to 1x

### 4.4 Panel Title Actions

- [x] Add format options and copy functionality to panel titles
- [x] CSS for panel title actions styling

---

# Phase 5: Innovator Chart — Data Input + Auto-Scaling — 04-05-2026

- [ ] 5.1 Fix validation for self-managed charts
- [x] 5.2 Data-driven mode — progressive data input (1/2/3+ datasets)
- [x] 5.3 Auto-scaling for formula mode (Y-axis range remapping)
- [ ] 5.4 Updated registry descriptor hints (progressive format examples)
- [ ] 5.5 Browser testing — default, auto-scaled, and data-driven modes

---

### 5.1 Fix Validation for Self-Managed Charts

- `render.js` calls `validateChartData()` before `desc.builder()` for self-managed charts
- When `state.parsedData` is null, validation returns "No data to render" error and blocks render
- Fix: skip validation when `parsedData` is null — self-managed charts generate their own data
- Affects: innovator, kano, timeline (all `isSelfManaged: true` charts)

### 5.2 Data-Driven Mode (Progressive Data Input)

- [x] **1 dataset**: Disruptive curve from data, incumbent auto-generated (scaled to data range), tiers auto-generated
- [x] **2 datasets**: Disruptive + incumbent from data, tiers auto-generated
- [x] **3+ datasets**: Disruptive + incumbent + custom tier lines from data
- [x] Labels come from `parsedData.labels` (replaces formula-generated labels)
- [x] Tier positions auto-derived from data range when not explicitly provided via datasets

### 5.3 Auto-Scaling for Formula Mode

- [x] All internal Y-position values scale proportionally when Y-axis min/max differs from default 0-90
- [x] `disruptiveStart`, `disruptivePeak` → remapped linearly
- [x] `incumbentBase`, `incumbentSlope` → base remapped, slope scaled by range ratio
- [x] `marketTop`, `marketBottom` → remapped linearly
- [x] Tier line positions inherit scaled values

---

# Phase 6: Documentation & Polish — 04-05-2026

- [x] 6.1 JSDoc comments across all modules
- [x] 6.2 Bug fixes and minor improvements

---

### 6.1 JSDoc Comments

- [x] Add documentation comments to all 17 chart modules
- [x] Document data pipeline (`data.js`): parsing, downsampling, zoom
- [x] Document UI modules: theme, colors, settings, export, clipboard, etc.
- [x] Document entry point (`main.js`) and render dispatcher

### 6.2 Bug Fixes

- [x] Use debounced render function for segmented group updates
- [x] Add missing documentation in timeline UI
- [x] Fix radar chart axis not auto-scaling — replaced hardcoded `suggestedMax: 100` with `beginAtZero: true`

---

# Phase 7: Y-Axis Formatting, Log Scale & Dual-Bar Chart — 2026-05-12 to 2026-06-13

- [x] 7.1 Per-axis number formatting (dual-axis UI)
- [x] 7.2 Y-axis tick formatting overrides + Innovator integration
- [x] 7.3 Y-axis scale selection (linear / logarithmic)
- [x] 7.4 Waterfall chart color & legend refinement
- [x] 7.5 Dual-Bar (target vs. current) chart

---

### 7.1 Per-Axis Number Formatting (Dual-Axis UI)

- [x] Add `state.axisFormats = { left, right }` for independent left/right axis number formats
- [x] Format selects in the dual-axis assignment UI — Auto, Raw, Commas, Short, Currency, Percentage, and "Use global"
- [x] Wire into Y-tick callbacks for both axes via `buildYTickCallback(state.axisFormats.*)`

### 7.2 Y-Axis Tick Formatting Overrides

- [x] Allow per-chart Y-tick formatting overrides via `buildYTickCallback(format, { logScale })`
- [x] Integrate explicit tick formatting in the Innovator's Dilemma chart

### 7.3 Y-Axis Scale Selection (Linear / Logarithmic)

- [x] Add Y-Axis Scale control (Linear / Logarithmic) in the Formatting panel, gated by the `axisFormatting` capability
- [x] Apply logarithmic Y-axis in `getBaseChartOptions()` (left, right, and single-axis paths) — only when min > 0
- [x] Nice logarithmic tick generation (1 / 2 / 5 pattern across orders of magnitude) via `logAfterBuildTicks`
- [x] Add linear + logarithmic Y-axis scale selection to the Innovator's Dilemma chart

### 7.4 Waterfall Chart Refinement

- [x] Update waterfall colors and legend configuration for improved clarity (semantic up/down colors, total bar in the brand color)

### 7.5 Dual-Bar Chart

- [x] Self-managed `charts/dual-bar.js` + `registerChart({ id: 'dual-bar' })` — concentric horizontal bars (translucent outer/target + solid inner/current)
- [x] `#dualBarSettings` panel: Inner Bar Width (30–90%), Outer Bar Opacity (5–50%), Border Radius (0–12), Show Values toggle
- [x] Validation: requires exactly 2 data series; warns when inner > outer; square aspect ratio
- [x] Wired across `dom.js`, `render.js` (side-effect import), `settings.js` (`chartPanelMap`), `main.js` (sample data)

---

# Phase 8: Inflation Chart — 29-06-2026

- [x] 8.1 Inflation variant gallery (prototype playground)
- [x] 8.2 Value-Track chart integration into the main app

---

### 8.1 Inflation Variant Gallery (Prototype)

- [x] Standalone playground at `inflation/` (`index.html`, `styles.css`, `app.js`) — CDN Chart.js, no build step
- [x] 8 live variants driven by shared sliders (amount, rate, base/target year): value-track line, power donut, then-vs-now dumbbell, yearly bars, erosion waterfall, power gauge, rate-sensitivity columns, decade polar
- [x] Rate-based model: `equivalent = amount × (1 + r)^(target − base)`
- [x] All-visible gallery, debounced live re-render, dark/light tokens mirrored from the main app

### 8.2 Value-Track Chart Integration

- [x] Self-managed `charts/inflation.js` + `registerChart({ id: 'inflation' })` (modeled on `dual-bar.js`)
- [x] `#inflationSettings` panel: Amount, Rate, Base Year, Target Year — each a number input **and** a slider — plus line-tension slider and base/target markers toggle
- [x] `ui/inflation-ui.js` with bidirectional slider↔number sync + debounced render
- [x] Wired across `dom.js`, `render.js` (side-effect import), `settings.js` (`chartPanelMap`), `main.js` (`initInflationUI()` + no-data sample branch)
- [x] Both directions supported: target later than base ("worth today") and earlier ("worth previously")
- [x] Browser-verified: console-clean, slider/number sync, math propagation, chart-type round-trip with value retention

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Files touched per new chart | 6 | 2 (chart module + optional state init) |
| `.includes(t)` calls in settings.js | 39 | 0 |
| `state.js` flat chart-specific props | 7 | 0 (all namespaced under `charts.*`) |
| `render.js` dispatch branches | 17 (6 ifs + 11 cases) | 1 registry lookup |
| Chart type grid | 68 lines hardcoded HTML | Auto-generated from registry |
