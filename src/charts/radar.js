import { dom } from '../dom.js';
import { hexToRgba } from '../utils.js';
import { getBaseChartOptions } from './base-options.js';

export function buildRadarChart(labels, datasets, c, colors) {
  const opts = getBaseChartOptions();
  delete opts.scales;
  opts.aspectRatio = 1.6;
  opts.scales = {
    r: {
      angleLines: { color: c.grid, lineWidth: 0.5 },
      grid: { color: c.grid, lineWidth: 0.5 },
      pointLabels: {
        color: c.textSecondary,
        font: { size: 10, weight: '500', family: "'Inter', sans-serif" }
      },
      ticks: { display: false, backdropColor: 'transparent' },
      suggestedMin: 0,
      suggestedMax: 100
    }
  };
  opts.plugins.datalabels.display = false;

  return {
    type: 'radar',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.name,
        data: ds.values,
        borderColor: colors[i % colors.length],
        backgroundColor: hexToRgba(colors[i % colors.length], 0.15),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: colors[i % colors.length],
        pointBorderColor: c.bg,
        pointBorderWidth: 2
      }))
    },
    options: opts
  };
}
