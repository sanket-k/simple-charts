/** Settings panel — visibility toggling, chart type grid, catalog popover, format hints, and all settings inputs. */
import { CONFIG, DEFAULT_COLORS } from '../constants.js';
import { state } from '../state.js';
import { dom, $$ } from '../dom.js';
import { escapeHtml, showToast } from '../utils.js';
import { CHART_CATEGORIES, getCapabilities, getAllChartDescriptors, getChartDescriptor } from '../charts/registry.js';
import { renderGroupTabs, renderSegmentList, getDefaultSegments, ensureGroupStructure } from '../charts/segmented.js';
import { renderInnovatorTierNames } from '../charts/innovator.js';
import { renderComboDatasetTypes } from './combo-ui.js';
import { renderAxisAssignments } from './dual-axis.js';
import { renderLineStyleControls } from './line-style-ui.js';
import { updateZoomSlider } from '../data.js';
import {
  recordChartUsage,
  resetVisitEditGuard,
  getTopUsedChartIds,
  hasRecordedUsage,
  markChartSeen,
  isChartUnseenNew,
  resetChartUsage,
} from './chart-usage.js';
import { initChartGuide, syncChartGuideUI, hideChartGuidePopover } from './chart-guide.js';

let catalogCategoryFilter = 'all';
let catalogSearchQuery = '';

/** Shows/hides settings controls based on the current chart type's capabilities. */
export function updateSettingsVisibility() {
  const t = state.currentChartType;
  const caps = getCapabilities(t);

  const toggle = (el, show) => {
    if (el) {
      const group = el.closest('.input-group') || el.closest('.swatch-row') || el.parentElement;
      if (group) group.style.display = show ? '' : 'none';
    }
  };

  const toggleRow = (el, show) => {
    if (el) {
      const group = el.closest('.input-group-row');
      if (group) group.style.display = show ? '' : 'none';
    }
  };

  // Chart-specific settings panels
  const chartPanelMap = {
    timeline: dom.timelineSettings,
    innovator: dom.innovatorSettings,
    segmented: dom.segmentedSettings,
    kano: dom.kanoSettings,
    dumbbell: dom.dumbbellSettings,
    'bubble-compare': dom.bubbleCompareSettings,
    overlay: dom.overlaySettings,
    'dual-bar': dom.dualBarSettings,
    inflation: dom.inflationSettings,
  };
  Object.entries(chartPanelMap).forEach(([id, panel]) => {
    if (panel) panel.style.display = t === id ? '' : 'none';
  });
  // Timeline settings panel also shows for innovator
  if (dom.timelineSettings) dom.timelineSettings.style.display = (t === 'timeline' || t === 'innovator') ? '' : 'none';

  // Shared controls driven by capabilities
  toggle(dom.chartCurve, caps.curve);
  toggle(dom.pointSize, caps.pointSize);
  toggle(dom.lineWidth, caps.lineWidth);

  toggle(dom.showGrid, caps.grid);
  toggle(dom.gridStyle, caps.grid);
  toggle(dom.chartGridColor, caps.grid);

  toggle(dom.fillArea, caps.fillArea);
  toggle(dom.spanGaps, caps.spanGaps);
  toggle(dom.showHighLowPoints, caps.highLow);
  toggle(dom.barBorderRadius, caps.barRadius);

  toggle(dom.legendPosition, caps.legend);

  toggle(dom.xAxisType, caps.axisFormatting);
  toggle(dom.xAxisLabel, caps.axisFormatting);
  toggle(dom.yAxisLabel, caps.axisFormatting);
  toggle(dom.showYAxisLabel, caps.axisFormatting);
  toggle(dom.dateFormat, caps.axisFormatting);
  toggle(dom.maxTicks, caps.axisFormatting);
  toggle(dom.yAxisScale, caps.axisFormatting);
  toggleRow(dom.yAxisMin, caps.axisFormatting);
  toggle(dom.xAxisRotation, caps.axisFormatting);

  if (dom.refLineY) {
    const annSection = dom.refLineY.closest('.panel-section');
    if (annSection) annSection.style.display = caps.axisFormatting ? '' : 'none';
  }

  if (dom.dualAxisSection) {
    if (!caps.dualAxis || !state.rawParsedData || state.rawParsedData.datasets.length < 2) {
      dom.dualAxisSection.style.display = 'none';
    } else {
      dom.dualAxisSection.style.display = '';
    }
  }

  const comboEl = dom.comboSettings;
  if (comboEl) {
    if (t === 'combo' && state.rawParsedData && state.rawParsedData.datasets.length >= 2) {
      comboEl.style.display = '';
      renderComboDatasetTypes();
    } else {
      comboEl.style.display = 'none';
    }
  }

  const lineStyleSection = dom.lineStyleSection;
  if (lineStyleSection) {
    const isLineStyleChart = caps.lineStyle;
    const comboHasLine = t === 'combo' && state.datasetChartTypes.some(dt => dt === 'line');
    const showLineStyles = (isLineStyleChart || comboHasLine) && state.rawParsedData && state.rawParsedData.datasets.length >= 1;
    lineStyleSection.style.display = showLineStyles ? '' : 'none';
    if (showLineStyles) renderLineStyleControls();
  }
}

/** Update the shared data format info panel to match current chart type and format */
export function updateDataFormatTip() {
  const desc = getChartDescriptor(state.currentChartType);
  const title = document.getElementById('chartDataFormatTitle');
  const code = document.getElementById('chartDataFormatCode');
  const hint = document.getElementById('chartDataFormatHint');
  if (!desc || !title || !code) return;

  const fmt = state.dataFormat;
  let example, hintStr, label;

  if (fmt === 'json') {
    example = desc.dataJsonExample || desc.dataExample;
    hintStr = desc.dataJsonHint || desc.dataHint;
    label = 'JSON';
  } else if (fmt === 'tsv') {
    // Derive TSV examples from CSV by replacing commas with tabs
    example = desc.dataExample ? desc.dataExample.replace(/,/g, '\t') : '';
    hintStr = desc.dataHint;
    label = 'TSV';
  } else {
    example = desc.dataExample;
    hintStr = desc.dataHint;
    label = 'CSV';
  }

  title.textContent = desc.label + ' data format (' + label + ')';
  code.textContent = example || hintStr || '';
  if (hint) hint.textContent = example ? hintStr : '';
}

/** Creates a compact grid button for a chart descriptor. */
function createChartTypeButton(desc) {
  const isSelected = state.currentChartType === desc.id;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chart-type-btn' + (isSelected ? ' active' : '');
  btn.dataset.type = desc.id;
  btn.title = desc.summary ? `${desc.label} Chart — ${desc.summary}` : `${desc.label} Chart`;
  btn.role = 'tab';
  btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  btn.innerHTML = `${desc.icon}<span>${escapeHtml(desc.label)}</span>`;
  return btn;
}

/** Syncs active/aria-selected state across Most Used, Core, catalog cards, and trigger pill. */
export function syncChartTypeSelectionUI(chartId = state.currentChartType) {
  $$('.chart-type-btn').forEach(b => {
    const match = b.dataset.type === chartId;
    b.classList.toggle('active', match);
    b.setAttribute('aria-selected', match ? 'true' : 'false');
  });

  if (dom.chartCatalogGrid) {
    dom.chartCatalogGrid.querySelectorAll('.chart-catalog-card').forEach(card => {
      card.classList.toggle('active', card.dataset.type === chartId);
    });
  }

  if (dom.chartCatalogActivePill) {
    const visibleInSidebar = new Set([
      ...(state.smartChartTop ? getTopUsedChartIds(3) : []),
      ...getCoreChartDescriptors().map(d => d.id),
    ]);
    const desc = getChartDescriptor(chartId);
    if (desc && !visibleInSidebar.has(chartId)) {
      dom.chartCatalogActivePill.textContent = desc.label;
      dom.chartCatalogActivePill.hidden = false;
    } else {
      dom.chartCatalogActivePill.hidden = true;
    }
  }
}

function getCoreChartDescriptors() {
  const all = getAllChartDescriptors();
  const core = all.filter(d => d.isCore);
  return core.length > 0 ? core : all.slice(0, 6);
}

/** Updates smart-top toggle controls, New badge, and Most Used + Core shelves. */
export function refreshChartTypeGrid() {
  const descriptors = getAllChartDescriptors();
  const topIds = state.smartChartTop ? getTopUsedChartIds(3) : [];
  const topDescriptors = topIds.map(id => getChartDescriptor(id)).filter(Boolean);

  if (dom.mostUsedShelf && dom.mostUsedGrid) {
    dom.mostUsedGrid.innerHTML = '';
    if (state.smartChartTop && topDescriptors.length > 0) {
      topDescriptors.forEach(desc => dom.mostUsedGrid.appendChild(createChartTypeButton(desc)));
      dom.mostUsedShelf.hidden = false;
    } else {
      dom.mostUsedShelf.hidden = true;
    }
  }

  const coreDescriptors = getCoreChartDescriptors();
  if (dom.coreChartsCount) dom.coreChartsCount.textContent = String(coreDescriptors.length);

  if (dom.chartTypeGrid) {
    dom.chartTypeGrid.innerHTML = '';
    coreDescriptors.forEach(desc => dom.chartTypeGrid.appendChild(createChartTypeButton(desc)));
  }

  if (dom.smartTopToggleBtn) {
    dom.smartTopToggleBtn.textContent = state.smartChartTop ? 'Top: On' : 'Top: Off';
    dom.smartTopToggleBtn.classList.toggle('active', Boolean(state.smartChartTop));
    dom.smartTopToggleBtn.setAttribute('aria-pressed', state.smartChartTop ? 'true' : 'false');
  }
  if (dom.smartTopPopoverToggle) {
    dom.smartTopPopoverToggle.checked = Boolean(state.smartChartTop);
  }
  if (dom.resetChartUsageBtn) {
    dom.resetChartUsageBtn.hidden = !hasRecordedUsage();
  }

  if (dom.chartCatalogTriggerLabel) {
    dom.chartCatalogTriggerLabel.textContent = `Browse all ${descriptors.length} charts`;
  }
  if (dom.chartCatalogTotalCount) {
    dom.chartCatalogTotalCount.textContent = String(descriptors.length);
  }
  if (dom.chartCatalogNewBadge) {
    const unseenNewCount = descriptors.filter(d => isChartUnseenNew(d)).length;
    if (unseenNewCount > 0) {
      dom.chartCatalogNewBadge.textContent = `${unseenNewCount} New`;
      dom.chartCatalogNewBadge.hidden = false;
    } else {
      dom.chartCatalogNewBadge.hidden = true;
    }
  }

  syncChartTypeSelectionUI(state.currentChartType);

  if (dom.chartCatalogPopover && !dom.chartCatalogPopover.hidden) {
    renderCatalogPills();
    renderCatalogGrid();
  }

  syncChartGuideUI();
}

function renderCatalogPills() {
  if (!dom.chartCatalogPills) return;
  const descriptors = getAllChartDescriptors();
  const hasNewCharts = descriptors.some(d => d.isNew);
  const newCount = descriptors.filter(d => isChartUnseenNew(d)).length;

  const pills = [{ id: 'all', label: `All (${descriptors.length})` }];
  if (hasNewCharts) {
    pills.push({ id: 'new', label: newCount > 0 ? `New (${newCount})` : 'New' });
  }
  CHART_CATEGORIES.forEach(cat => {
    const count = descriptors.filter(d => d.category === cat.id).length;
    if (count > 0) pills.push({ id: cat.id, label: cat.label });
  });

  if (!pills.some(p => p.id === catalogCategoryFilter)) {
    catalogCategoryFilter = 'all';
  }

  dom.chartCatalogPills.innerHTML = '';
  pills.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chart-catalog-pill' + (catalogCategoryFilter === p.id ? ' active' : '');
    btn.dataset.cat = p.id;
    btn.textContent = p.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', catalogCategoryFilter === p.id ? 'true' : 'false');
    dom.chartCatalogPills.appendChild(btn);
  });
}

function syncCatalogPillSelection() {
  if (!dom.chartCatalogPills) return;
  dom.chartCatalogPills.querySelectorAll('.chart-catalog-pill').forEach(btn => {
    const isMatch = btn.dataset.cat === catalogCategoryFilter;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
  });
}

function renderCatalogGrid() {
  if (!dom.chartCatalogGrid) return;
  const descriptors = getAllChartDescriptors();
  const q = catalogSearchQuery.trim().toLowerCase();

  const filtered = descriptors.filter(d => {
    if (catalogCategoryFilter === 'new' && !d.isNew) return false;
    if (catalogCategoryFilter !== 'all' && catalogCategoryFilter !== 'new' && d.category !== catalogCategoryFilter) {
      return false;
    }
    if (!q) return true;
    const catLabel = CHART_CATEGORIES.find(c => c.id === d.category)?.label || '';
    return (
      d.label.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      (d.summary && d.summary.toLowerCase().includes(q)) ||
      catLabel.toLowerCase().includes(q)
    );
  });

  dom.chartCatalogGrid.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'chart-catalog-empty';
    empty.textContent = 'No chart types match your search.';
    dom.chartCatalogGrid.appendChild(empty);
    return;
  }

  filtered.forEach(desc => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'chart-catalog-card' + (state.currentChartType === desc.id ? ' active' : '');
    card.dataset.type = desc.id;
    const showNew = isChartUnseenNew(desc);
    card.innerHTML = `
      ${desc.icon}
      <div class="chart-catalog-card-body">
        <div class="chart-catalog-card-head">
          <span class="chart-catalog-card-name">${escapeHtml(desc.label)}</span>
          ${showNew ? '<span class="chart-catalog-new-badge">New</span>' : ''}
        </div>
        <div class="chart-catalog-card-desc">${escapeHtml(desc.summary || desc.dataHint || '')}</div>
      </div>
    `;
    dom.chartCatalogGrid.appendChild(card);
  });
}

export function positionCatalogPopover() {
  const pop = dom.chartCatalogPopover;
  const trigger = dom.chartCatalogTrigger;
  if (!pop || !trigger || pop.hidden) return;

  const rect = trigger.getBoundingClientRect();
  const margin = 12;
  const popW = Math.min(410, window.innerWidth - margin * 2);
  const popH = Math.min(560, window.innerHeight - 76);
  const maxTop = Math.max(60, window.innerHeight - popH - margin);
  const desiredTop = Math.min(Math.max(60, rect.top - 90), maxTop);

  if (window.innerWidth > 768 && rect.right + popW + 10 + margin <= window.innerWidth) {
    pop.style.left = `${Math.round(rect.right + 10)}px`;
    pop.style.top = `${Math.round(desiredTop)}px`;
  } else if (window.innerWidth > 768 && rect.left - popW - 10 >= margin) {
    pop.style.left = `${Math.round(rect.left - popW - 10)}px`;
    pop.style.top = `${Math.round(desiredTop)}px`;
  } else {
    pop.style.left = `${Math.round(Math.max(margin, (window.innerWidth - popW) / 2))}px`;
    const belowTop = rect.bottom + 8;
    const top = (belowTop + 260 <= window.innerHeight) ? belowTop : Math.max(60, window.innerHeight - popH - margin);
    pop.style.top = `${Math.round(top)}px`;
  }
}

function openChartCatalog() {
  if (!dom.chartCatalogPopover) return;
  catalogSearchQuery = '';
  if (dom.chartCatalogSearch) dom.chartCatalogSearch.value = '';
  renderCatalogPills();
  renderCatalogGrid();
  syncChartGuideUI();
  dom.chartCatalogPopover.hidden = false;
  dom.chartCatalogTrigger?.classList.add('open');
  dom.chartCatalogTrigger?.setAttribute('aria-expanded', 'true');
  positionCatalogPopover();
  dom.chartCatalogSearch?.focus();
}

function closeChartCatalog() {
  hideChartGuidePopover();
  if (!dom.chartCatalogPopover || dom.chartCatalogPopover.hidden) return;
  dom.chartCatalogPopover.hidden = true;
  dom.chartCatalogTrigger?.classList.remove('open');
  dom.chartCatalogTrigger?.setAttribute('aria-expanded', 'false');
}

function setSmartChartTopEnabled(enabled, showFeedback = true) {
  state.smartChartTop = Boolean(enabled);
  refreshChartTypeGrid();
  if (window.__debouncedSaveProfile) window.__debouncedSaveProfile();
  if (showFeedback) {
    showToast(state.smartChartTop ? 'Most Used charts enabled' : 'Most Used charts hidden', 'success');
  }
}

/** Switches the active chart type from any shelf or catalog card and updates dependent panels. */
function selectChartType(type) {
  if (!type || !getChartDescriptor(type)) return;

  hideChartGuidePopover();
  const clearedNew = markChartSeen(type);
  resetVisitEditGuard();
  recordChartUsage(type, 'browse');

  state.previousChartType = state.currentChartType;
  state.currentChartType = type;

  if (state.currentChartType === 'segmented' && state.charts.segmented.segments.length === 0 && state.charts.segmented.groups.length === 0) {
    state.charts.segmented.segments = getDefaultSegments();
    ensureGroupStructure();
    renderGroupTabs();
    renderSegmentList();
  } else if (state.currentChartType === 'segmented') {
    ensureGroupStructure();
    renderGroupTabs();
  }

  if (clearedNew) {
    refreshChartTypeGrid();
  } else {
    syncChartTypeSelectionUI(type);
  }
  closeChartCatalog();

  updateSettingsVisibility();
  updateDataFormatTip();
  if (window.__loadSampleForType) window.__loadSampleForType(state.currentChartType);
  if (window.__renderChart) window.__renderChart();
  updateZoomSlider();
}

/** Generates chart type buttons from the registry and wires selection, catalog popover, and usage toggles. */
export function initChartTypeGrid() {
  window.__refreshChartTypeGrid = refreshChartTypeGrid;
  window.__syncChartTypeSelection = syncChartTypeSelectionUI;

  refreshChartTypeGrid();
  initChartGuide();

  const onGridClick = (e) => {
    const btn = e.target.closest('.chart-type-btn');
    if (btn?.dataset.type) selectChartType(btn.dataset.type);
  };
  dom.chartTypeGrid?.addEventListener('click', onGridClick);
  dom.mostUsedGrid?.addEventListener('click', onGridClick);

  dom.smartTopToggleBtn?.addEventListener('click', () => {
    setSmartChartTopEnabled(!state.smartChartTop);
  });

  dom.smartTopPopoverToggle?.addEventListener('change', (e) => {
    setSmartChartTopEnabled(e.target.checked);
  });

  dom.resetChartUsageBtn?.addEventListener('click', () => {
    resetChartUsage();
    refreshChartTypeGrid();
    showToast('Chart usage history cleared', 'success');
  });

  dom.chartCatalogTrigger?.addEventListener('click', () => {
    if (dom.chartCatalogPopover?.hidden) openChartCatalog();
    else closeChartCatalog();
  });

  dom.closeChartCatalogBtn?.addEventListener('click', closeChartCatalog);

  dom.chartCatalogSearch?.addEventListener('input', (e) => {
    catalogSearchQuery = e.target.value || '';
    renderCatalogGrid();
    syncChartGuideUI();
  });

  dom.chartCatalogPills?.addEventListener('click', (e) => {
    const pill = e.target.closest('.chart-catalog-pill');
    if (!pill?.dataset.cat) return;
    catalogCategoryFilter = pill.dataset.cat;
    syncCatalogPillSelection();
    renderCatalogGrid();
    syncChartGuideUI();
  });

  dom.chartCatalogGrid?.addEventListener('click', (e) => {
    const card = e.target.closest('.chart-catalog-card');
    if (card?.dataset.type) selectChartType(card.dataset.type);
  });

  document.addEventListener('click', (e) => {
    if (!dom.chartCatalogPopover || dom.chartCatalogPopover.hidden) return;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const insidePopover = path.includes(dom.chartCatalogPopover) || dom.chartCatalogPopover.contains(e.target);
    const insideTrigger = path.includes(dom.chartCatalogTrigger) || dom.chartCatalogTrigger?.contains(e.target);
    if (insidePopover || insideTrigger) return;
    closeChartCatalog();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.chartCatalogPopover && !dom.chartCatalogPopover.hidden) {
      const guideOpen = dom.chartGuidePopover?.classList.contains('open') || (() => {
        try { return Boolean(dom.chartGuidePopover?.matches(':popover-open')); } catch { return false; }
      })();
      if (guideOpen) {
        hideChartGuidePopover();
        return;
      }
      e.preventDefault();
      closeChartCatalog();
      dom.chartCatalogTrigger?.focus();
    }
  });

  window.addEventListener('resize', positionCatalogPopover);
  window.__repositionCatalogPopover = positionCatalogPopover;

  // Data format info-tip toggle (shared for all chart types)
  const formatBtn = document.getElementById('chartDataFormatBtn');
  const formatPanel = document.getElementById('chartDataFormatTip');
  const formatClose = document.getElementById('chartDataFormatClose');
  if (formatBtn && formatPanel) {
    formatBtn.addEventListener('click', () => formatPanel.classList.toggle('visible'));
  }
  if (formatClose && formatPanel) {
    formatClose.addEventListener('click', () => formatPanel.classList.remove('visible'));
  }

  // Copy example data to clipboard
  const copyBtn = document.getElementById('chartDataFormatCopy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('chartDataFormatCode');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent).then(() => {
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 1500);
      });
    });
  }

  updateDataFormatTip();

  if (dom.innovatorTimeMode) {
    dom.innovatorTimeMode.addEventListener('change', () => {
      const mode = dom.innovatorTimeMode.value;
      if (dom.innovatorTimeYears) dom.innovatorTimeYears.style.display = mode === 'years' ? 'flex' : 'none';
      if (dom.innovatorTimeMonths) dom.innovatorTimeMonths.style.display = mode === 'months' ? 'flex' : 'none';
      if (window.__renderChart) window.__renderChart();
    });
  }

  dom.innovatorTiers.addEventListener('input', () => {
    renderInnovatorTierNames();
  });
}

/** Attaches debounced-render listeners to all settings input controls. */
export function initSettingsListeners() {
  const settingsInputs = [
    dom.chartTitle, dom.chartSubtitle, dom.chartSource,
    dom.chartCurve, dom.pointSize, dom.lineWidth,
    dom.showLegend, dom.showGrid, dom.showDataLabels,
    dom.fillArea, dom.spanGaps, dom.showHighLowPoints, dom.numberFormat,
    dom.dateFormat, dom.maxTicks, dom.yAxisScale,
    dom.showEventMarkers, dom.eventMarkerColor,
    dom.gridStyle, dom.barBorderRadius,
    dom.legendPosition, dom.tooltipStyle, dom.animationSpeed,
    dom.yAxisMin, dom.yAxisMax, dom.xAxisRotation,
    dom.xAxisType, dom.xAxisLabel, dom.yAxisLabel, dom.showYAxisLabel,
    dom.decimalPlaces, dom.currencyPrefix,
    dom.refLineY, dom.refLineLabel,
    dom.chartBgColor, dom.chartGridColor,
    dom.innovatorXLabel, dom.innovatorYLabel,
    dom.innovatorTiers, dom.innovatorSustainingPace,
    dom.innovatorShowIncumbent, dom.innovatorShowDisruptive,
    dom.innovatorIncumbentName, dom.innovatorDisruptiveName,
    dom.innovatorDisruptionPace,
    dom.innovatorDisruptiveStart, dom.innovatorDisruptivePeak,
    dom.innovatorDisruptiveStart, dom.innovatorDisruptivePeak,
    dom.innovatorMarketTop, dom.innovatorMarketBottom,
    dom.innovatorIncumbentBase, dom.innovatorIncumbentSlope,
    dom.innovatorYMin, dom.innovatorYMax, dom.innovatorYScale,
    dom.innovatorCurveType, dom.innovatorTimeMode,
    dom.innovatorStartYear, dom.innovatorEndYear,
    dom.innovatorStartMonth, dom.innovatorEndMonth,
    dom.segmentedMode, dom.segmentedOrientation,
    dom.segmentedThickness, dom.segmentedBorderRadius,
    dom.segmentedGap, dom.segmentedShowLabels, dom.segmentedShowPercent, dom.segmentedShowNumbers, dom.segmentedMinLabelPct,
    dom.kanoShowMustBe, dom.kanoShowPerformance, dom.kanoShowAttractive,
    dom.kanoShowDecay, dom.kanoShowQuadrantLabels,
    dom.kanoBubbleSize, dom.kanoAxisRange,
    dom.dumbbellSortBy, dom.dumbbellSwapSeries,
    dom.dumbbellNumberFormat, dom.dumbbellRatioDecimals,
    dom.dumbbellPointSize, dom.dumbbellLineThickness, dom.dumbbellLineStyle, dom.dumbbellLineOpacity,
    dom.dumbbellShowArrow, dom.dumbbellShowRatio, dom.dumbbellShowValues,
    dom.bubbleSortBy, dom.bubbleSwapSeries,
    dom.bubbleNumberFormat, dom.bubbleRatioDecimals,
    dom.bubbleMaxRadius, dom.bubbleMinRadius, dom.bubbleGapSize, dom.bubbleOpacity,
    dom.bubbleArrowStyle, dom.bubbleShowCategoryLabels, dom.bubbleShowRatio, dom.bubbleShowValues,
    dom.overlaySortBy, dom.overlaySwapSeries,
    dom.overlayNumberFormat, dom.overlayRatioDecimals,
    dom.overlayBarOpacity, dom.overlayFgOpacity, dom.overlayBorderRadius,
    dom.overlayBorderStyle, dom.overlayDisplayMode, dom.overlayShowRatio, dom.overlayShowValues,
    dom.dualBarInnerWidth, dom.dualBarOuterOpacity, dom.dualBarBorderRadius, dom.dualBarShowValues,
  ];

  settingsInputs.forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (el === dom.maxTicks && dom.maxTicksValue) {
        dom.maxTicksValue.textContent = dom.maxTicks.value;
      }
      if (el === dom.barBorderRadius && dom.barBorderRadiusValue) {
        dom.barBorderRadiusValue.textContent = dom.barBorderRadius.value;
      }
      if (el === dom.xAxisRotation && dom.xAxisRotationValue) {
        dom.xAxisRotationValue.textContent = dom.xAxisRotation.value + '\u00B0';
      }
      if (el === dom.chartBgColor) {
        state.userBgColor = dom.chartBgColor.value;
      }
      if (el === dom.chartGridColor) {
        state.userGridColor = dom.chartGridColor.value;
      }
      if (el === dom.innovatorTiers && dom.innovatorTiersValue) {
        dom.innovatorTiersValue.textContent = dom.innovatorTiers.value;
      }
      if (el === dom.innovatorSustainingPace && dom.innovatorSustainingPaceValue) {
        dom.innovatorSustainingPaceValue.textContent = dom.innovatorSustainingPace.value;
      }
      if (el === dom.innovatorDisruptionPace && dom.innovatorDisruptionPaceValue) {
        dom.innovatorDisruptionPaceValue.textContent = dom.innovatorDisruptionPace.value;
      }
      if (el === dom.innovatorDisruptiveStart && dom.innovatorDisruptiveStartValue) {
        dom.innovatorDisruptiveStartValue.textContent = dom.innovatorDisruptiveStart.value;
      }
      if (el === dom.innovatorDisruptivePeak && dom.innovatorDisruptivePeakValue) {
        dom.innovatorDisruptivePeakValue.textContent = dom.innovatorDisruptivePeak.value;
      }
      if (el === dom.innovatorMarketTop && dom.innovatorMarketTopValue) {
        dom.innovatorMarketTopValue.textContent = dom.innovatorMarketTop.value;
      }
      if (el === dom.innovatorMarketBottom && dom.innovatorMarketBottomValue) {
        dom.innovatorMarketBottomValue.textContent = dom.innovatorMarketBottom.value;
      }
      if (el === dom.innovatorIncumbentBase && dom.innovatorIncumbentBaseValue) {
        dom.innovatorIncumbentBaseValue.textContent = dom.innovatorIncumbentBase.value;
      }
      if (el === dom.innovatorIncumbentSlope && dom.innovatorIncumbentSlopeValue) {
        dom.innovatorIncumbentSlopeValue.textContent = dom.innovatorIncumbentSlope.value;
      }
      if (el === dom.segmentedThickness && dom.segmentedThicknessValue) {
        dom.segmentedThicknessValue.textContent = dom.segmentedThickness.value;
      }
      if (el === dom.segmentedBorderRadius && dom.segmentedBorderRadiusValue) {
        dom.segmentedBorderRadiusValue.textContent = dom.segmentedBorderRadius.value;
      }
      if (el === dom.segmentedGap && dom.segmentedGapValue) {
        dom.segmentedGapValue.textContent = dom.segmentedGap.value;
      }
      if (el === dom.segmentedMinLabelPct && dom.segmentedMinLabelPctValue) {
        dom.segmentedMinLabelPctValue.textContent = dom.segmentedMinLabelPct.value + '%';
      }
      if (el === dom.segmentedShowNumbers && dom.segmentedMinLabelPctGroup) {
        dom.segmentedMinLabelPctGroup.style.display = dom.segmentedShowNumbers.checked ? '' : 'none';
      }
      if (el === dom.segmentedMode) {
        renderSegmentList();
      }
      if (el === dom.kanoBubbleSize && dom.kanoBubbleSizeValue) {
        dom.kanoBubbleSizeValue.textContent = dom.kanoBubbleSize.value;
      }
      if (el === dom.kanoAxisRange && dom.kanoAxisRangeValue) {
        dom.kanoAxisRangeValue.textContent = dom.kanoAxisRange.value;
      }
      if (el === dom.dumbbellPointSize && dom.dumbbellPointSizeValue) {
        dom.dumbbellPointSizeValue.textContent = dom.dumbbellPointSize.value;
      }
      if (el === dom.dumbbellLineThickness && dom.dumbbellLineThicknessValue) {
        dom.dumbbellLineThicknessValue.textContent = dom.dumbbellLineThickness.value;
      }
      if (el === dom.dumbbellRatioDecimals && dom.dumbbellRatioDecimalsValue) {
        dom.dumbbellRatioDecimalsValue.textContent = dom.dumbbellRatioDecimals.value;
      }
      if (el === dom.dumbbellLineOpacity && dom.dumbbellLineOpacityValue) {
        dom.dumbbellLineOpacityValue.textContent = dom.dumbbellLineOpacity.value;
      }
      if (el === dom.bubbleMaxRadius && dom.bubbleMaxRadiusValue) {
        dom.bubbleMaxRadiusValue.textContent = dom.bubbleMaxRadius.value;
      }
      if (el === dom.bubbleGapSize && dom.bubbleGapSizeValue) {
        dom.bubbleGapSizeValue.textContent = dom.bubbleGapSize.value;
      }
      if (el === dom.bubbleMinRadius && dom.bubbleMinRadiusValue) {
        dom.bubbleMinRadiusValue.textContent = dom.bubbleMinRadius.value;
      }
      if (el === dom.bubbleRatioDecimals && dom.bubbleRatioDecimalsValue) {
        dom.bubbleRatioDecimalsValue.textContent = dom.bubbleRatioDecimals.value;
      }
      if (el === dom.bubbleOpacity && dom.bubbleOpacityValue) {
        dom.bubbleOpacityValue.textContent = dom.bubbleOpacity.value;
      }
      if (el === dom.overlayBarOpacity && dom.overlayBarOpacityValue) {
        dom.overlayBarOpacityValue.textContent = dom.overlayBarOpacity.value;
      }
      if (el === dom.overlayFgOpacity && dom.overlayFgOpacityValue) {
        dom.overlayFgOpacityValue.textContent = dom.overlayFgOpacity.value;
      }
      if (el === dom.overlayBorderRadius && dom.overlayBorderRadiusValue) {
        dom.overlayBorderRadiusValue.textContent = dom.overlayBorderRadius.value;
      }
      if (el === dom.overlayRatioDecimals && dom.overlayRatioDecimalsValue) {
        dom.overlayRatioDecimalsValue.textContent = dom.overlayRatioDecimals.value;
      }
      if (el === dom.dualBarInnerWidth && dom.dualBarInnerWidthValue) {
        dom.dualBarInnerWidthValue.textContent = dom.dualBarInnerWidth.value + '%';
      }
      if (el === dom.dualBarOuterOpacity && dom.dualBarOuterOpacityValue) {
        dom.dualBarOuterOpacityValue.textContent = dom.dualBarOuterOpacity.value + '%';
      }
      if (el === dom.dualBarBorderRadius && dom.dualBarBorderRadiusValue) {
        dom.dualBarBorderRadiusValue.textContent = dom.dualBarBorderRadius.value;
      }
      if (recordChartUsage(state.currentChartType, 'edit')) {
        refreshChartTypeGrid();
      }
      if (window.__debouncedRender) window.__debouncedRender();
      if (window.__debouncedSaveProfile) window.__debouncedSaveProfile();
    });
  });

  dom.maxRowsInput.addEventListener('change', () => {
    CONFIG.hardRowLimit = parseInt(dom.maxRowsInput.value) || 50000;
    if (window.__debouncedSaveProfile) window.__debouncedSaveProfile();
  });
}
