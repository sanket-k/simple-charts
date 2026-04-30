import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt } from '../utils.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, getCategoryYAxis, getLogXAxis, drawRatioPill, sortCompareData, swapSeries, formatCompareNumber } from './compare-utils.js';
import { registerChart } from './registry.js';

export function renderDumbbellChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  let data = validateCompareData(state.parsedData);
  if (!data) return;

  // Shared settings: sort, swap, format, decimals
  const sortBy = dom.dumbbellSortBy?.value || 'original';
  const shouldSwap = dom.dumbbellSwapSeries?.checked;
  const numFmt = dom.dumbbellNumberFormat?.value || 'raw';
  const ratioDecimals = parseInt(dom.dumbbellRatioDecimals?.value) ?? 1;

  if (shouldSwap) {
    const swapped = swapSeries(data.ds1, data.ds2);
    data = { ...data, ...swapped };
  }
  const sorted = sortCompareData(data.labels, data.ds1, data.ds2, sortBy);
  const { labels, ds1, ds2 } = sorted;

  const c = getThemeColors();
  const colors = getCompareColors();
  const ratios = calcRatios(ds1.values, ds2.values, ratioDecimals);

  const allValues = [...ds1.values, ...ds2.values];
  const xMin = Math.min(...allValues);
  const xMax = Math.max(...allValues);
  const xPad = 0.15;
  const logMin = Math.log10(xMin) - xPad * (Math.log10(xMax) - Math.log10(xMin));
  const logMax = Math.log10(xMax) + xPad * (Math.log10(xMax) - Math.log10(xMin));

  // Chart-specific settings
  const pointSize = parseInt(dom.dumbbellPointSize?.value) || 10;
  const lineThickness = parseInt(dom.dumbbellLineThickness?.value) || 12;
  const lineStyle = dom.dumbbellLineStyle?.value || 'gradient';
  const lineOpacity = parseFloat(dom.dumbbellLineOpacity?.value) || 0.4;
  const showArrow = dom.dumbbellShowArrow?.checked;
  const showRatio = dom.dumbbellShowRatio?.checked !== false;
  const showValues = dom.dumbbellShowValues?.checked !== false;

  const opacityHex = Math.round(lineOpacity * 255).toString(16).padStart(2, '0');

  const dumbbellPlugin = {
    id: 'dumbbellLines',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta0 = chart.getDatasetMeta(0);
      const meta1 = chart.getDatasetMeta(1);
      if (!meta0.data.length || !meta1.data.length) return;

      for (let i = 0; i < meta0.data.length; i++) {
        const p0 = meta0.data[i];
        const p1 = meta1.data[i];

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);

        if (lineStyle === 'gradient') {
          const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          grad.addColorStop(0, `${colors.secondary}${opacityHex}`);
          grad.addColorStop(1, `${colors.primary}${opacityHex}`);
          ctx.strokeStyle = grad;
        } else if (lineStyle === 'dashed') {
          ctx.setLineDash([8, 6]);
          ctx.strokeStyle = `${colors.primary}${opacityHex}`;
        } else {
          ctx.strokeStyle = `${colors.primary}${opacityHex}`;
        }

        ctx.lineWidth = lineThickness;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction arrow
        if (showArrow) {
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const angle = Math.atan2(dy, dx);
          const arrowLen = 10;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p1.x - arrowLen * Math.cos(angle - Math.PI / 6), p1.y - arrowLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p1.x - arrowLen * Math.cos(angle + Math.PI / 6), p1.y - arrowLen * Math.sin(angle + Math.PI / 6));
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        ctx.restore();

        if (showRatio) {
          const midX = (p0.x + p1.x) / 2;
          const midY = p0.y;
          drawRatioPill(ctx, midX, midY, `\u00D7${ratios[i]}`, c);
        }
      }
    }
  };

  const config = {
    type: 'scatter',
    plugins: [dumbbellPlugin, bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
    data: {
      datasets: [
        {
          label: ds1.name || 'Series 1',
          data: ds1.values.map((v, i) => ({ x: v, y: i })),
          backgroundColor: `${colors.secondary}D9`,
          borderColor: colors.secondary,
          borderWidth: 2,
          pointRadius: pointSize,
          pointHoverRadius: pointSize + 3,
        },
        {
          label: ds2.name || 'Series 2',
          data: ds2.values.map((v, i) => ({ x: v, y: i })),
          backgroundColor: `${colors.primary}D9`,
          borderColor: colors.primary,
          borderWidth: 2,
          pointRadius: pointSize,
          pointHoverRadius: pointSize + 3,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: ASPECT_RATIOS.square,
      animation: { duration: safeInt(dom.animationSpeed?.value, 600), easing: 'easeOutQuart' },
      layout: {
        padding: {
          top: dom.chartTitle?.value ? 8 : 4,
          bottom: dom.chartSource?.value ? 24 : 8,
          left: 4,
          right: 20,
        },
      },
      scales: {
        x: {
          ...getLogXAxis(),
          min: Math.pow(10, logMin),
          max: Math.pow(10, logMax),
        },
        y: getCategoryYAxis(labels),
      },
      plugins: {
        legend: { ...getLegendBase(), display: dom.showLegend?.checked ?? true },
        tooltip: getTooltipBase(),
        datalabels: {
          display: showValues,
          color: c.text,
          font: FONTS.datalabels,
          anchor: 'end',
          align: (ctx) => ctx.datasetIndex === 0 ? 'left' : 'right',
          formatter(v) { return formatCompareNumber(v.x, numFmt); },
          offset: 4,
          clip: false,
        },
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
    }
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'dumbbell',
  label: 'Dumbbell',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="14" r="4" fill="currentColor" opacity="0.6"/><circle cx="30" cy="14" r="4" fill="currentColor" opacity="0.6"/><line x1="14" y1="14" x2="26" y2="14" stroke-width="4" opacity="0.3"/><circle cx="10" cy="26" r="4" fill="currentColor" opacity="0.6"/><circle cx="30" cy="26" r="4" fill="currentColor" opacity="0.6"/><line x1="14" y1="26" x2="26" y2="26" stroke-width="4" opacity="0.3"/></svg>',
  isSelfManaged: true,
  builder: () => renderDumbbellChart(),
  capabilities: { pointSize: true, legend: true },
});
