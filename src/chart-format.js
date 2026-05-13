/** Chart formatters — factory functions for Y-axis ticks, data labels, and tooltip callbacks. */
import { dom } from './dom.js';
import { state } from './state.js';
import { formatNumber } from './format.js';

/** Formats a tick value using 10^n notation when outside the "nice" range. */
function formatLogTick(value) {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 0.01 && abs < 10000) return formatNumber(value, 'auto');
  let exp = Math.round(Math.log10(abs));
  let coeff = value / Math.pow(10, exp);
  // Normalize coeff into [1, 10)
  if (Math.abs(coeff) < 1) { coeff *= 10; exp -= 1; }
  if (Math.abs(coeff) >= 10) { coeff /= 10; exp += 1; }
  const c = Math.abs(coeff - Math.round(coeff)) < 1e-10 ? Math.round(coeff) : +coeff.toFixed(1);
  if (c === 1) return exp === 0 ? '1' : `10${superscript(exp)}`;
  return `${c}×10${superscript(exp)}`;
}

/** Returns a superscript string for an exponent number. */
function superscript(n) {
  const map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map(ch => map[ch] || ch).join('');
}

/** Creates a Y-axis tick formatting function using the current number format settings */
export function buildYTickCallback(overrideFormat, options = {}) {
  const fmt = overrideFormat || dom.numberFormat.value;
  if (options.logScale) return (value) => formatLogTick(value);
  return (value) => formatNumber(value, fmt);
}

/** Creates a data label formatter */
export function buildDataLabelFormatter() {
  return (value) => formatNumber(value);
}

/** Creates a tooltip label callback that shows the series name and formatted value */
export function buildTooltipCallback() {
  return (ctx) => {
    let label = ctx.dataset.label || '';
    if (state.currentChartType === 'pie' || state.currentChartType === 'donut') {
      label = ctx.chart.data.labels[ctx.dataIndex] || '';
    }
    const val = ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed;
    return `${label ? label + ': ' : ''}${formatNumber(typeof val === 'object' ? ctx.raw : val)}`;
  };
}
