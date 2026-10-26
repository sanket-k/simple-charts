# Feature Request: Save & Search Charts

Save the full chart (data + template/settings) so it can be reopened later, with a well-designed open/search experience. Single-page app, no backend.

## The key insight: settings live in the DOM, not in `state`

The `state` object holds only a subset of what's on screen (chart type, theme, colors, dual-axis config, dataset types/line-styles, zoom range, and the `charts.*` namespaced state). But the bulk of "the template" — ~**147 inputs** (`maxTicks`, `barBorderRadius`, every innovator/segmented/kano/dumbbell/bubble/overlay/dual-bar parameter, number format, axis labels, etc.) — lives in DOM inputs and is read fresh at render time. The existing `settingsInputs` array in `src/ui/settings.js` is essentially an inventory of them.

So "save everything" is really **serialize the whole form + the textarea + the subset of real state**. This is a solved pattern (form-state serialization), and makes the feature more mechanical than it first appears.

## Storage: IndexedDB + portable files (recommended)

Given two hard constraints — *"can be a lot of charts"* and *"re-adding all this information would be super hard"* — durability and scale matter more than simplicity.

| Option | Scale | Search | Durability | Portability |
|---|---|---|---|---|
| `localStorage` | ~5 MB ceiling | manual filter | survives reload, **wiped by data-clear** | none |
| **IndexedDB** ✅ | hundreds of MB+ | **native indexes** by name/type/date | survives reload, still wiped by data-clear | none |
| File System Access API | unlimited | manual | best | real folder — but **Chromium-only** (no Safari/FF) |

**Recommendation: IndexedDB as the working library + one-click export to a portable `.chart` (JSON) file.**

- **IndexedDB** handles scale natively (no 5 MB wall), runs async so big datasets don't jank the UI, and supports **indexes on `chartType` and `name`**, which is exactly what makes the chart-type filter and name search fast.
- The **portable file** is the safety net for the "re-adding would be super hard" fear. IndexedDB *can* be cleared by browser-data-wipes, private browsing, or a new machine — so every save should also be exportable to a real file (survives anything, shareable, version-controllable, works on another device). Plus a **"Backup entire library"** action that dumps everything to one file.

(File System Access API is a nice *phase-3* enhancement for a real "save to folder" feel, but it's Chromium-only, so it shouldn't be the foundation.)

## What gets saved — the document model

One JSON object per chart:

```jsonc
{
  "schema": 1,                 // version → enables migration of old saves
  "id": "uuid",
  "name": "Q3 Revenue vs Costs",
  "chartType": "line",
  "createdAt": "...", "updatedAt": "...", "tags": [],
  "data":   { "format": "csv", "text": "<textarea contents>" },
  "state":  { theme, colors, brand, dualAxis, datasets, zoomRange, charts.* },
  "inputs": { "maxTicks": "8", "barBorderRadius": "6", "chartTitle": "...", ... }
}
```

For `inputs`, **auto-scan every `<input>/<select>/<textarea>` that has an `id`** (they all do, per the `dom.js` convention), storing `{id: value}` with checkbox `.checked` handled separately. This is the future-proof choice: new inputs get saved for free as long as they carry an id, and there's no list to keep in sync. Dynamic controls (axis assignments, combo types, line-style rows, segmented editors, timeline events) are restored indirectly — they're rendered *from* `state`, so restoring state + re-rendering covers them.

Storing the textarea string and re-parsing on open (via the existing `parseInputText → updateAfterDataLoad` pipeline) is lossless and avoids duplicated data.

## The Open/Search experience

A **library modal** (triggered by an Open button + `⌘O`), not a file picker:

- **Left rail — chart-type filter**: "All (37)", then "Line · 12", "Bar · 5", "Pie · 3"… with counts. Clicking filters the list. This is the "chart type-based file opener."
- **Top — live search box**: filters by name (and optionally dataset names / tags) as you type.
- **Center — grid of cards**: each card shows a **thumbnail** (capture a small PNG preview of the canvas on save — the `toDataURL` path in `export.js` already does this), name, type chip, last-edited date, row count. Click to open; kebab menu → rename / duplicate / export file / delete.
- **Keyboard**: type-to-search, ↑↓ to move, Enter to open, Esc to close.

The thumbnail is the big UX win — a visual library where you *recognize* the chart beats a list of filenames every time. For very large libraries, the list can be virtualized later, but type-filter + search keeps hundreds instantly manageable.

## Load (open → chart)

1. Switch `chartType`, update the grid + `updateSettingsVisibility()`.
2. Restore textarea + `dataFormat`, run the parse pipeline (`updateAfterDataLoad`).
3. Restore the `state` fields, then restore every `inputs[id]` value — including syncing the paired value-displays (the `maxTicksValue` etc. pattern in `main.js`).
4. Re-render the dynamic controls (covered by the pipeline), set theme/colors, render the chart.
5. Stash `state.activeDocId` so the next "Save" updates in place rather than creating a duplicate.

## Future-proofing (directly addresses the "re-adding" worry)

- **`schema` version + a `migrate(doc)` registry** — if input ids change or state shape evolves, old saves are upgraded on load instead of breaking. Old files never become unreadable.
- **Portable file format** = the same document JSON, so nothing is locked in the browser.
- **Auto-scan-by-id** = new inputs persist with zero extra wiring.

## Where it fits in the codebase (per the "Adding a New UI Feature" convention)

- `src/storage.js` (new) — IndexedDB wrapper + the document model (serialize/deserialize, schema version, input scan/restore). Kept separate from UI.
- `src/ui/library.js` (new) — `initLibrary()`, the Save modal (reuse the `showExportModal` shape from `export.js`) and the Open library modal.
- Save/Open buttons in `index.html` (toolbar near Export), modal markup + styles in both theme blocks, refs in `dom.js`, `initLibrary()` wired in `main.js`.

## Suggested phasing

- **Phase 1 (core):** document model, IndexedDB store, Save modal, Open modal (type-filter + name search), load/restore, portable export/import, schema versioning.
- **Phase 2 (polish):** thumbnails, keyboard shortcuts (`⌘S`/`⌘O`), rename/duplicate/delete, recent section, optional autosave of the active doc.
- **Phase 3 (optional):** File System Access "save to folder", tags/folders, "backup entire library" zip, and *reusable templates* (save style-only, apply to new data).

## Open decisions

- **Storage choice:** IndexedDB + portable files (recommended) vs. localStorage-only (simpler, 5 MB ceiling).
- **Autosave vs. explicit Save:** leaning explicit (a "Save" click), with optional autosave of the active doc in Phase 2.
