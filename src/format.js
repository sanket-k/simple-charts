import { dom } from './dom.js';

/**
 * Formats a numeric value for display in chart axes and tooltips.
 * Supports: auto/short, raw, comma, currency, percent
 */
export function formatNumber(value, format) {
  if (value == null || isNaN(value)) return '\u2014';
  const fmt = format || dom.numberFormat.value;
  const abs = Math.abs(value);
  const decimals = dom.decimalPlaces ? dom.decimalPlaces.value : 'auto';
  const currency = dom.currencyPrefix ? dom.currencyPrefix.value || '$' : '$';

  function dp(defaultSmall, defaultLarge) {
    if (decimals !== 'auto') return parseInt(decimals);
    return abs < 10 ? defaultSmall : defaultLarge;
  }

  switch (fmt) {
    case 'auto':
    case 'short':
      if (abs >= 1e12) return (value / 1e12).toFixed(dp(2, 1)) + 'T';
      if (abs >= 1e9) return (value / 1e9).toFixed(dp(2, 1)) + 'B';
      if (abs >= 1e6) return (value / 1e6).toFixed(dp(2, 1)) + 'M';
      if (abs >= 1e3) return (value / 1e3).toFixed(dp(2, 1)) + 'K';
      return value.toFixed(dp(1, 0));
    case 'raw':
      return String(value);
    case 'comma':
      return value.toLocaleString('en-US', { maximumFractionDigits: decimals === 'auto' ? 0 : parseInt(decimals) });
    case 'currency':
      if (abs >= 1e12) return currency + (value / 1e12).toFixed(dp(2, 1)) + 'T';
      if (abs >= 1e9) return currency + (value / 1e9).toFixed(dp(2, 1)) + 'B';
      if (abs >= 1e6) return currency + (value / 1e6).toFixed(dp(2, 1)) + 'M';
      if (abs >= 1e3) return currency + (value / 1e3).toFixed(dp(2, 1)) + 'K';
      return currency + value.toFixed(dp(2, 2));
    case 'percent':
      return value.toFixed(decimals === 'auto' ? 1 : parseInt(decimals)) + '%';
    default:
      return String(value);
  }
}
