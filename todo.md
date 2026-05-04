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

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Files touched per new chart | 6 | 2 (chart module + optional state init) |
| `.includes(t)` calls in settings.js | 39 | 0 |
| `state.js` flat chart-specific props | 7 | 0 (all namespaced under `charts.*`) |
| `render.js` dispatch branches | 17 (6 ifs + 11 cases) | 1 registry lookup |
| Chart type grid | 68 lines hardcoded HTML | Auto-generated from registry |
