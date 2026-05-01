import { dom } from '../dom.js';
import { safeInt, hexToRgba } from '../utils.js';
import { getBaseChartOptions } from './base-options.js';
import { registerChart } from './registry.js';

export function buildScatterChart(labels, datasets, c, colors) {
  const opts = getBaseChartOptions();
  opts.plugins.datalabels.display = false;

  const scatterDatasets = datasets.map((ds, dsIdx) => {
    const points = labels.map((label, i) => ({
      x: typeof label === 'number' ? label : parseFloat(label) || i,
      y: ds.values[i]
    })).filter(p => p.y != null);

    const color = colors[dsIdx % colors.length];
    return {
      label: ds.name || `Series ${dsIdx + 1}`,
      data: points,
      backgroundColor: hexToRgba(color, 0.7),
      borderColor: color,
      borderWidth: 1.5,
      pointRadius: Math.min(safeInt(dom.pointSize.value, 5), points.length > 500 ? 2 : 5),
      pointHoverRadius: 8,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor: c.bg,
    };
  });

  return {
    type: 'scatter',
    data: { datasets: scatterDatasets },
    options: opts
  };
}

registerChart({
  id: 'scatter',
  label: 'Scatter',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="28" r="2.5" fill="currentColor"/><circle cx="16" cy="20" r="2.5" fill="currentColor"/><circle cx="24" cy="14" r="2.5" fill="currentColor"/><circle cx="30" cy="22" r="2.5" fill="currentColor"/><circle cx="20" cy="26" r="2.5" fill="currentColor" opacity="0.4"/></svg>',
  dataHint: 'First column = x values, second column = y values. Extra columns = additional point series.',
  dataExample: 'X, Y\n10, 25\n22, 38\n35, 52\n48, 65',
  dataJsonHint: 'Array of {x, y} objects, or labels array with x/y datasets. X values must be numeric.',
  dataJsonExample: '[\n  { "x": 10, "y": 25 },\n  { "x": 22, "y": 38 },\n  { "x": 35, "y": 52 },\n  { "x": 48, "y": 65 },\n  { "x": 60, "y": 78 }\n]',
  isSelfManaged: false,
  builder: (ctx) => buildScatterChart(ctx.labels, ctx.datasets, ctx.c, ctx.colors),
  capabilities: { pointSize: true, grid: true, legend: true, axisFormatting: true, dualAxis: true, zoom: true },
});
