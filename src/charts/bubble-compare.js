import { state } from '../state.js';
import { dom } from '../dom.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, fitYAxis } from './compare-utils.js';

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

  const allValues = [...ds1.values, ...ds2.values].filter(v => v > 0);
  const maxVal = Math.max(...allValues);
  const bScale = maxR / Math.sqrt(maxVal);

  const earlyRadii = ds1.values.map(v => Math.max(4, Math.sqrt(Math.max(0, v)) * bScale));
  const modernRadii = ds2.values.map(v => Math.max(4, Math.sqrt(Math.max(0, v)) * bScale));

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
        ctx.strokeStyle = `${c.muted}66`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(endX, y);
        ctx.lineTo(endX - 6, y - 4);
        ctx.lineTo(endX - 6, y + 4);
        ctx.closePath();
        ctx.fillStyle = `${c.muted}80`;
        ctx.fill();
        ctx.restore();

        if (showRatio) {
          const midX = (startX + endX) / 2;
          const text = `\u00D7${ratios[i]}`;

          ctx.save();
          ctx.font = `bold 11px JetBrains Mono, monospace`;
          const tm = ctx.measureText(text);
          const pw = tm.width + 14;
          const ph = 20;

          ctx.fillStyle = c.card;
          ctx.beginPath();
          ctx.roundRect(midX - pw / 2, y - ph - 4, pw, ph, 5);
          ctx.fill();
          ctx.strokeStyle = `${colors.primary}99`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = colors.primary;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, y - ph / 2 - 4);
          ctx.restore();
        }
      }
    }
  };

  const yMax = labels.length - 1 + 0.8;

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
      maintainAspectRatio: true,
      layout: { padding: { left: 10, right: 50, top: 10, bottom: 10 } },
      scales: {
        x: { display: false, min: -0.3, max: 1.5 },
        y: {
          min: -0.8,
          max: yMax,
          grid: { display: false },
          border: { display: false },
          ticks: {
            stepSize: 1,
            color: c.muted,
            font: { family: 'Inter', size: 12, weight: '600' },
            callback(v) { return labels[v] || ''; }
          },
          afterFit: fitYAxis(labels, 12, '600').afterFit,
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: c.text, font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 12 }
        },
        tooltip: {
          backgroundColor: c.card,
          titleColor: c.text,
          bodyColor: c.muted,
          borderColor: c.border,
          borderWidth: 1,
          cornerRadius: 8,
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          callbacks: {
            label(ctx) {
              const val = ctx.raw._value;
              return `${ctx.dataset.label}: ${val?.toLocaleString()}`;
            }
          }
        },
        datalabels: {
          display(ctx) {
            const r = ctx.dataset.data[ctx.dataIndex].r;
            return r > 10;
          },
          color: c.text,
          font: { family: 'JetBrains Mono', size: 9, weight: '700' },
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
          font: { family: 'Inter', size: 16, weight: '700' },
          padding: { bottom: 8 },
        },
        subtitle: {
          display: !!document.getElementById('chartSubtitle')?.value,
          text: document.getElementById('chartSubtitle')?.value || '',
          color: c.muted,
          font: { family: 'Inter', size: 12, weight: '400' },
          padding: { bottom: 4 },
        },
      },
    }
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}
