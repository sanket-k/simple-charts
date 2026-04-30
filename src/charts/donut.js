import { CONFIG } from '../constants.js';
import { dom } from '../dom.js';
import { hexToRgba } from '../utils.js';
import { getBaseChartOptions, FONTS } from './base-options.js';
import { registerChart } from './registry.js';

export function buildDonutChart(labels, datasets, c, colors) {
  const opts = getBaseChartOptions();
  delete opts.scales;
  opts.aspectRatio = 1.6;
  opts.cutout = '62%';
  opts.plugins.datalabels.color = c.text;
  opts.plugins.datalabels.font = FONTS.datalabelsBold;
  opts.plugins.datalabels.anchor = 'end';
  opts.plugins.datalabels.align = 'end';
  opts.plugins.datalabels.offset = 6;
  opts.plugins.datalabels.formatter = (value, ctx) => {
    const total = ctx.dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
    if (total === 0) return '';
    const pct = ((value / total) * 100).toFixed(0);
    return pct > 4 ? `${ctx.chart.data.labels[ctx.dataIndex]}\n${pct}%` : '';
  };

  const maxSlices = CONFIG.maxDonutSlices;
  let displayLabels = labels;
  let displayValues = datasets[0].values;
  if (labels.length > maxSlices) {
    const indexed = labels.map((l, i) => ({ l, v: datasets[0].values[i] || 0 }));
    indexed.sort((a, b) => b.v - a.v);
    const top = indexed.slice(0, maxSlices - 1);
    const otherVal = indexed.slice(maxSlices - 1).reduce((s, x) => s + x.v, 0);
    displayLabels = [...top.map(x => x.l), 'Other'];
    displayValues = [...top.map(x => x.v), otherVal];
  }

  return {
    type: 'doughnut',
    data: {
      labels: displayLabels,
      datasets: [{
        data: displayValues,
        backgroundColor: displayLabels.map((_, i) => hexToRgba(colors[i % colors.length], 0.85)),
        borderColor: c.bg,
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: opts
  };
}

registerChart({
  id: 'donut',
  label: 'Donut',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="20" cy="20" r="12"/><circle cx="20" cy="20" r="6"/></svg>',
  isSelfManaged: false,
  builder: (ctx) => buildDonutChart(ctx.labels, ctx.datasets, ctx.c, ctx.colors),
  capabilities: { legend: true },
});
