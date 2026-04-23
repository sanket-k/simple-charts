import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba } from '../utils.js';
import { getBaseChartOptions, getMultiColors, getYAxisID } from './base-options.js';
import { getLineDash } from '../ui/line-style-ui.js';

export function getLineDatasetDefaults(ds, i, c, colors, tension, useTimeAxis, displayData) {
  const baseRadius = safeInt(dom.pointSize.value, 3);
  const lineWidth = safeFloat(dom.lineWidth.value, 2.5);
  const fill = dom.fillArea.checked;
  const gaps = dom.spanGaps.checked;
  const yAxisID = getYAxisID(i);
  const hidden = state.dualAxisEnabled && state.axisAssignments[i] === 'hidden';
  const showHL = dom.showHighLowPoints?.checked ?? false;
  const lineStyle = state.datasetLineStyles[i] || 'solid';
  const borderDash = getLineDash(lineStyle);

  let data = ds.values;
  if (useTimeAxis && displayData?.dateObjects) {
    data = ds.values.map((v, idx) => {
      const d = displayData.dateObjects[idx];
      return d ? { x: d.getTime(), y: v } : null;
    });
  }

  const color = colors[i % colors.length];
  let pointRadius = baseRadius;
  let pointBackgroundColor = color;
  let pointBorderColor = c.bg;

  if (showHL) {
    const rawValues = ds.values.filter(v => v != null);
    if (rawValues.length > 0) {
      const maxVal = Math.max(...rawValues);
      const minVal = Math.min(...rawValues);
      const hlRadius = Math.max(baseRadius + 5, 8);
      pointRadius = ds.values.map(v => {
        if (v == null) return 0;
        if (v === maxVal || v === minVal) return hlRadius;
        return baseRadius;
      });
      pointBackgroundColor = ds.values.map(v => {
        if (v == null) return 'transparent';
        if (v === maxVal) return '#34D399';
        if (v === minVal) return '#F87171';
        return color;
      });
      pointBorderColor = ds.values.map(v => {
        if (v == null) return 'transparent';
        if (v === maxVal || v === minVal) return '#fff';
        return c.bg;
      });
    }
  }

  return {
    label: ds.name,
    data,
    borderColor: color,
    backgroundColor: hexToRgba(color, fill ? 0.08 : 0),
    borderWidth: lineWidth,
    borderDash,
    pointRadius,
    pointHoverRadius: baseRadius + 3,
    pointBackgroundColor,
    pointBorderColor,
    pointBorderWidth: 2,
    tension,
    fill,
    spanGaps: gaps,
    yAxisID,
    hidden
  };
}

export function buildLineChart(labels, datasets, c, colors, tension, useTimeAxis, displayData) {
  return {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((ds, i) => getLineDatasetDefaults(ds, i, c, colors, tension, useTimeAxis, displayData))
    },
    options: getBaseChartOptions()
  };
}
