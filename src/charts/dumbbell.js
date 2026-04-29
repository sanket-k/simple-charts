import { state } from '../state.js';
import { dom } from '../dom.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, getCategoryYAxis, getLogXAxis, drawRatioPill } from './compare-utils.js';

export function renderDumbbellChart() {
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

  const allValues = [...ds1.values, ...ds2.values];
  const xMin = Math.min(...allValues);
  const xMax = Math.max(...allValues);
  const xPad = 0.15; // 15% padding in log space on each side
  const logMin = Math.log10(xMin) - xPad * (Math.log10(xMax) - Math.log10(xMin));
  const logMax = Math.log10(xMax) + xPad * (Math.log10(xMax) - Math.log10(xMin));

  const pointSize = parseInt(dom.dumbbellPointSize?.value) || 10;
  const lineThickness = parseInt(dom.dumbbellLineThickness?.value) || 12;
  const showRatio = dom.dumbbellShowRatio?.checked !== false;
  const showValues = dom.dumbbellShowValues?.checked !== false;

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

        const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
        grad.addColorStop(0, `${colors.secondary}66`);
        grad.addColorStop(1, `${colors.primary}66`);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lineThickness;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        if (showRatio) {
          const midX = (p0.x + p1.x) / 2;
          const midY = p0.y;
          drawRatioPill(ctx, midX, midY, `\u00D7${ratios[i]}`, c);
        }
      }
    }
  };

  const yMax = labels.length - 1 + 0.8;

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
      scales: {
        x: {
          ...getLogXAxis(),
          min: Math.pow(10, logMin),
          max: Math.pow(10, logMax),
        },
        y: getCategoryYAxis(labels),
      },
      plugins: {
        legend: getLegendBase(),
        tooltip: getTooltipBase(),
        datalabels: {
          display: showValues,
          color: c.text,
          font: FONTS.datalabels,
          anchor: 'end',
          align: (ctx) => ctx.datasetIndex === 0 ? 'left' : 'right',
          formatter(v) { return v.x?.toLocaleString(); },
          offset: 4,
          clip: false,
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
    }
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}
