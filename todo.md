# Phase 1: Chart Registration System

- [x] 1.1 Chart Registry
- [x] 1.2 Per-Chart State Namespacing
- [x] 1.3 Dynamic Imports
- [x] 1.4 Data Validation Framework

---

## 1.1 Chart Registry

- [x] Create `src/charts/registry.js` with `registerChart(descriptor)`, `getChartDescriptor(id)`, `getAllChartDescriptors()`, `getCapabilities(id)`
- [x] Define the descriptor schema: `id`, `label`, `icon`, `builder`, `isSelfManaged`, `capabilities`
- [x] Add `descriptor` export + `registerChart()` to all 16 chart modules (line, bar, pie, donut, area, radar, scatter, waterfall, combo, timeline, segmented, innovator, kano, dumbbell, bubble-compare, overlay)
- [x] Add `vbar` as second registration in bar.js
- [x] Refactor `render.js` to use `getChartDescriptor(type).builder(data)` instead of 6 `if` blocks + 11-case `switch`
- [x] Delete all static named chart imports from `render.js` (replaced by side-effect imports + registry)
- [x] Auto-generate chart type grid buttons from `getAllChartDescriptors()` instead of hardcoded HTML
- [x] Add `dataHint` + `dataExample` to all 17 chart descriptors with expected data format
- [x] Move data format info panel to DATA section (right panel, above input tabs), single implementation for all charts
- [x] Remove redundant per-chart `?` panels (segmented, dumbbell, bubble, overlay) and native `title` tooltips
- [x] Add `validateChartData()` in registry.js — per-chart validation with helpful error messages
- [x] Wire validation into render.js — show error/warning toasts for wrong column count, missing data, wrong types

## 1.2 Per-Chart State Namespacing

- [x] Add `charts: {}` sub-object to `state.js` for per-chart namespaced state
- [x] Move `state.kanoFeatures` → `state.charts.kano.features`, update kano.js + main.js
- [x] Move `state.segmentedSegments` / `segmentedGroups` / `activeGroupIndex` → `state.charts.segmented.*`
- [x] Move `state.innovatorTierCustomNames` / `currentInnovatorLabels` → `state.charts.innovator.*`
- [x] Move `state.timelineEvents` → `state.charts.timeline.events`
- [x] Remove all chart-specific flat properties from `state.js`

## 1.3 Dynamic Imports (Code Splitting)

- [x] Refactor `render.js` to use `getChartDescriptor(type).builder(ctx)` with centralized destroy
- [x] Keep side-effect imports in render.js for module registration (required for grid auto-generation)
- [ ] ~~Convert to `await import()` for on-demand loading~~ (deferred — requires separating chart metadata from modules for grid generation)

## 1.4 Settings Auto-Discovery

- [x] Add `capabilities` object to each chart descriptor (grid, curve, pointSize, lineWidth, fillArea, spanGaps, highLow, barRadius, legend, axisFormatting, dualAxis, lineStyle, zoom)
- [x] Refactor `updateSettingsVisibility()` to use `getCapabilities(type)` instead of 39 `.includes(t)` calls
- [x] Refactor chart-specific panel toggles (7 hardcoded `if` blocks) to data-driven loop
- [x] Refactor shared control toggles (10 inline `.includes()` arrays) to read from capabilities

---

## 1.5 Export Fix — Inline Plugins

- [x] Fix missing connectors/arrows/ratio labels in dumbbell and bubble-compare chart exports
- [x] Root cause: `doExport()` replaced entire plugins array, dropping chart-specific inline plugins (`dumbbellLines`, `bubbleGap`)
- [x] Fix: preserve inline plugins from cloned config while replacing shared plugins with original module references

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Files touched per new chart | 6 | 2 (chart module + optional state init) |
| `.includes(t)` calls in settings.js | 39 | 0 |
| `state.js` flat chart-specific props | 7 | 0 (all namespaced under `charts.*`) |
| `render.js` dispatch branches | 17 (6 ifs + 11 cases) | 1 registry lookup |
| Chart type grid | 68 lines hardcoded HTML | Auto-generated from registry |
