import { dom } from './dom.js';
import { state } from './state.js';
import { formatNumber } from './format.js';

/** Creates a Y-axis tick formatting function using the current number format settings */
export function buildYTickCallback() {
  const fmt = dom.numberFormat.value;
  const decimals = dom.decimalPlaces ? dom.decimalPlaces.value : 'auto';
  const currency = dom.currencyPrefix ? dom.currencyPrefix.value || '$' : '$';
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
