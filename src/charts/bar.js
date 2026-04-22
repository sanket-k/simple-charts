import { CONFIG } from '../constants.js';
import { dom } from '../dom.js';
import { safeInt, hexToRgba } from '../utils.js';
import { getBaseChartOptions } from './base-options.js';

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
