import { state } from '../state.js';
import { dom } from '../dom.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, getLogXAxis } from './compare-utils.js';

export function renderOverlayChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  const data = validateCompareData(state.parsedData);
  if (!data) return;

  const { labels, ds1, ds2 } = data;
  const c = getThemeColors();
  const colors = getCompareColors();
  const ratios = calcRatios(ds1.values, ds2.values);

  const bgOpacity = parseFloat(dom.overlayBarOpacity?.value) || 0.18;
  const showRatio = dom.overlayShowRatio?.checked !== false;
  const borderRadius = parseInt(dom.overlayBorderRadius?.value) ?? 6;
  const showValues = dom.overlayShowValues?.checked !== false;

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
          borderWidth: 2,
          borderRadius: borderRadius,
          borderSkipped: false,
          order: 2,
        },
        {
          label: ds1.name || 'Series 1',
          data: ds1.values,
          backgroundColor: `${colors.secondary}E6`,
          borderColor: colors.secondary,
          borderWidth: 2,
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
      scales: {
        x: getLogXAxis(),
        y: {
          grid: { color: c.grid, drawBorder: false },
          border: { display: false },
          ticks: {
            color: c.textSecondary,
            font: FONTS.tick,
          },
        },
      },
      plugins: {
        legend: getLegendBase(),
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
            if (ctx.datasetIndex === 0) return `${v.toLocaleString()}`;
            return showRatio ? `${v.toLocaleString()}  (\u00D7${ratios[i]})` : `${v.toLocaleString()}`;
          },
          offset: 6,
        },
        title: {
          display: !!document.getElementById('chartTitle')?.value,
          text: document.getElementById('chartTitle')?.value || '',
          color: c.text,
          font: FONTS.title,
          padding: { bottom: 8 },
        },
        subtitle: {
          display: !!document.getElementById('chartSubtitle')?.value,
          text: document.getElementById('chartSubtitle')?.value || '',
          color: c.textSecondary,
          font: FONTS.subtitle,
          padding: { bottom: 4 },
        },
      },
      layout: { padding: { right: 80 } },
    }
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}
