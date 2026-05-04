/** Comparison chart utilities — data validation, sorting, ratio calculation, and shared axis/drawing helpers. */
import { getMultiColors, FONTS, getThemeColors } from './base-options.js';
import { showToast } from '../utils.js';

/**
 * Auto-size Y-axis width based on label text measurement.
 * Returns a Chart.js scale plugin object for use in `afterFit`.
 */
export function fitYAxis(labels, fontSize = 10, fontWeight = '400') {
  return {
    afterFit(axis) {
      const ctx = axis.chart.ctx;
      const family = FONTS.family.replace(/'/g, '');
      ctx.font = `${fontWeight} ${fontSize}px ${family}`;
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
 * Calculate improvement ratios: ds2[i] / ds1[i].
 * @param {number} decimals - decimal places (default 1)
 */
export function calcRatios(ds1Values, ds2Values, decimals = 1) {
  return ds1Values.map((v, i) => {
    if (!v || v === 0) return 0;
    return +(ds2Values[i] / v).toFixed(decimals);
  });
}

/**
 * Sort data arrays together by a criterion.
 * @param {string[]} labels
 * @param {object} ds1 - { name, values }
 * @param {object} ds2 - { name, values }
 * @param {'original'|'value-asc'|'value-desc'|'ratio-asc'|'ratio-desc'} mode
 * @returns {{ labels, ds1, ds2, ratios }}
 */
export function sortCompareData(labels, ds1, ds2, mode = 'original') {
  if (mode === 'original') return { labels, ds1, ds2 };
  const ratios = ds1.values.map((v, i) => (!v || v === 0) ? 0 : ds2.values[i] / v);
  const indices = labels.map((_, i) => i);

  if (mode === 'value-asc') indices.sort((a, b) => (ds2.values[a] - ds1.values[a]) - (ds2.values[b] - ds1.values[b]));
  else if (mode === 'value-desc') indices.sort((a, b) => (ds2.values[b] - ds1.values[b]) - (ds2.values[a] - ds1.values[a]));
  else if (mode === 'ratio-asc') indices.sort((a, b) => ratios[a] - ratios[b]);
  else if (mode === 'ratio-desc') indices.sort((a, b) => ratios[b] - ratios[a]);

  return {
    labels: indices.map(i => labels[i]),
    ds1: { ...ds1, values: indices.map(i => ds1.values[i]) },
    ds2: { ...ds2, values: indices.map(i => ds2.values[i]) },
  };
}

/**
 * Swap two series so the user can flip primary/secondary.
 * Returns new { ds1, ds2 } with swapped values and names.
 */
export function swapSeries(ds1, ds2) {
  return { ds1: { ...ds2 }, ds2: { ...ds1 } };
}

/**
 * Format a number with K/M/B abbreviations.
 * @param {number} v
 * @param {'raw'|'compact'|'kmb'} fmt
 * @returns {string}
 */
export function formatCompareNumber(v, fmt = 'raw') {
  if (fmt === 'raw') return v?.toLocaleString() ?? '';
  if (fmt === 'compact') {
    if (v == null) return '';
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return v.toLocaleString();
  }
  return v?.toLocaleString() ?? '';
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

/** Shared logarithmic X-axis config for compare charts (dumbbell, overlay). */
export function getLogXAxis() {
  const c = getThemeColors();
  return {
    type: 'logarithmic',
    grid: { color: c.grid, drawBorder: false },
    ticks: {
      color: c.textSecondary,
      font: FONTS.tick,
      callback(v) {
        const nice = [1, 10, 100, 1000, 10000, 100000];
        if (nice.includes(v)) return v.toLocaleString();
        return '';
      }
    },
    border: { display: false },
    title: { display: true, text: 'Value (log scale)', color: c.textSecondary, font: FONTS.axisTitle },
  };
}

/** Shared categorical Y-axis config for compare charts (dumbbell, bubble-compare). */
export function getCategoryYAxis(labels) {
  const c = getThemeColors();
  const yMax = labels.length - 1 + 0.8;
  return {
    min: -0.8,
    max: yMax,
    grid: { display: false },
    border: { display: false },
    ticks: {
      stepSize: 1,
      color: c.textSecondary,
      font: FONTS.tick,
      callback(v) { return labels[v] || ''; }
    },
    afterFit: fitYAxis(labels).afterFit,
  };
}

/** Draw a ratio pill (background + text) on a canvas context. */
export function drawRatioPill(ctx, midX, midY, ratioText, c, opts = {}) {
  const pwPad = opts.paddingWidth ?? 16;
  const ph = opts.height ?? 22;
  const cr = opts.cornerRadius ?? 6;
  const yOffset = opts.yOffset ?? 6;

  ctx.save();
  ctx.font = FONTS.ratioPill;
  const tm = ctx.measureText(ratioText);
  const pw = tm.width + pwPad;

  ctx.fillStyle = c.bg;
  ctx.beginPath();
  ctx.roundRect(midX - pw / 2, midY - ph - yOffset, pw, ph, cr);
  ctx.fill();
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = c.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ratioText, midX, midY - ph / 2 - yOffset);
  ctx.restore();
}
