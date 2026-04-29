import { state } from '../state.js';
import { dom } from '../dom.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, getCategoryYAxis, drawRatioPill } from './compare-utils.js';

export function renderBubbleCompareChart() {
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

  const maxR = parseInt(dom.bubbleMaxRadius?.value) || 32;
  const minGapPx = parseInt(dom.bubbleGapSize?.value) || 30;
  const showRatio = dom.bubbleShowRatio?.checked !== false;
  const showValues = dom.bubbleShowValues?.checked !== false;
  const minR = parseInt(dom.bubbleMinRadius?.value) || 4;

  const allValues = [...ds1.values, ...ds2.values].filter(v => v > 0);
  const maxVal = Math.max(...allValues);
  const bScale = maxR / Math.sqrt(maxVal);

  const earlyRadii = ds1.values.map(v => Math.max(minR, Math.sqrt(Math.max(0, v)) * bScale));
  const modernRadii = ds2.values.map(v => Math.max(minR, Math.sqrt(Math.max(0, v)) * bScale));

  const bubbleGapPlugin = {
    id: 'bubbleGap',
    beforeDatasetsDraw(chart) {
      const xScale = chart.scales.x;
      const plotWidth = xScale.right - xScale.left;
      const pxPerUnit = plotWidth / (xScale.max - xScale.min);

      const ds0 = chart.data.datasets[0].data;
      const ds1 = chart.data.datasets[1].data;

      for (let i = 0; i < ds0.length; i++) {
        const r0 = ds0[i].r;
        const r1 = ds1[i].r;
        const totalR = r0 + r1 + minGapPx;
        const totalRUnits = totalR / pxPerUnit;

        const earlyX = xScale.min + (r0 / pxPerUnit) + 0.02;
        const modernX = earlyX + totalRUnits;

        const maxX = xScale.max - (r1 / pxPerUnit) - 0.02;
        if (modernX > maxX) {
          const shift = modernX - maxX;
          ds0[i].x = earlyX - shift;
          ds1[i].x = maxX;
        } else {
          ds0[i].x = earlyX;
          ds1[i].x = modernX;
        }
      }
    },
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta0 = chart.getDatasetMeta(0);
      const meta1 = chart.getDatasetMeta(1);
      if (!meta0.data.length || !meta1.data.length) return;

      for (let i = 0; i < meta0.data.length; i++) {
        const p0 = meta0.data[i];
        const p1 = meta1.data[i];
        const r0 = chart.data.datasets[0].data[i].r;
        const r1 = chart.data.datasets[1].data[i].r;

        const startX = p0.x + r0 + 4;
        const endX = p1.x - r1 - 4;
        const y = p0.y;

        if (endX - startX < 16) continue;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.strokeStyle = `${c.textMuted}99`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(endX, y);
        ctx.lineTo(endX - 6, y - 4);
        ctx.lineTo(endX - 6, y + 4);
        ctx.closePath();
        ctx.fillStyle = c.textSecondary;
        ctx.fill();
        ctx.restore();

        if (showRatio) {
          const midX = (startX + endX) / 2;
          drawRatioPill(ctx, midX, y, `\u00D7${ratios[i]}`, c, { paddingWidth: 14, height: 20, cornerRadius: 5, yOffset: 4 });
        }
      }
    }
  };

  const config = {
    type: 'bubble',
    plugins: [bubbleGapPlugin, bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
    data: {
      datasets: [
        {
          label: ds1.name || 'Series 1',
          data: ds1.values.map((v, i) => ({
            x: 0.2,
            y: i,
            r: earlyRadii[i],
            _value: v
          })),
          backgroundColor: `${colors.secondary}BF`,
          borderColor: colors.secondary,
          borderWidth: 2,
        },
        {
          label: ds2.name || 'Series 2',
          data: ds2.values.map((v, i) => ({
            x: 0.8,
            y: i,
            r: modernRadii[i],
            _value: v
          })),
          backgroundColor: `${colors.primary}BF`,
          borderColor: colors.primary,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: ASPECT_RATIOS.square,
      layout: { padding: { left: 10, right: 50, top: 10, bottom: 10 } },
      scales: {
        x: { display: false, min: -0.3, max: 1.5 },
        y: getCategoryYAxis(labels),
      },
      plugins: {
        legend: getLegendBase(),
        tooltip: {
          ...getTooltipBase(),
          callbacks: {
            label(ctx) {
              const val = ctx.raw._value;
              return `${ctx.dataset.label}: ${val?.toLocaleString()}`;
            }
          }
        },
        datalabels: {
          display(ctx) {
            if (!showValues) return false;
            const r = ctx.dataset.data[ctx.dataIndex].r;
            return r > 10;
          },
          color: c.text,
          font: FONTS.datalabels,
          anchor: 'center',
          align: 'center',
          formatter(v, ctx) {
            return ctx.dataset.data[ctx.dataIndex]._value?.toLocaleString();
          },
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
