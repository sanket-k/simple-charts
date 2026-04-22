import { SEMANTIC } from '../constants.js';
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, hexToRgba } from '../utils.js';
import { formatNumber } from '../format.js';
import { getBaseChartOptions } from './base-options.js';

export function buildWaterfallChart(labels, datasets, c, colors) {
  const opts = getBaseChartOptions();
  const values = datasets[0].values;
  const borderRadius = safeInt(dom.barBorderRadius?.value, 4);

  let cumulative = 0;
  const bases = [];
  const positives = [];
  const negatives = [];
  const isTotal = [];

  values.forEach((val, i) => {
    if (val == null) val = 0;
    const isLast = i === values.length - 1;

    if (isLast) {
      if (i === 0) {
        bases.push(0);
        positives.push(val);
        negatives.push(0);
        cumulative = val;
      } else {
        bases.push(0);
        positives.push(cumulative);
        negatives.push(0);
      }
      isTotal.push(true);
    } else if (val >= 0) {
      bases.push(cumulative);
      positives.push(val);
      negatives.push(0);
      cumulative += val;
      isTotal.push(false);
    } else {
      bases.push(cumulative + val);
      positives.push(0);
      negatives.push(Math.abs(val));
      cumulative += val;
      isTotal.push(false);
    }
  });

  opts.scales.x.stacked = true;
  opts.scales.y.stacked = true;
  opts.plugins.datalabels.display = dom.showDataLabels.checked;
  opts.plugins.datalabels.formatter = (value, ctx) => {
    if (ctx.datasetIndex === 0) return '';
    return value ? formatNumber(value) : '';
  };

  const barColorsBg = values.map((v, i) => {
    if (isTotal[i]) return hexToRgba(state.userColors[0], 0.85);
    return (v || 0) >= 0 ? hexToRgba(SEMANTIC.up, 0.85) : hexToRgba(SEMANTIC.down, 0.85);
  });
  const barColorsBorder = values.map((v, i) => {
    if (isTotal[i]) return state.userColors[0];
    return (v || 0) >= 0 ? SEMANTIC.up : SEMANTIC.down;
  });

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Base',
          data: bases,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'Increase',
          data: positives,
          backgroundColor: barColorsBg,
          borderColor: barColorsBorder,
          borderWidth: 1,
          borderRadius: { topLeft: Math.min(borderRadius, 6), topRight: Math.min(borderRadius, 6) },
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'Decrease',
          data: negatives,
          backgroundColor: barColorsBg,
          borderColor: barColorsBorder,
          borderWidth: 1,
          borderRadius: { topLeft: Math.min(borderRadius, 6), topRight: Math.min(borderRadius, 6) },
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        legend: { display: false }
      }
    }
  };
}
