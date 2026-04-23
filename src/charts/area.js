import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba } from '../utils.js';
import { getBaseChartOptions, getYAxisID } from './base-options.js';
import { getLineDash } from '../ui/line-style-ui.js';

export function buildAreaChart(labels, datasets, c, colors, tension, useTimeAxis, displayData) {
  const opts = getBaseChartOptions();
  const gaps = dom.spanGaps.checked;

  const stacked = !state.dualAxisEnabled;
  opts.scales.y.stacked = stacked;
  opts.scales.x.stacked = stacked;

  return {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((ds, i) => {
        const yAxisID = getYAxisID(i);
        const hidden = state.dualAxisEnabled && state.axisAssignments[i] === 'hidden';
        const lineStyle = state.datasetLineStyles[i] || 'solid';
        const borderDash = getLineDash(lineStyle);

        let data = ds.values;
        if (useTimeAxis && displayData?.dateObjects) {
          data = ds.values.map((v, idx) => {
            const d = displayData.dateObjects[idx];
            return d ? { x: d.getTime(), y: v } : null;
          });
        }

        return {
          label: ds.name,
          data,
          borderColor: colors[i % colors.length],
          backgroundColor: hexToRgba(colors[i % colors.length], 0.2),
          borderWidth: 2,
          borderDash,
          pointRadius: Math.min(safeInt(dom.pointSize.value, 2), ds.values.length > 200 ? 0 : 3),
          pointHoverRadius: 5,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: c.bg,
          pointBorderWidth: 2,
          tension,
          fill: stacked,
          spanGaps: gaps,
          yAxisID,
          hidden
        };
      })
    },
    options: opts
  };
}
