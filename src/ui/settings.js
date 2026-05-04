/** Settings panel — visibility toggling, chart type grid, format hints, and all settings inputs. */
import { CONFIG, DEFAULT_COLORS } from '../constants.js';
import { state } from '../state.js';
import { dom, $$ } from '../dom.js';
import { getCapabilities, getAllChartDescriptors, getChartDescriptor } from '../charts/registry.js';
import { renderGroupTabs, renderSegmentList, getDefaultSegments, ensureGroupStructure } from '../charts/segmented.js';
import { renderInnovatorTierNames } from '../charts/innovator.js';
import { renderComboDatasetTypes } from './combo-ui.js';
import { renderAxisAssignments } from './dual-axis.js';
import { renderLineStyleControls } from './line-style-ui.js';
import { updateZoomSlider } from '../data.js';

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
  };
  Object.entries(chartPanelMap).forEach(([id, panel]) => {
    if (panel) panel.style.display = t === id ? 'block' : 'none';
  });
  // Timeline settings panel also shows for innovator
  if (dom.timelineSettings) dom.timelineSettings.style.display = (t === 'timeline' || t === 'innovator') ? 'block' : 'none';

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
      dom.dualAxisSection.style.display = 'block';
    }
  }

  const comboEl = dom.comboSettings;
  if (comboEl) {
    if (t === 'combo' && state.rawParsedData && state.rawParsedData.datasets.length >= 2) {
      comboEl.style.display = 'block';
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
    lineStyleSection.style.display = showLineStyles ? 'block' : 'none';
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

/** Generate chart type grid buttons from registry */
function buildChartTypeGrid() {
  const grid = dom.chartTypeGrid;
  if (!grid) return;

  grid.innerHTML = '';
  const descriptors = getAllChartDescriptors();

  descriptors.forEach((desc, i) => {
    const btn = document.createElement('button');
    btn.className = 'chart-type-btn' + (i === 0 ? ' active' : '');
    btn.dataset.type = desc.id;
    btn.title = desc.label + ' Chart';
    btn.role = 'tab';
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.innerHTML = `${desc.icon}<span>${desc.label}</span>`;
    grid.appendChild(btn);
  });
}

/** Generates chart type buttons from the registry and wires selection behavior. */
export function initChartTypeGrid() {
  // Auto-generate buttons from registry
  buildChartTypeGrid();

  dom.chartTypeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.chart-type-btn');
    if (!btn) return;
    $$('.chart-type-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    state.previousChartType = state.currentChartType;
    state.currentChartType = btn.dataset.type;

    if (state.currentChartType === 'segmented' && state.charts.segmented.segments.length === 0 && state.charts.segmented.groups.length === 0) {
      state.charts.segmented.segments = getDefaultSegments();
      ensureGroupStructure();
      renderGroupTabs();
      renderSegmentList();
    } else if (state.currentChartType === 'segmented') {
      ensureGroupStructure();
      renderGroupTabs();
    }

    updateSettingsVisibility();
    updateDataFormatTip();
    if (window.__loadSampleForType) window.__loadSampleForType(state.currentChartType);
    if (window.__renderChart) window.__renderChart();
    updateZoomSlider();
  });

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
    dom.innovatorYMin, dom.innovatorYMax,
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
      if (window.__debouncedRender) window.__debouncedRender();
    });
  });

  dom.maxRowsInput.addEventListener('change', () => {
    CONFIG.hardRowLimit = parseInt(dom.maxRowsInput.value) || 50000;
  });
}
