/** Kano Model chart — scatter plot with must-be/performance/attractive curves and feature placement. */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba } from '../utils.js';
import { getThemeColors, getMultiColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase } from './base-options.js';
import { registerChart } from './registry.js';

/** Parse 3-column CSV (Feature, Implementation, Satisfaction) into feature objects */
export function parseKanoData(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split('\n');
  const features = [];
  const startIdx = (lines[0] && isNaN(parseFloat(lines[0].split(/[,;\t]/)[1]))) ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/).map(s => s.trim());
    if (parts.length >= 3) {
      const impl = parseFloat(parts[1]);
      const sat = parseFloat(parts[2]);
      if (!isNaN(impl) && !isNaN(sat)) {
        features.push({ name: parts[0], x: impl, y: sat });
      }
    }
  }
  return features;
}

/** Generate curve points for the three Kano curves */
function generateCurvePoints(range, numPoints, type) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const x = -range + (2 * range * i) / numPoints;
    let y;
    const norm = x / range; // -1 to +1
    switch (type) {
      case 'mustBe':
        // Steep dissatisfaction for low implementation, flattens at neutral
        y = -Math.sign(norm) * Math.sqrt(Math.abs(norm)) * range;
        break;
      case 'performance':
        // Linear: straight diagonal
        y = x;
        break;
      case 'attractive':
        // Flat at left, steep rise at right
        y = Math.sign(norm) * Math.pow(Math.abs(norm), 2) * range;
        break;
      default:
        y = 0;
    }
    points.push({ x, y });
  }
  return points;
}

/** Self-managed render for the Kano Model chart */
export function renderKanoChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  const c = getThemeColors();
  const colors = getMultiColors();
  const animDuration = safeInt(dom.animationSpeed?.value, 600);

  const axisRange = safeInt(dom.kanoAxisRange?.value, 10);
  const bubbleSize = safeInt(dom.kanoBubbleSize?.value, 8);
  const showMustBe = dom.kanoShowMustBe?.checked ?? true;
  const showPerformance = dom.kanoShowPerformance?.checked ?? true;
  const showAttractive = dom.kanoShowAttractive?.checked ?? true;
  const showDecay = dom.kanoShowDecay?.checked ?? false;
  const showQuadrantLabels = dom.kanoShowQuadrantLabels?.checked ?? true;

  // Parse features from textarea
  const features = parseKanoData(dom.dataTextarea.value);
  state.charts.kano.features = features;

  const datasets = [];

  // Feature scatter points
  if (features.length > 0) {
    datasets.push({
      label: 'Features',
      data: features.map(f => ({ x: f.x, y: f.y, name: f.name })),
      backgroundColor: hexToRgba(colors[0] || c.hero, 0.75),
      borderColor: colors[0] || c.hero,
      borderWidth: 2,
      pointRadius: bubbleSize,
      pointHoverRadius: bubbleSize + 3,
      pointHoverBorderWidth: 3,
      pointHoverBorderColor: c.bg,
      order: 0,
    });
  }

  const curveColor = c.textMuted;
  const curveOpacity = 0.5;

  // Must-be curve (threshold)
  if (showMustBe) {
    datasets.push({
      label: 'Must-be',
      data: generateCurvePoints(axisRange, 60, 'mustBe'),
      borderColor: hexToRgba(curveColor, curveOpacity),
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 3],
      pointRadius: 0,
      showLine: true,
      tension: 0.35,
      fill: false,
      order: 3,
    });
  }

  // Performance curve (linear)
  if (showPerformance) {
    datasets.push({
      label: 'Performance',
      data: generateCurvePoints(axisRange, 2, 'performance'),
      borderColor: hexToRgba(curveColor, curveOpacity),
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      tension: 0,
      fill: false,
      order: 2,
    });
  }

  // Attractive curve (delighter)
  if (showAttractive) {
    datasets.push({
      label: 'Attractive',
      data: generateCurvePoints(axisRange, 60, 'attractive'),
      borderColor: hexToRgba(curveColor, curveOpacity),
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 3],
      pointRadius: 0,
      showLine: true,
      tension: 0.35,
      fill: false,
      order: 4,
    });
  }

  // Decay arrow (line from top-left to bottom-right)
  if (showDecay) {
    const decayStart = axisRange * 0.7;
    datasets.push({
      label: 'Feature Decay',
      data: [
        { x: -decayStart, y: decayStart },
        { x: decayStart, y: -decayStart },
      ],
      borderColor: hexToRgba(c.hero, 0.35),
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      showLine: true,
      tension: 0,
      fill: false,
      order: 5,
    });
  }

  // Annotations
  const annotations = {};

  // Zero-crosshair lines
  annotations.zeroLineX = {
    type: 'line',
    xMin: 0,
    xMax: 0,
    borderColor: hexToRgba(c.textSecondary, 0.2),
    borderWidth: 1,
    borderDash: [4, 4],
  };
  annotations.zeroLineY = {
    type: 'line',
    yMin: 0,
    yMax: 0,
    borderColor: hexToRgba(c.textSecondary, 0.2),
    borderWidth: 1,
    borderDash: [4, 4],
  };

  // Quadrant labels
  if (showQuadrantLabels) {
    const ql = axisRange * 0.55;
    const labelStyle = {
      color: hexToRgba(c.textSecondary, 0.5),
      font: FONTS.kanoQuadrant,
      backgroundColor: 'transparent',
    };

    // Top-left quadrant: Attractive features (low impl, high satisfaction)
    annotations.qlAttractive = {
      type: 'label',
      xValue: -ql,
      yValue: ql,
      content: ['Attractive'],
      ...labelStyle,
    };

    // Top-right quadrant: Performance (high impl, high satisfaction)
    annotations.qlPerformance = {
      type: 'label',
      xValue: ql,
      yValue: ql,
      content: ['Performance'],
      ...labelStyle,
    };

    // Bottom-left quadrant: Must-be (low impl, low satisfaction)
    annotations.qlMustBe = {
      type: 'label',
      xValue: -ql,
      yValue: -ql,
      content: ['Must-be'],
      ...labelStyle,
    };

    // Bottom-right quadrant: Indifferent (high impl, low satisfaction)
    annotations.qlIndifferent = {
      type: 'label',
      xValue: ql,
      yValue: -ql,
      content: ['Indifferent'],
      ...labelStyle,
    };
  }

  // Feature name labels as annotations (respects Data Labels toggle)
  const showDataLabels = dom.showDataLabels?.checked ?? false;
  if (showDataLabels && features.length > 0) {
    features.forEach((f, i) => {
      annotations[`feature_${i}`] = {
        type: 'label',
        xValue: f.x,
        yValue: f.y,
        content: [f.name],
        color: c.text,
        font: FONTS.datalabels,
        backgroundColor: hexToRgba(c.bg, 0.8),
        padding: { x: 4, y: 2 },
        borderRadius: 3,
        yAdjust: -bubbleSize - 6,
        callout: { display: false },
      };
    });
  }

  const showGrid = dom.showGrid?.checked ?? false;
  const chartGrid = state.userGridColor || c.grid;

  const config = {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: animDuration, easing: 'easeOutQuart' },
      layout: {
        padding: {
          top: dom.chartTitle.value ? 8 : 4,
          bottom: dom.chartSource.value ? 24 : 8,
          left: 4,
          right: 20,
        },
      },
      plugins: {
        title: {
          display: !!dom.chartTitle.value,
          text: dom.chartTitle.value,
          color: c.text,
          font: FONTS.title,
          padding: { bottom: dom.chartSubtitle.value ? 2 : 12 },
        },
        subtitle: {
          display: !!dom.chartSubtitle.value,
          text: dom.chartSubtitle.value,
          color: c.textSecondary,
          font: FONTS.subtitle,
          padding: { bottom: 16 },
        },
        legend: {
          ...getLegendBase(),
          position: dom.legendPosition?.value || 'top',
          align: 'end',
          labels: {
            ...getLegendBase().labels,
            boxWidth: 12,
            boxHeight: 3,
            usePointStyle: false,
          },
          filter: (item) => item.text !== 'Features',
        },
        tooltip: {
          ...getTooltipBase(),
          callbacks: {
            title: (items) => {
              const pt = items[0]?.raw;
              if (pt?.name) return pt.name;
              return items[0]?.dataset.label || '';
            },
            label: (ctx) => {
              if (ctx.dataset.label === 'Features') return '';
              return `  ${ctx.dataset.label}`;
            },
            afterTitle: (items) => {
              const pt = items[0]?.raw;
              if (pt?.name) {
                return `Implementation: ${pt.x}  |  Satisfaction: ${pt.y}`;
              }
              return '';
            },
          },
        },
        datalabels: { display: false },
        annotation: { annotations },
      },
      scales: {
        x: {
          type: 'linear',
          min: -axisRange,
          max: axisRange,
          title: {
            display: true,
            text: dom.xAxisLabel?.value || 'Implementation',
            color: c.textSecondary,
            font: FONTS.axisTitleLg,
          },
          grid: {
            display: showGrid,
            color: chartGrid,
            lineWidth: 0.5,
          },
          ticks: {
            color: c.textMuted,
            font: FONTS.tickSmall,
            maxTicksLimit: 5,
            callback: (val) => {
              if (val <= -axisRange) return 'Not Impl.';
              if (val >= axisRange) return 'Fully Impl.';
              if (val === 0) return '0';
              return '';
            },
          },
          border: { display: false },
        },
        y: {
          type: 'linear',
          min: -axisRange,
          max: axisRange,
          title: {
            display: true,
            text: dom.yAxisLabel?.value || 'Satisfaction',
            color: c.textSecondary,
            font: FONTS.axisTitleLg,
          },
          grid: {
            display: showGrid,
            color: chartGrid,
            lineWidth: 0.5,
          },
          ticks: {
            color: c.textMuted,
            font: FONTS.tickSmall,
            maxTicksLimit: 5,
            callback: (val) => {
              if (val <= -axisRange) return 'Dissatisfied';
              if (val >= axisRange) return 'Delighted';
              if (val === 0) return '0';
              return '';
            },
          },
          border: { display: false },
        },
      },
    },
    plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'kano',
  label: 'Kano',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 34C14 30 22 18 28 10L34 6" stroke="currentColor" stroke-width="1.8" opacity="0.45"/><line x1="6" y1="34" x2="34" y2="6" stroke="currentColor" stroke-width="1.8"/><path d="M6 28C16 28 26 18 34 6" stroke="currentColor" stroke-width="1.8" opacity="0.45"/><circle cx="18" cy="12" r="2" fill="currentColor" opacity="0.7"/><circle cx="26" cy="18" r="2" fill="currentColor" opacity="0.7"/><circle cx="14" cy="22" r="2" fill="currentColor" opacity="0.7"/></svg>',
  dataHint: 'First column = feature names, second column = implementation cost (1–10), third column = user satisfaction (-3 to 10). Plots on the Kano model diagram.',
  dataExample: 'Feature, Implementation, Satisfaction\nTouchscreen, 8, 9\nFast Charging, 6, 7\nUSB-C, 9, 3',
  dataJsonHint: 'Array of objects with feature name, implementation cost (1–10), and user satisfaction (-3 to 10).',
  dataJsonExample: '[\n  { "Feature": "Touchscreen", "Implementation": 8, "Satisfaction": 9 },\n  { "Feature": "Fast Charging", "Implementation": 6, "Satisfaction": 7 },\n  { "Feature": "USB-C", "Implementation": 9, "Satisfaction": 3 }\n]',
  isSelfManaged: true,
  builder: () => renderKanoChart(),
  capabilities: { legend: true },
});
