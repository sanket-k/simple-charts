import { dom } from '../dom.js';
import { safeInt, hexToRgba } from '../utils.js';
import { getBaseChartOptions } from './base-options.js';

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
