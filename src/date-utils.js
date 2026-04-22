/** Attempts to parse a string as a Date using strict pattern matching */
export function tryParseDate(str) {
  if (!str || typeof str !== 'string') return null;
  str = str.trim();

  const strictPatterns = [
    /^\d{4}-\d{1,2}-\d{1,2}$/,
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-]+\d{1,2},?\s*\d{2,4}$/i,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-]+\d{2,4}$/i,
    /^\d{4}[\/\-]\d{1,2}$/,
  ];

  const isStrict = strictPatterns.some(p => p.test(str));
  if (!isStrict) return null;

  const d = new Date(str);
  if (!isNaN(d.getTime()) && str.match(/\d{2,4}/)) return d;

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (a > 31) { const d2 = new Date(a, b - 1, c); if (!isNaN(d2)) return d2; }
    if (c > 31) { const d2 = new Date(c, a - 1, b); if (!isNaN(d2)) return d2; }
  }
  return null;
}

/** Heuristic: checks if a column contains dates by sampling the first 20 values */
export function isDateColumn(values) {
  if (!values || values.length === 0) return false;
  let dateCount = 0;
  const sample = values.slice(0, Math.min(20, values.length));
  for (const v of sample) {
    if (tryParseDate(String(v))) dateCount++;
  }
  return dateCount / sample.length > 0.7;
}

/** Formats a Date object into a human-readable label */
export function formatDateLabel(date, format) {
  if (!date || !(date instanceof Date)) return String(date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  switch (format) {
    case 'yyyy': return String(y);
    case 'MMM yyyy': return `${months[m]} ${y}`;
    case 'MMM yy': return `${months[m]} '${String(y).slice(2)}`;
    case 'MM/yyyy': return `${String(m + 1).padStart(2, '0')}/${y}`;
    case 'MMM': return months[m];
    case 'DD MMM': return `${d} ${months[m]}`;
    case 'auto':
    default: return `${months[m]} ${y}`;
  }
}

/** Picks an appropriate date format based on the time span */
export function getAutoDateFormat(dateRange) {
  if (!dateRange) return 'MMM yyyy';
  const diffDays = (dateRange.max - dateRange.min) / (1000 * 60 * 60 * 24);
  if (diffDays > 365 * 5) return 'yyyy';
  if (diffDays > 365) return 'MMM yyyy';
  if (diffDays > 30) return 'MMM yy';
  return 'DD MMM';
}
