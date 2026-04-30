import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt } from '../utils.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, getLogXAxis, sortCompareData, swapSeries, formatCompareNumber } from './compare-utils.js';
import { registerChart } from './registry.js';

export function renderOverlayChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  let data = validateCompareData(state.parsedData);
  if (!data) return;

  // Shared settings
  const sortBy = dom.overlaySortBy?.value || 'original';
  const shouldSwap = dom.overlaySwapSeries?.checked;
  const numFmt = dom.overlayNumberFormat?.value || 'raw';
  const ratioDecimals = parseInt(dom.overlayRatioDecimals?.value) ?? 1;

  if (shouldSwap) {
    const swapped = swapSeries(data.ds1, data.ds2);
    data = { ...data, ...swapped };
  }
  const sorted = sortCompareData(data.labels, data.ds1, data.ds2, sortBy);
  const { labels, ds1, ds2 } = sorted;

  const c = getThemeColors();
  const colors = getCompareColors();
  const ratios = calcRatios(ds1.values, ds2.values, ratioDecimals);

  // Chart-specific settings
  const bgOpacity = parseFloat(dom.overlayBarOpacity?.value) || 0.18;
  const fgOpacity = parseFloat(dom.overlayFgOpacity?.value) || 0.9;
  const showRatio = dom.overlayShowRatio?.checked !== false;
  const borderRadius = parseInt(dom.overlayBorderRadius?.value) ?? 6;
  const showValues = dom.overlayShowValues?.checked !== false;
  const borderStyle = dom.overlayBorderStyle?.value || 'solid';
  const displayMode = dom.overlayDisplayMode?.value || 'overlay';

  const isGrouped = displayMode === 'grouped';

  const fgOpacityHex = Math.round(fgOpacity * 255).toString(16).padStart(2, '0');
  const borderWidth = borderStyle === 'none' ? 0 : 2;

  const config = {
    type: 'bar',
    plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
    data: {
      labels,
      datasets: [
        {
          label: ds2.name || 'Series 2',
          data: ds2.values,
          backgroundColor: `${colors.primary}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`,
          borderColor: `${colors.primary}80`,
          borderWidth: borderWidth,
          borderRadius: borderRadius,
          borderSkipped: false,
          order: 2,
        },
        {
          label: ds1.name || 'Series 1',
          data: ds1.values,
          backgroundColor: `${colors.secondary}${fgOpacityHex}`,
          borderColor: colors.secondary,
          borderWidth: borderWidth,
          borderRadius: Math.max(0, borderRadius - 2),
          borderSkipped: false,
          order: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: ASPECT_RATIOS.square,
      indexAxis: 'y',
      animation: { duration: safeInt(dom.animationSpeed?.value, 600), easing: 'easeOutQuart' },
      scales: {
        x: getLogXAxis(),
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
        legend: { ...getLegendBase(), display: dom.showLegend?.checked ?? true },
        tooltip: getTooltipBase(),
        datalabels: {
          display: showValues,
          anchor: 'end',
          align: 'right',
          clamp: true,
          color: c.text,
          font: FONTS.datalabels,
          formatter(v, ctx) {
            const i = ctx.dataIndex;
            const formatted = formatCompareNumber(v, numFmt);
            if (ctx.datasetIndex === 0) return formatted;
            return showRatio ? `${formatted}  (\u00D7${ratios[i]})` : formatted;
          },
          offset: 6,
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
      layout: {
        padding: {
          top: dom.chartTitle?.value ? 8 : 4,
          bottom: dom.chartSource?.value ? 24 : 8,
          left: 4,
          right: 80,
        },
      },
    }
  };

  // For grouped mode, adjust dataset properties so bars sit side by side
  if (isGrouped) {
    config.data.datasets[0].categoryPercentage = 0.8;
    config.data.datasets[0].barPercentage = 0.8;
    config.data.datasets[1].categoryPercentage = 0.8;
    config.data.datasets[1].barPercentage = 0.8;
    // Remove overlay-specific opacity, make both opaque
    config.data.datasets[0].backgroundColor = `${colors.primary}${fgOpacityHex}`;
    config.data.datasets[0].borderColor = colors.primary;
    delete config.data.datasets[0].order;
    delete config.data.datasets[1].order;
  }

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'overlay',
  label: 'Overlay',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="8" width="28" height="5" rx="2" fill="currentColor" opacity="0.15"/><rect x="6" y="8" width="10" height="5" rx="2" fill="currentColor" opacity="0.7"/><rect x="6" y="18" width="28" height="5" rx="2" fill="currentColor" opacity="0.15"/><rect x="6" y="18" width="14" height="5" rx="2" fill="currentColor" opacity="0.7"/><rect x="6" y="28" width="28" height="5" rx="2" fill="currentColor" opacity="0.15"/><rect x="6" y="28" width="8" height="5" rx="2" fill="currentColor" opacity="0.7"/></svg>',
  isSelfManaged: true,
  builder: () => renderOverlayChart(),
  capabilities: { legend: true },
});
