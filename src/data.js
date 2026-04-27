import { CONFIG, DEFAULT_COLORS } from './constants.js';
import { state } from './state.js';
import { dom, $, $$ } from './dom.js';
import { debounce, safeInt, safeFloat, escapeHtml, showToast } from './utils.js';
import { formatNumber } from './format.js';
import { tryParseDate, isDateColumn, formatDateLabel, getAutoDateFormat } from './date-utils.js';
import { getMultiColors } from './charts/base-options.js';

// ═══════════════════════════════════════════
//  Downsampling
// ═══════════════════════════════════════════

export function downsampleData(data, mode) {
  if (!data || !data.isTimeSeries || !data.dateObjects) return data;
  if (mode === 'none') return data;

  const { dateObjects, labels, datasets } = data;

  if (mode === 'auto') {
    const count = labels.length;
    if (count <= 500) return data;
    if (count <= 2000) mode = 'monthly';
    else mode = 'quarterly';
  }

  function getBucket(date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    switch (mode) {
      case 'weekly': {
        const startOfYear = new Date(y, 0, 1);
        const week = Math.floor((date - startOfYear) / (7 * 24 * 60 * 60 * 1000));
        return `${y}-W${String(week).padStart(2, '0')}`;
      }
      case 'monthly': return `${y}-${String(m + 1).padStart(2, '0')}`;
      case 'quarterly': return `${y}-Q${Math.floor(m / 3) + 1}`;
      case 'yearly': return String(y);
      default: return `${y}-${String(m + 1).padStart(2, '0')}`;
    }
  }

  const buckets = new Map();
  dateObjects.forEach((date, i) => {
    if (!date) return;
    const key = getBucket(date);
    if (!buckets.has(key)) {
      buckets.set(key, { date, indices: [] });
    }
    buckets.get(key).indices.push(i);
  });

  const sorted = [...buckets.entries()].sort((a, b) => a[1].date - b[1].date);
  const newLabels = [];
  const newDateObjects = [];
  const newDatasets = datasets.map(ds => ({ name: ds.name, values: [] }));
  const autoFmt = data.dateRange ? getAutoDateFormat(data.dateRange) : 'MMM yyyy';

  for (const [, bucket] of sorted) {
    newLabels.push(formatDateLabel(bucket.date, autoFmt));
    newDateObjects.push(bucket.date);
    datasets.forEach((ds, dsIdx) => {
      const vals = bucket.indices.map(i => ds.values[i]).filter(v => v != null && !isNaN(v));
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      newDatasets[dsIdx].values.push(avg);
    });
  }

  return {
    labels: newLabels,
    datasets: newDatasets,
    isTimeSeries: true,
    dateObjects: newDateObjects,
    dateRange: data.dateRange
  };
}

// ═══════════════════════════════════════════
//  Zoom
// ═══════════════════════════════════════════

export function applyZoom(data) {
  if (!data) return data;
  if (state.zoomRange[0] === 0 && state.zoomRange[1] === 100) return data;

  const len = data.labels.length;
  const startIdx = Math.floor((state.zoomRange[0] / 100) * len);
  const endIdx = Math.ceil((state.zoomRange[1] / 100) * len);

  return {
    labels: data.labels.slice(startIdx, endIdx),
    datasets: data.datasets.map(ds => ({
      ...ds,
      values: ds.values.slice(startIdx, endIdx)
    })),
    isTimeSeries: data.isTimeSeries,
    dateObjects: data.dateObjects ? data.dateObjects.slice(startIdx, endIdx) : null,
    dateRange: data.dateRange
  };
}

export function updateZoomLabels() {
  let lbls = [];
  if (state.currentChartType === 'innovator') {
    lbls = state.currentInnovatorLabels;
  } else if (state.parsedData) {
    lbls = state.parsedData.labels;
  }

  if (!lbls || lbls.length === 0) return;

  const len = lbls.length;
  const startIdx = Math.floor((state.zoomRange[0] / 100) * len);
  const endIdx = Math.min(Math.ceil((state.zoomRange[1] / 100) * len), len - 1);
  dom.zoomLabelStart.textContent = lbls[startIdx] || '';
  dom.zoomLabelEnd.textContent = lbls[endIdx] || '';

  const thumbW = 16;
  dom.zoomSliderRange.style.left = `calc(${state.zoomRange[0]}% + ${thumbW / 2 - (state.zoomRange[0] / 100) * thumbW}px)`;
  dom.zoomSliderRange.style.width = `calc(${state.zoomRange[1] - state.zoomRange[0]}% - ${(state.zoomRange[1] - state.zoomRange[0]) / 100 * thumbW}px)`;
}

// ═══════════════════════════════════════════
//  Data Parsing
// ═══════════════════════════════════════════

function smartParseNumber(v) {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (!v || typeof v !== 'string') return null;
  v = v.trim();
  if (v === '' || v.toLowerCase() === 'nan' || v.toLowerCase() === 'null') return null;

  let isNegative = false;
  if (v.startsWith('(') && v.endsWith(')')) {
    isNegative = true;
    v = v.slice(1, -1);
  } else if (v.startsWith('-')) {
    isNegative = true;
    v = v.slice(1);
  }

  let multiplier = 1;
  const lastChar = v.charAt(v.length - 1).toLowerCase();
  if (lastChar === 'k') { multiplier = 1e3; v = v.slice(0, -1); }
  else if (lastChar === 'm') { multiplier = 1e6; v = v.slice(0, -1); }
  else if (lastChar === 'b') { multiplier = 1e9; v = v.slice(0, -1); }
  else if (lastChar === '%') { multiplier = 1; v = v.slice(0, -1); }

  v = v.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(v);
  if (isNaN(parsed)) return null;

  return (isNegative ? -1 : 1) * parsed * multiplier;
}

export function parseJSONData(text) {
  let json;
  try {
    json = JSON.parse(text.trim());
  } catch {
    return null;
  }

  let labels = [];
  let datasets = [];
  let isTimeSeries = false;
  let dateObjects = null;
  let dateRange = null;

  if (json.labels && Array.isArray(json.datasets)) {
    labels = json.labels.map(String);
    datasets = json.datasets.map((ds, i) => ({
      name: ds.name || ds.label || `Series ${i + 1}`,
      values: (ds.values || ds.data || []).map(v => smartParseNumber(v))
    }));
  } else if (json.labels && Array.isArray(json.values)) {
    labels = json.labels.map(String);
    datasets = [{
      name: json.name || json.label || 'Value',
      values: json.values.map(v => smartParseNumber(v))
    }];
  } else if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object' && !Array.isArray(json[0])) {
    const keys = Object.keys(json[0]);
    const labelKey = keys.find(k => ['label', 'name', 'category', 'month', 'year', 'date', 'x'].includes(k.toLowerCase())) || keys[0];
    const valueKeys = keys.filter(k => k !== labelKey);
    labels = json.map(item => String(item[labelKey] ?? ''));
    datasets = valueKeys.map(key => ({
      name: key,
      values: json.map(item => smartParseNumber(item[key]))
    }));
  } else if (Array.isArray(json) && json.length > 0 && Array.isArray(json[0])) {
    labels = json.map(row => String(row[0]));
    const maxCols = Math.max(...json.map(r => r.length));
    datasets = [];
    for (let i = 1; i < maxCols; i++) {
      datasets.push({
        name: `Series ${i}`,
        values: json.map(row => smartParseNumber(row[i]))
      });
    }
  } else if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'number') {
    labels = json.map((_, i) => String(i + 1));
    datasets = [{ name: 'Value', values: json }];
  } else if (typeof json === 'object' && !Array.isArray(json)) {
    const topKeys = Object.keys(json);
    if (topKeys.length > 0 && topKeys.every(k => {
      const v = json[k];
      return v && typeof v === 'object' && !Array.isArray(v);
    })) {
      labels = topKeys.map(String);
      const allSegKeys = new Set();
      topKeys.forEach(k => Object.keys(json[k]).forEach(sk => allSegKeys.add(sk)));
      const segKeys = [...allSegKeys];
      datasets = segKeys.map(key => ({
        name: key,
        values: topKeys.map(gk => smartParseNumber(json[gk][key]))
      }));
      return { labels, datasets, isTimeSeries: false, dateObjects: null, dateRange: null };
    }
    return null;
  } else {
    return null;
  }

  if (datasets.length === 0) return null;
  if (!datasets.some(ds => ds.values.some(v => v !== null))) return null;

  isTimeSeries = isDateColumn(labels);
  if (isTimeSeries) {
    dateObjects = labels.map(l => tryParseDate(l));
    const validDates = dateObjects.filter(Boolean);
    if (validDates.length > 0) {
      dateRange = {
        min: new Date(Math.min(...validDates.map(d => d.getTime()))),
        max: new Date(Math.max(...validDates.map(d => d.getTime())))
      };
      const indices = labels.map((_, i) => i);
      indices.sort((a, b) => {
        const da = dateObjects[a], db = dateObjects[b];
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
      labels = indices.map(i => labels[i]);
      dateObjects = indices.map(i => dateObjects[i]);
      datasets = datasets.map(ds => ({
        ...ds,
        values: indices.map(i => ds.values[i])
      }));
    }
  }

  return { labels, datasets, isTimeSeries, dateObjects, dateRange };
}

export async function parseDataFromText(text) {
  if (!text.trim()) return null;

  const result = await new Promise(resolve => {
    Papa.parse(text.trim(), {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: true,
      complete: resolve
    });
  });

  if (!result.data || result.data.length === 0) return null;

  let rows = result.data;

  if (rows.length > CONFIG.hardRowLimit) {
    showToast(`Data exceeds ${CONFIG.hardRowLimit.toLocaleString()} rows limit. Increase "Max Rows" or reduce data size.`, 'error');
    return null;
  }
  if (rows.length > CONFIG.warnRowLimit) {
    showToast(`Large dataset (${rows.length.toLocaleString()} rows). Auto-downsampling recommended.`, 'warning');
  }

  const expectedCols = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => {
    if (r.length < expectedCols) {
      return [...r, ...Array(expectedCols - r.length).fill(null)];
    }
    return r;
  });

  const firstRow = rows[0];
  let hasHeader = false;
  if (firstRow.length > 1 && typeof firstRow[0] === 'string') {
    hasHeader = typeof firstRow[1] === 'string' && isNaN(parseFloat(firstRow[1]));
  }

  let labels, seriesNames, dataRows;

  if (hasHeader) {
    seriesNames = firstRow.slice(1);
    dataRows = rows.slice(1);
  } else {
    dataRows = rows;
    seriesNames = dataRows[0].length > 2
      ? Array.from({ length: dataRows[0].length - 1 }, (_, i) => `Series ${i + 1}`)
      : ['Value'];
  }

  labels = dataRows.map(r => String(r[0]).trim());

  const isTS = isDateColumn(labels);
  let dateObjects = null;
  let dateRange = null;

  if (isTS) {
    dateObjects = labels.map(l => tryParseDate(l));
    const validDates = dateObjects.filter(Boolean);
    if (validDates.length > 0) {
      dateRange = {
        min: new Date(Math.min(...validDates.map(d => d.getTime()))),
        max: new Date(Math.max(...validDates.map(d => d.getTime())))
      };
      const indices = dataRows.map((r, i) => i);
      indices.sort((a, b) => {
        const da = dateObjects[a], db = dateObjects[b];
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
      labels = indices.map(i => labels[i]);
      dateObjects = indices.map(i => dateObjects[i]);
      dataRows = indices.map(i => dataRows[i]);
    }
  }

  const datasets = [];
  let hasAnyValidNumber = false;
  for (let i = 1; i < (dataRows[0] || []).length; i++) {
    const values = dataRows.map(r => smartParseNumber(r[i]));
    if (values.some(v => v !== null)) hasAnyValidNumber = true;
    datasets.push({
      name: seriesNames[i - 1] || `Series ${i}`,
      values: values
    });
  }

  if (!hasAnyValidNumber && datasets.length > 0) {
    showToast('No valid numeric data found for chart.', 'error');
    return null;
  }

  return { labels, datasets, isTimeSeries: isTS, dateObjects, dateRange };
}

export function parseInputText(text) {
  if (state.dataFormat === 'json') {
    return parseJSONData(text);
  }
  const trimmed = text.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && state.dataFormat !== 'csv') {
    const jsonResult = parseJSONData(text);
    if (jsonResult) return Promise.resolve(jsonResult);
  }
  return parseDataFromText(text);
}

// ═══════════════════════════════════════════
//  Sample Data & Pipeline
// ═══════════════════════════════════════════

export { smartParseNumber };

export function convertParsedDataToSegments(data) {
  if (!data || !data.labels || !data.datasets || data.datasets.length === 0) return;
  const colors = getMultiColors();

  if (data.labels.length > 1) {
    state.segmentedGroups = data.labels.map((label, labelIdx) => ({
      name: String(label),
      segments: data.datasets
        .map((ds, dsIdx) => ({
          label: ds.name,
          value: ds.values[labelIdx] || 0,
          color: colors[dsIdx % colors.length]
        }))
        .filter(s => s.value > 0)
    }));
    state.activeGroupIndex = 0;
    state.segmentedSegments = [...state.segmentedGroups[0].segments];
  } else {
    state.segmentedSegments = data.labels.map((label, i) => ({
      label: String(label),
      value: data.datasets[0].values[i] || 0,
      color: colors[i % colors.length]
    }));
    state.segmentedGroups = [{ name: '', segments: [...state.segmentedSegments] }];
    state.activeGroupIndex = 0;
  }
}

export function applyDownsampling() {
  if (!state.rawParsedData) { state.parsedData = null; return; }
  const mode = dom.downsampleSelect.value;
  state.parsedData = downsampleData(state.rawParsedData, mode);
}

export function updateDataPreview() {
  if (!state.parsedData) {
    dom.dataPreview.innerHTML = '<p class="placeholder-text">No data loaded yet</p>';
    return;
  }

  const { labels, datasets } = state.parsedData;
  const maxPreview = 20;
  const showAll = labels.length <= maxPreview;
  const displayLabels = showAll ? labels : [...labels.slice(0, 10), '...', ...labels.slice(-5)];

  let html = '<table><thead><tr><th>Label</th>';
  datasets.forEach(ds => { html += `<th>${escapeHtml(ds.name)}</th>`; });
  html += '</tr></thead><tbody>';

  displayLabels.forEach((label, i) => {
    if (label === '...') {
      html += `<tr class="ellipsis-row"><td colspan="${datasets.length + 1}">\u2026 ${labels.length - 15} more rows \u2026</td></tr>`;
      return;
    }
    const realIdx = showAll ? i : (i < 10 ? i : labels.length - (displayLabels.length - i));
    html += `<tr><td>${escapeHtml(label)}</td>`;
    datasets.forEach(ds => {
      const val = ds.values[realIdx];
      if (val != null) {
        const display = Number.isInteger(val) ? String(val) : String(parseFloat(val.toFixed(4)));
        html += `<td>${display}</td>`;
      } else {
        html += `<td>\u2014</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  dom.dataPreview.innerHTML = html;
}

export function updateDataInfo() {
  if (!state.parsedData) {
    dom.dataInfo.textContent = '';
    dom.rowCountBadge.textContent = '';
    return;
  }
  const count = state.parsedData.labels.length;
  const rawCount = state.rawParsedData ? state.rawParsedData.labels.length : count;
  let info = `${rawCount.toLocaleString()} rows`;
  if (rawCount !== count) {
    info += ` \u2192 ${count.toLocaleString()} (downsampled)`;
  }
  if (state.parsedData.dateRange) {
    const fmt = { year: 'numeric', month: 'short' };
    info += ` \u00B7 ${state.parsedData.dateRange.min.toLocaleDateString('en-US', fmt)} \u2014 ${state.parsedData.dateRange.max.toLocaleDateString('en-US', fmt)}`;
  }
  dom.dataInfo.textContent = info;
  dom.rowCountBadge.textContent = count;
}

export function updateDataOptions() {
  if (!state.rawParsedData) {
    dom.dataOptionsSection.style.display = 'none';
    return;
  }

  const showOptions = state.rawParsedData.labels.length > 100 || state.rawParsedData.datasets.length > 1;
  dom.dataOptionsSection.style.display = showOptions ? 'block' : 'none';

  dom.columnSelect.innerHTML = '';
  state.rawParsedData.datasets.forEach((ds, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = ds.name;
    if (i === 0) opt.selected = true;
    dom.columnSelect.appendChild(opt);
  });

  const rows = state.rawParsedData.labels.length;
  let sizeHtml = `<span class="data-size-label">${rows.toLocaleString()} data points</span>`;
  if (rows <= 500) {
    sizeHtml += `<span class="data-size-ok">\u2713 Optimal size</span>`;
  } else if (rows <= 2000) {
    sizeHtml += `<span class="data-size-ok">\u2713 Good size</span>`;
  } else if (rows <= CONFIG.warnRowLimit) {
    sizeHtml += `<span class="data-size-warn">\u26A1 Large dataset \u2014 downsampling recommended</span>`;
  } else {
    sizeHtml += `<span class="data-size-danger">\u26A0 Very large \u2014 may impact performance</span>`;
  }
  dom.dataSizeInfo.innerHTML = sizeHtml;

  const isAxisChart = ['line', 'timeline', 'bar', 'vbar', 'area', 'scatter', 'waterfall', 'combo'].includes(state.currentChartType);
  if (state.rawParsedData.datasets.length >= 2 && isAxisChart) {
    dom.dualAxisSection.style.display = 'block';
    if (state.axisAssignments.length !== state.rawParsedData.datasets.length) {
      state.axisAssignments = state.rawParsedData.datasets.map((_, i) => i === 0 ? 'left' : 'right');
    }
    // renderAxisAssignments will be called from main.js
    if (state.datasetChartTypes.length !== state.rawParsedData.datasets.length) {
      state.datasetChartTypes = state.rawParsedData.datasets.map((_, i) => i === 0 ? 'bar' : 'line');
    }
    // renderComboDatasetTypes will be called from main.js if needed
  } else {
    dom.dualAxisSection.style.display = 'none';
    state.dualAxisEnabled = false;
    if (dom.dualAxisToggle) dom.dualAxisToggle.checked = false;
  }
}

export function updateZoomSlider() {
  const isInnovator = state.currentChartType === 'innovator';
  if (!state.parsedData && !isInnovator) {
    dom.zoomSliderContainer.style.display = 'none';
    return;
  }
  const isLineChart = ['line', 'timeline', 'area', 'innovator', 'combo'].includes(state.currentChartType);
  const len = isInnovator ? state.currentInnovatorLabels.length : (state.parsedData ? state.parsedData.labels.length : 0);
  if (!isLineChart && len < 50) {
    dom.zoomSliderContainer.style.display = 'none';
    return;
  }
  dom.zoomSliderContainer.style.display = 'block';
  dom.zoomMin.value = state.zoomRange[0];
  dom.zoomMax.value = state.zoomRange[1];
  updateZoomLabels();
}

export function addManualRow() {
  const row = document.createElement('div');
  row.className = 'manual-row';
  row.innerHTML = `<input type="text" class="manual-cell" placeholder="Label">`;
  for (let i = 0; i < state.seriesCount; i++) {
    row.innerHTML += `<input type="number" class="manual-cell" placeholder="Value">`;
  }
  dom.manualRows.appendChild(row);
}

export function parseManualData() {
  const rows = dom.manualRows.querySelectorAll('.manual-row');
  const labels = [];
  const datasets = [];

  const headers = dom.manualRows.parentElement.querySelectorAll('.header-cell');

  for (let i = 0; i < state.seriesCount; i++) {
    const headerVal = headers[i + 1] ? headers[i + 1].value : `Series ${i + 1}`;
    datasets.push({ name: headerVal || `Series ${i + 1}`, values: [] });
  }

  rows.forEach(row => {
    const cells = row.querySelectorAll('.manual-cell');
    const label = cells[0]?.value;
    if (!label) return;
    labels.push(label);
    for (let i = 1; i < cells.length; i++) {
      if (datasets[i - 1]) {
        datasets[i - 1].values.push(smartParseNumber(cells[i].value));
      }
    }
  });

  if (labels.length > 0) {
    state.rawParsedData = { labels, datasets, isTimeSeries: false, dateObjects: null, dateRange: null };
    state.parsedData = state.rawParsedData;
    // updateAfterDataLoad will be called from main.js
  }
}
