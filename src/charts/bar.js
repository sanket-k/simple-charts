import { CONFIG } from '../constants.js';
import { dom } from '../dom.js';
import { safeInt, hexToRgba } from '../utils.js';
import { getBaseChartOptions } from './base-options.js';
import { registerChart } from './registry.js';

export function buildBarChart(labels, datasets, c, colors, indexAxis) {
  const opts = getBaseChartOptions();
  const borderRadius = safeInt(dom.barBorderRadius?.value, 4);
  opts.indexAxis = indexAxis;
  if (indexAxis === 'y') {
    const valueConfig = { ...opts.scales.y };
    const catConfig = { ...opts.scales.x };
    opts.scales.x = valueConfig;
    opts.scales.x.grid.display = dom.showGrid.checked;
    opts.scales.y = catConfig;
    opts.scales.y.grid.display = false;
    delete opts.scales.y.type;
    delete opts.scales.y.time;
    delete opts.scales.y.adapters;
    opts.scales.y.min = undefined;
    opts.scales.y.max = undefined;
    if (opts.scales.y.ticks) delete opts.scales.y.ticks.callback;
    delete opts.scales.y1;
  }
  opts.plugins.datalabels.anchor = 'end';
  opts.plugins.datalabels.align = indexAxis === 'y' ? 'right' : 'top';

  const maxBars = CONFIG.maxBars;
  let displayLabels = labels;
  let displayDatasets = datasets;
  if (labels.length > maxBars) {
    displayLabels = labels.slice(0, maxBars);
    displayDatasets = datasets.map(ds => ({
      ...ds,
      values: ds.values.slice(0, maxBars)
    }));
  }

  return {
    type: 'bar',
    data: {
      labels: displayLabels,
      datasets: displayDatasets.map((ds, i) => ({
        label: ds.name,
        data: ds.values,
        backgroundColor: displayDatasets.length === 1
          ? ds.values.map((_, j) => hexToRgba(colors[j % colors.length], 0.85))
          : hexToRgba(colors[i % colors.length], 0.85),
        borderColor: displayDatasets.length === 1
          ? ds.values.map((_, j) => colors[j % colors.length])
          : colors[i % colors.length],
        borderWidth: 1,
        borderRadius,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.85
      }))
    },
    options: opts
  };
}

registerChart({
  id: 'bar',
  label: 'H-Bar',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="8" width="24" height="5" rx="1" fill="currentColor" opacity="0.3"/><rect x="6" y="17" width="18" height="5" rx="1" fill="currentColor" opacity="0.3"/><rect x="6" y="26" width="28" height="5" rx="1" fill="currentColor" opacity="0.3"/></svg>',
  dataHint: 'First column = bar labels, each additional column = a separate bar series (grouped bars).',
  dataExample: 'Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100',
  dataJsonHint: 'Provide labels array and datasets array. Each dataset becomes a grouped bar series.',
  dataJsonExample: '{\n  "labels": ["Product A", "Product B", "Product C"],\n  "datasets": [\n    { "name": "Value", "values": [4200, 3800, 5100] }\n  ]\n}',
  isSelfManaged: false,
  builder: (ctx) => buildBarChart(ctx.labels, ctx.datasets, ctx.c, ctx.colors, 'y'),
  capabilities: { grid: true, barRadius: true, legend: true, axisFormatting: true, dualAxis: true, zoom: true },
});

registerChart({
  id: 'vbar',
  label: 'V-Bar',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="16" width="5" height="18" rx="1" fill="currentColor" opacity="0.3"/><rect x="15" y="8" width="5" height="26" rx="1" fill="currentColor" opacity="0.3"/><rect x="24" y="12" width="5" height="22" rx="1" fill="currentColor" opacity="0.3"/><rect x="33" y="6" width="5" height="28" rx="1" fill="currentColor" opacity="0.3"/></svg>',
  dataHint: 'First column = bar labels, each additional column = a separate bar series (grouped bars).',
  dataExample: 'Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100',
  dataJsonHint: 'Provide labels array and datasets array. Each dataset becomes a grouped bar series.',
  dataJsonExample: '{\n  "labels": ["Product A", "Product B", "Product C"],\n  "datasets": [\n    { "name": "Value", "values": [4200, 3800, 5100] }\n  ]\n}',
  isSelfManaged: false,
  builder: (ctx) => buildBarChart(ctx.labels, ctx.datasets, ctx.c, ctx.colors, 'x'),
  capabilities: { grid: true, barRadius: true, legend: true, axisFormatting: true, dualAxis: true, zoom: true },
});
