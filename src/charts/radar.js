/** Radar chart — spider/polygon chart for multi-axis comparison. */
import { dom } from '../dom.js';
import { hexToRgba } from '../utils.js';
import { getBaseChartOptions, FONTS } from './base-options.js';
import { registerChart } from './registry.js';

/** Returns Chart.js config for a radar chart. */
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
        font: FONTS.pointLabel
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

registerChart({
  id: 'radar',
  label: 'Radar',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="20,6 33,14 30,30 10,30 7,14" opacity="0.2" fill="currentColor"/><polygon points="20,6 33,14 30,30 10,30 7,14"/><polygon points="20,12 28,17 26,26 14,26 12,17" stroke-dasharray="2 2" opacity="0.5"/></svg>',
  dataHint: 'First column = axis metric names, each additional column = a separate polygon/series.',
  dataExample: 'Metric, Us, Competitor\nSpeed, 90, 65\nCost, 75, 80\nAccuracy, 95, 70',
  dataJsonHint: 'Provide labels for axis metric names and datasets for each polygon/series.',
  dataJsonExample: '{\n  "labels": ["Speed", "Cost", "Accuracy", "Scale", "UX"],\n  "datasets": [\n    { "name": "Us", "values": [90, 75, 95, 85, 88] },\n    { "name": "Competitor", "values": [65, 80, 70, 60, 72] }\n  ]\n}',
  isSelfManaged: false,
  builder: (ctx) => buildRadarChart(ctx.labels, ctx.datasets, ctx.c, ctx.colors),
  capabilities: { curve: true, pointSize: true, lineWidth: true, grid: true, highLow: true, legend: true },
});
