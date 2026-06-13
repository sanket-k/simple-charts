/** Dual-Bar chart — concentric horizontal bars with outer (target) and inner (current) layers. */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, hexToRgba, showToast } from '../utils.js';
import { formatNumber } from '../format.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { getCompareColors } from './compare-utils.js';
import { registerChart } from './registry.js';

/** Draw a rounded rectangle on canvas. */
function roundedRect(ctx, x, y, w, h, r) {
  if (h <= 0 || w <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Self-managed render: builds the dual-bar chart with concentric bar layers. */
export function renderDualBarChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  const parsed = state.parsedData;
  if (!parsed || !parsed.datasets || parsed.datasets.length < 2) {
    showToast('Dual-Bar requires 2 data series (outer and inner values).', 'error');
    return;
  }
  if (!parsed.labels || parsed.labels.length === 0) {
    showToast('No labels found. Add a label column to your data.', 'error');
    return;
  }

  const outerData = parsed.datasets[0];
  const innerData = parsed.datasets.length > 1 ? parsed.datasets[1] : parsed.datasets[0];

  const outerName = outerData.name || 'Target';
  const innerName = innerData.name || 'Current';
  const outerValues = outerData.values.map(v => (v == null || isNaN(v) ? 0 : v));
  const innerValues = innerData.values.map(v => (v == null || isNaN(v) ? 0 : v));
  const labels = parsed.labels;

  // Validate inclusion rule: inner must be <= outer
  const violations = [];
  for (let i = 0; i < outerValues.length; i++) {
    if (innerValues[i] > outerValues[i]) violations.push(labels[i]);
  }
  if (violations.length > 0) {
    showToast(`Inner values exceed outer for: ${violations.slice(0, 3).join(', ')}${violations.length > 3 ? '...' : ''}`, 'warning');
  }

  // Capture current data for plugin closure
  const outerVals = outerValues;
  const innerVals = innerValues;
  const outerLabel = outerName;
  const innerLabel = innerName;
  const categoryLabels = labels;

  // Settings
  const innerRatio = parseInt(dom.dualBarInnerWidth?.value) / 100 || 0.55;
  const outerOpacity = parseInt(dom.dualBarOuterOpacity?.value) / 100 || 0.20;
  const borderRadius = parseInt(dom.dualBarBorderRadius?.value) ?? 4;
  const showValues = dom.dualBarShowValues?.checked !== false;

  const c = getThemeColors();
  const colors = getCompareColors();
  const outerColor = colors.primary;
  const innerColor = colors.secondary;

  // Custom plugin: draw concentric bars and value labels
  const dualBarDrawPlugin = {
    id: 'dualBarDraw',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const xScale = chart.scales.x;

      ctx.save();

      for (let i = 0; i < categoryLabels.length; i++) {
        const bar = meta.data[i];
        if (!bar) continue;

        const barY = bar.y;
        const barH = bar.height;
        const barLeft = xScale.getPixelForValue(0);

        // Outer bar — full height, translucent
        const outerRight = bar.x;
        const outerW = outerRight - barLeft;
        if (outerW > 0) {
          ctx.fillStyle = hexToRgba(outerColor, outerOpacity);
          roundedRect(ctx, barLeft, barY - barH / 2, outerW, barH, borderRadius);
        }

        // Inner bar — narrower height, solid, centered
        const innerH = barH * innerRatio;
        const innerRight = xScale.getPixelForValue(innerVals[i]);
        const innerW = innerRight - barLeft;
        if (innerW > 0) {
          ctx.fillStyle = hexToRgba(innerColor, 0.9);
          roundedRect(ctx, barLeft, barY - innerH / 2, innerW, innerH, Math.max(0, borderRadius - 2));
        }

        // Right-aligned value label
        if (showValues) {
          const labelText = `${formatNumber(innerVals[i])} → ${formatNumber(outerVals[i])}`;
          ctx.font = FONTS.datalabels.string ? FONTS.datalabels.string : `${FONTS.datalabels.weight || 500} ${FONTS.datalabels.size}px ${FONTS.datalabels.family}`;
          ctx.fillStyle = c.text;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, outerRight + 8, barY);
        }
      }

      ctx.restore();
    }
  };

  const maxVal = Math.max(...outerVals, ...innerVals);
  const xMax = Math.min(Math.ceil(maxVal * 1.1 / 10) * 10, 200);

  const config = {
    type: 'bar',
    plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, dualBarDrawPlugin],
    data: {
      labels: categoryLabels,
      datasets: [{
        label: outerLabel,
        data: outerVals,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        barPercentage: 0.75,
        categoryPercentage: 0.85,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: ASPECT_RATIOS.square,
      indexAxis: 'y',
      animation: { duration: safeInt(dom.animationSpeed?.value, 600), easing: 'easeOutQuart' },
      scales: {
        x: {
          min: 0,
          suggestedMax: xMax,
          grid: {
            color: c.grid,
            drawBorder: false,
            lineWidth: 0.5,
          },
          border: { display: false },
          ticks: {
            color: c.textSecondary,
            font: FONTS.tick,
            callback(v) { return formatNumber(v); },
          },
          title: {
            display: true,
            text: outerLabel,
            color: c.textSecondary,
            font: FONTS.axisTitle,
          },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: c.textSecondary,
            font: FONTS.tick,
          },
        },
      },
      plugins: {
        legend: {
          ...getLegendBase(),
          display: dom.showLegend?.checked ?? true,
          labels: {
            ...getLegendBase().labels,
            generateLabels(chart) {
              return [
                {
                  text: `${outerLabel} (wide, tinted)`,
                  fillStyle: hexToRgba(outerColor, outerOpacity),
                  strokeStyle: hexToRgba(outerColor, 0.5),
                  lineWidth: 1,
                  hidden: false,
                  index: 0,
                },
                {
                  text: `${innerLabel} (narrow, solid)`,
                  fillStyle: hexToRgba(innerColor, 0.9),
                  strokeStyle: innerColor,
                  lineWidth: 1,
                  hidden: false,
                  index: 1,
                },
              ];
            },
          },
        },
        tooltip: {
          ...getTooltipBase(),
          callbacks: {
            title(items) {
              return categoryLabels[items[0].dataIndex] || '';
            },
            label(item) {
              const i = item.dataIndex;
              return [
                `${outerLabel}: ${formatNumber(outerVals[i])}`,
                `${innerLabel}: ${formatNumber(innerVals[i])}`,
              ];
            },
          },
        },
        datalabels: { display: false },
        title: {
          display: !!dom.chartTitle?.value,
          text: dom.chartTitle?.value || '',
          color: c.text,
          font: FONTS.title,
          padding: { bottom: 8 },
        },
        subtitle: {
          display: !!dom.chartSubtitle?.value,
          text: dom.chartSubtitle?.value || '',
          color: c.textSecondary,
          font: FONTS.subtitle,
          padding: { bottom: 4 },
        },
      },
      layout: {
        padding: {
          top: dom.chartTitle?.value ? 8 : 4,
          bottom: dom.chartSource?.value ? 24 : 8,
          left: 4,
          right: 80,
        },
      },
    },
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'dual-bar',
  label: 'Dual-Bar',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="28" height="6" rx="2" fill="currentColor" opacity="0.15" stroke="none"/><rect x="6" y="7.5" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.7" stroke="none"/><rect x="6" y="17" width="28" height="6" rx="2" fill="currentColor" opacity="0.15" stroke="none"/><rect x="6" y="18.5" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.7" stroke="none"/><rect x="6" y="28" width="28" height="6" rx="2" fill="currentColor" opacity="0.15" stroke="none"/><rect x="6" y="29.5" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.7" stroke="none"/></svg>',
  dataHint: 'Two series per category: first series = outer bar (target/ceiling), second series = inner bar (current/progress). Inner values should be ≤ outer values. All rows must share the same unit.',
  dataExample: 'Category, Target, Current\nEngineering, 100, 78\nMarketing, 100, 92\nSales, 100, 65\nDesign, 100, 88',
  dataJsonHint: 'Provide labels and exactly 2 datasets. First dataset = outer (target), second = inner (current). Inner ≤ outer per row.',
  dataJsonExample: '{\n  "labels": ["Engineering", "Marketing", "Sales", "Design"],\n  "datasets": [\n    { "name": "Target", "values": [100, 100, 100, 100] },\n    { "name": "Current", "values": [78, 92, 65, 88] }\n  ]\n}',
  isSelfManaged: true,
  builder: () => renderDualBarChart(),
  capabilities: { legend: true, grid: true },
});
