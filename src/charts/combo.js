import { state } from '../state.js';
import { dom } from '../dom.js';
import { hexToRgba } from '../utils.js';
import { getBaseChartOptions, getYAxisID } from './base-options.js';
import { getLineDatasetDefaults } from './line.js';
import { registerChart } from './registry.js';

export function buildComboChart(labels, datasets, c, colors, tension, useTimeAxis, displayData) {
  const opts = getBaseChartOptions();
  const borderRadius = parseInt(dom.barBorderRadius?.value) || 4;

  const chartDatasets = datasets.map((ds, i) => {
    const dsType = state.datasetChartTypes[i] || (i === 0 ? 'bar' : 'line');
    const color = colors[i % colors.length];

    if (dsType === 'bar') {
      let data = ds.values;
      if (useTimeAxis && displayData?.dateObjects) {
        data = ds.values.map((v, j) => ({
          x: displayData.dateObjects[j] ? displayData.dateObjects[j].getTime() : null,
          y: v
        }));
      }

      let yAxisID = getYAxisID(i);
      const hidden = state.dualAxisEnabled && state.axisAssignments[i] === 'hidden';

      return {
        type: 'bar',
        label: ds.name,
        data,
        backgroundColor: hexToRgba(color, 0.85),
        borderColor: color,
        borderWidth: 1,
        borderRadius,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.85,
        yAxisID,
        hidden
      };
    }

    return {
      type: 'line',
      ...getLineDatasetDefaults(ds, i, c, colors, tension, useTimeAxis, displayData)
    };
  });

  return {
    type: 'bar',
    data: { labels, datasets: chartDatasets },
    options: opts
  };
}

registerChart({
  id: 'combo',
  label: 'Combo',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="18" width="5" height="16" rx="1" fill="currentColor" opacity="0.3"/><rect x="15" y="10" width="5" height="24" rx="1" fill="currentColor" opacity="0.3"/><rect x="24" y="14" width="5" height="20" rx="1" fill="currentColor" opacity="0.3"/><path d="M8 22L18 12L27 18L36 8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>',
  isSelfManaged: false,
  builder: (ctx) => buildComboChart(ctx.timeLabels, ctx.datasets, ctx.c, ctx.colors, ctx.tension, ctx.useTimeAxis, ctx.displayData),
  capabilities: { curve: true, pointSize: true, lineWidth: true, grid: true, highLow: true, barRadius: true, legend: true, axisFormatting: true, dualAxis: true, lineStyle: true, zoom: true },
});
