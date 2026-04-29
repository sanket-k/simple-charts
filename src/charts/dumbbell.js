import { state } from '../state.js';
import { dom } from '../dom.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, fitYAxis } from './compare-utils.js';

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

  const pointSize = parseInt(dom.dumbbellPointSize?.value) || 10;
  const lineThickness = parseInt(dom.dumbbellLineThickness?.value) || 12;
  const showRatio = dom.dumbbellShowRatio?.checked !== false;

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
          const text = `\u00D7${ratios[i]}`;

          ctx.save();
          ctx.font = `bold 13px JetBrains Mono, monospace`;
          const tm = ctx.measureText(text);
          const pw = tm.width + 16;
          const ph = 22;

          ctx.fillStyle = c.card;
          ctx.beginPath();
          ctx.roundRect(midX - pw / 2, midY - ph - 6, pw, ph, 6);
          ctx.fill();
          ctx.strokeStyle = `${colors.primary}80`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = colors.primary;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, midY - ph / 2 - 6);
          ctx.restore();
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
      maintainAspectRatio: true,
      scales: {
        x: {
          type: 'logarithmic',
          grid: { color: c.grid, drawBorder: false },
          ticks: {
            color: c.muted,
            font: { family: 'Inter', size: 11 },
            callback(v) {
              const nice = [1, 10, 100, 1000, 10000, 100000];
              if (nice.includes(v)) return v.toLocaleString();
              return '';
            }
          },
          border: { display: false },
          title: { display: true, text: 'Value (log scale)', color: c.muted, font: { family: 'Inter', size: 11 } },
        },
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
        },
        datalabels: { display: false },
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
