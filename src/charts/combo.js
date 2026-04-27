import { state } from '../state.js';
import { dom } from '../dom.js';
import { hexToRgba } from '../utils.js';
import { getBaseChartOptions, getYAxisID } from './base-options.js';
import { getLineDatasetDefaults } from './line.js';

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
