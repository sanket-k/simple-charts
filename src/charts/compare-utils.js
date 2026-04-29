import { getMultiColors } from './base-options.js';
import { showToast } from '../utils.js';

/**
 * Auto-size Y-axis width based on label text measurement.
 * Returns a Chart.js scale plugin object for use in `afterFit`.
 */
export function fitYAxis(labels, fontSize = 11, fontWeight = '500') {
  return {
    afterFit(axis) {
      const ctx = axis.chart.ctx;
      ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
      let maxW = 0;
      for (const label of labels) {
        maxW = Math.max(maxW, ctx.measureText(label).width);
      }
      axis.width = maxW + 16;
    }
  };
}

/**
 * Validate that parsedData has at least 2 datasets for comparison charts.
 * Returns { labels, ds1, ds2 } or null if invalid.
 */
export function validateCompareData(parsedData) {
  if (!parsedData || !parsedData.datasets || parsedData.datasets.length < 2) {
    showToast('Comparison charts require at least 2 data series.', 'error');
    return null;
  }
  if (!parsedData.labels || parsedData.labels.length === 0) {
    showToast('No labels found. Add a label column to your data.', 'error');
    return null;
  }
  if (parsedData.datasets.length > 2) {
    showToast('Using first 2 series only.', 'warning');
  }
  return {
    labels: parsedData.labels,
    ds1: parsedData.datasets[0],
    ds2: parsedData.datasets[1],
  };
}

/**
 * Calculate improvement ratios: ds2[i] / ds1[i], rounded to 1 decimal.
 */
export function calcRatios(ds1Values, ds2Values) {
  return ds1Values.map((v, i) => {
    if (!v || v === 0) return 0;
    return +(ds2Values[i] / v).toFixed(1);
  });
}

/**
 * Return primary/secondary color pair from the user's palette.
 */
export function getCompareColors() {
  const colors = getMultiColors();
  return {
    primary: colors[0],
    secondary: colors[1] || colors[0],
  };
}
