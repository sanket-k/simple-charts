import { CONFIG, DEFAULT_COLORS } from '../constants.js';
import { state } from '../state.js';
import { dom, $$ } from '../dom.js';
import { renderGroupTabs, renderSegmentList, getDefaultSegments, ensureGroupStructure } from '../charts/segmented.js';
import { renderInnovatorTierNames } from '../charts/innovator.js';
import { renderComboDatasetTypes } from './combo-ui.js';
import { renderAxisAssignments } from './dual-axis.js';
import { updateZoomSlider } from '../data.js';

export function updateSettingsVisibility() {
  const t = state.currentChartType;
  const isAxisChart = ['line', 'timeline', 'bar', 'vbar', 'area', 'scatter', 'waterfall', 'combo'].includes(t);

  if (dom.timelineSettings) dom.timelineSettings.style.display = (t === 'timeline' || t === 'innovator') ? 'block' : 'none';
  if (dom.innovatorSettings) dom.innovatorSettings.style.display = t === 'innovator' ? 'block' : 'none';
  if (dom.segmentedSettings) dom.segmentedSettings.style.display = t === 'segmented' ? 'block' : 'none';

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

  toggle(dom.chartCurve, ['line', 'timeline', 'area', 'radar', 'combo'].includes(t));
  toggle(dom.pointSize, ['line', 'timeline', 'scatter', 'radar', 'innovator', 'combo'].includes(t));
  toggle(dom.lineWidth, ['line', 'timeline', 'area', 'radar', 'innovator', 'combo'].includes(t));

  const hasGrid = ['line', 'timeline', 'bar', 'vbar', 'area', 'scatter', 'waterfall', 'combo', 'segmented'].includes(t);
  toggle(dom.showGrid, hasGrid);
  toggle(dom.gridStyle, hasGrid);
  toggle(dom.chartGridColor, hasGrid);

  toggle(dom.fillArea, ['line', 'timeline'].includes(t));
  toggle(dom.spanGaps, ['line', 'timeline', 'area'].includes(t));
  toggle(dom.showHighLowPoints, ['line', 'timeline', 'area', 'radar', 'combo'].includes(t));
  toggle(dom.barBorderRadius, ['bar', 'vbar', 'waterfall', 'combo'].includes(t));

  toggle(dom.legendPosition, t !== 'innovator');

  const isFormattingChart = isAxisChart;
  toggle(dom.xAxisType, isFormattingChart);
  toggle(dom.xAxisLabel, isFormattingChart);
  toggle(dom.yAxisLabel, isFormattingChart);
  toggle(dom.dateFormat, isFormattingChart);
  toggle(dom.maxTicks, isFormattingChart);
  toggle(dom.yAxisScale, isFormattingChart);
  toggleRow(dom.yAxisMin, isFormattingChart);
  toggle(dom.xAxisRotation, isFormattingChart);

  if (dom.refLineY) {
    const annSection = dom.refLineY.closest('.panel-section');
    if (annSection) annSection.style.display = isAxisChart ? '' : 'none';
  }

  if (dom.dualAxisSection) {
    if (!isAxisChart || !state.rawParsedData || state.rawParsedData.datasets.length < 2) {
      dom.dualAxisSection.style.display = 'none';
    } else {
      dom.dualAxisSection.style.display = 'block';
    }
  }

  const comboEl = document.getElementById('comboSettings');
  if (comboEl) {
    if (t === 'combo' && state.rawParsedData && state.rawParsedData.datasets.length >= 2) {
      comboEl.style.display = 'block';
      renderComboDatasetTypes();
    } else {
      comboEl.style.display = 'none';
    }
  }
}

export function initChartTypeGrid() {
  dom.chartTypeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.chart-type-btn');
    if (!btn) return;
    $$('.chart-type-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    state.currentChartType = btn.dataset.type;

    if (state.currentChartType === 'segmented' && state.segmentedSegments.length === 0 && state.segmentedGroups.length === 0) {
      state.segmentedSegments = getDefaultSegments();
      ensureGroupStructure();
      renderGroupTabs();
      renderSegmentList();
    } else if (state.currentChartType === 'segmented') {
      ensureGroupStructure();
      renderGroupTabs();
    }

    updateSettingsVisibility();
    if (window.__renderChart) window.__renderChart();
    updateZoomSlider();
  });

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
    dom.xAxisType, dom.xAxisLabel, dom.yAxisLabel,
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
    dom.segmentedGap, dom.segmentedShowLabels, dom.segmentedShowPercent,
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
      if (window.__debouncedRender) window.__debouncedRender();
    });
  });

  dom.maxRowsInput.addEventListener('change', () => {
    CONFIG.hardRowLimit = parseInt(dom.maxRowsInput.value) || 50000;
  });
}
