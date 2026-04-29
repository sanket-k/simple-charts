import { CONFIG } from '../constants.js';
import { dom } from '../dom.js';
import { hexToRgba } from '../utils.js';
import { formatNumber } from '../format.js';
import { getBaseChartOptions, FONTS } from './base-options.js';

export function buildPieChart(labels, datasets, c, colors) {
  const opts = getBaseChartOptions();
  delete opts.scales;
  opts.aspectRatio = 1.6;
  opts.plugins.datalabels.color = c.bg;
  opts.plugins.datalabels.font = FONTS.datalabelsBold;
  opts.plugins.datalabels.anchor = 'center';
  opts.plugins.datalabels.align = 'center';
  opts.plugins.datalabels.formatter = (value, ctx) => {
    const total = ctx.dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
    if (total === 0) return '';
    const pct = ((value / total) * 100).toFixed(0);
    return pct > 5 ? `${pct}%` : '';
  };

  const maxSlices = CONFIG.maxPieSlices;
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
    type: 'pie',
    data: {
      labels: displayLabels,
      datasets: [{
        data: displayValues,
        backgroundColor: displayLabels.map((_, i) => hexToRgba(colors[i % colors.length], 0.85)),
        borderColor: c.bg,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: opts
  };
}
