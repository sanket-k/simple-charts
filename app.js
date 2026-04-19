/* ═══════════════════════════════════════════
   Simple Charts — Application Logic
   ═══════════════════════════════════════════ */

(() => {
  'use strict';

  // ── Constants ──
  const PALETTE = {
    dark: {
      hero: '#F7931A',
      secondary: '#60A5FA',
      bg: '#111622',
      grid: '#334155',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      border: '#2a3345',
    },
    light: {
      hero: '#F7931A',
      secondary: '#3B82F6',
      bg: '#FFFBF6',
      grid: '#E8DDD0',
      text: '#1E293B',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      border: '#E8DDD0',
    }
  };

  const DEFAULT_COLORS = ['#F7931A', '#60A5FA', '#34D399', '#F472B6', '#A78BFA'];
  const EXTRA_COLORS = ['#FBBF24', '#FB923C', '#2DD4BF', '#818CF8', '#F87171'];

  const PRESET_PALETTES = {
    default: ['#F7931A', '#60A5FA', '#34D399', '#F472B6', '#A78BFA'],
    warm: ['#F59E0B', '#EF4444', '#F97316', '#EC4899', '#D97706'],
    cool: ['#3B82F6', '#06B6D4', '#8B5CF6', '#14B8A6', '#6366F1'],
    neon: ['#00FF87', '#FF006E', '#FFBE0B', '#3A86FF', '#8338EC'],
    pastel: ['#FCA5A5', '#93C5FD', '#86EFAC', '#FDE68A', '#C4B5FD'],
    mono: ['#F8FAFC', '#CBD5E1', '#94A3B8', '#64748B', '#475569']
  };

  const SEMANTIC = { up: '#34D399', down: '#F87171' };

  const CONFIG = {
    warnRowLimit: 10000,
    hardRowLimit: 50000,
    maxBars: 30,
    maxPieSlices: 12,
    maxDonutSlices: 10,
    eventProximityMs: 30 * 24 * 60 * 60 * 1000,
    debounceMs: 300,
  };

  // ── State ──
  let currentTheme = 'dark';
  let currentChartType = 'line';
  let chartInstance = null;
  let parsedData = null;
  let rawParsedData = null;
  let currentInnovatorLabels = [];
  let timelineEvents = [];
  let userColors = [...DEFAULT_COLORS];
  let userBgColor = null;
  let userGridColor = null;
  let brandLogoUrl = null;
  let brandLogoImg = null;
  let dualAxisEnabled = false;
  let axisAssignments = [];
  let axisNames = {};
  let zoomRange = [0, 100];

  // ── Utilities ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  function safeInt(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeFloat(val, fallback) {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function wrapText(text, maxChars) {
    if (!text) return [''];
    if (text.length <= maxChars) return [text];
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      if (line.length + word.length + 1 > maxChars && line.length > 0) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  // ── DOM Refs ──
  const dom = {
    themeToggle: $('#themeToggle'),
    exportBtn: $('#exportBtn'),
    exportSize: $('#exportSize'),
    exportFormat: $('#exportFormat'),
    copyClipboardBtn: $('#copyClipboardBtn'),
    chartCanvas: $('#chartCanvas'),
    chartContainer: $('#chartContainer'),
    chartTypeGrid: $('#chartTypeGrid'),
    dataTextarea: $('#dataTextarea'),
    parseDataBtn: $('#parseDataBtn'),
    chartTitle: $('#chartTitle'),
    chartSubtitle: $('#chartSubtitle'),
    chartSource: $('#chartSource'),
    chartCurve: $('#chartCurve'),
    pointSize: $('#pointSize'),
    lineWidth: $('#lineWidth'),
    showLegend: $('#showLegend'),
    showGrid: $('#showGrid'),
    showDataLabels: $('#showDataLabels'),
    fillArea: $('#fillArea'),
    spanGaps: $('#spanGaps'),
    dataPreview: $('#dataPreview'),
    dataInfo: $('#dataInfo'),
    rowCountBadge: $('#rowCountBadge'),
    timelineSettings: $('#timelineSettings'),
    timelineEventsList: $('#timelineEventsList'),
    addTimelineEvent: $('#addTimelineEvent'),
    bulkEventsTextarea: $('#bulkEventsTextarea'),
    parseBulkEventsBtn: $('#parseBulkEventsBtn'),
    fileDropZone: $('#fileDropZone'),
    csvFileInput: $('#csvFileInput'),
    addRowBtn: $('#addRowBtn'),
    addSeriesBtn: $('#addSeriesBtn'),
    manualRows: $('#manualRows'),
    series1Name: $('#series1Name'),
    numberFormat: $('#numberFormat'),
    dateFormat: $('#dateFormat'),
    maxTicks: $('#maxTicks'),
    maxTicksValue: $('#maxTicksValue'),
    yAxisScale: $('#yAxisScale'),
    downsampleSelect: $('#downsampleSelect'),
    columnSelect: $('#columnSelect'),
    dataOptionsSection: $('#dataOptionsSection'),
    dataSizeInfo: $('#dataSizeInfo'),
    resetColorsBtn: $('#resetColorsBtn'),
    zoomSliderContainer: $('#zoomSliderContainer'),
    zoomMin: $('#zoomMin'),
    zoomMax: $('#zoomMax'),
    zoomSliderRange: $('#zoomSliderRange'),
    zoomLabelStart: $('#zoomLabelStart'),
    zoomLabelEnd: $('#zoomLabelEnd'),
    zoomResetBtn: $('#zoomResetBtn'),
    showEventMarkers: $('#showEventMarkers'),
    eventMarkerColor: $('#eventMarkerColor'),
    gridStyle: $('#gridStyle'),
    barBorderRadius: $('#barBorderRadius'),
    barBorderRadiusValue: $('#barBorderRadiusValue'),
    legendPosition: $('#legendPosition'),
    tooltipStyle: $('#tooltipStyle'),
    animationSpeed: $('#animationSpeed'),
    yAxisMin: $('#yAxisMin'),
    yAxisMax: $('#yAxisMax'),
    xAxisRotation: $('#xAxisRotation'),
    xAxisRotationValue: $('#xAxisRotationValue'),
    xAxisType: $('#xAxisType'),
    xAxisLabel: $('#xAxisLabel'),
    yAxisLabel: $('#yAxisLabel'),
    decimalPlaces: $('#decimalPlaces'),
    currencyPrefix: $('#currencyPrefix'),
    refLineY: $('#refLineY'),
    refLineLabel: $('#refLineLabel'),
    exportQuality: $('#exportQuality'),
    copyJsonBtn: $('#copyJsonBtn'),
    chartBgColor: $('#chartBgColor'),
    chartGridColor: $('#chartGridColor'),
    maxRowsInput: $('#maxRowsInput'),
    brandName: $('#brandName'),
    brandLogoFile: $('#brandLogoFile'),
    brandLogoBtn: $('#brandLogoBtn'),
    brandLogoClearBtn: $('#brandLogoClearBtn'),
    brandLogoPreview: $('#brandLogoPreview'),
    brandPosition: $('#brandPosition'),
    brandOpacity: $('#brandOpacity'),
    brandOpacityValue: $('#brandOpacityValue'),
    dualAxisToggle: $('#dualAxisToggle'),
    dualAxisSection: $('#dualAxisSection'),
    axisAssignmentList: $('#axisAssignmentList'),
    presetPalettes: $('#presetPalettes'),
    innovatorSettings: $('#innovatorSettings'),
    innovatorXLabel: $('#innovatorXLabel'),
    innovatorYLabel: $('#innovatorYLabel'),
    innovatorTiers: $('#innovatorTiers'),
    innovatorTiersValue: $('#innovatorTiersValue'),
    innovatorSustainingPace: $('#innovatorSustainingPace'),
    innovatorSustainingPaceValue: $('#innovatorSustainingPaceValue'),
    innovatorShowIncumbent: $('#innovatorShowIncumbent'),
    innovatorShowDisruptive: $('#innovatorShowDisruptive'),
    innovatorIncumbentName: $('#innovatorIncumbentName'),
    innovatorDisruptiveName: $('#innovatorDisruptiveName'),
    innovatorDisruptionPace: $('#innovatorDisruptionPace'),
    innovatorDisruptionPaceValue: $('#innovatorDisruptionPaceValue'),
    innovatorDisruptiveStart: $('#innovatorDisruptiveStart'),
    innovatorDisruptiveStartValue: $('#innovatorDisruptiveStartValue'),
    innovatorDisruptivePeak: $('#innovatorDisruptivePeak'),
    innovatorDisruptivePeakValue: $('#innovatorDisruptivePeakValue'),
    innovatorMarketTop: $('#innovatorMarketTop'),
    innovatorMarketTopValue: $('#innovatorMarketTopValue'),
    innovatorMarketBottom: $('#innovatorMarketBottom'),
    innovatorMarketBottomValue: $('#innovatorMarketBottomValue'),
    innovatorIncumbentBase: $('#innovatorIncumbentBase'),
    innovatorIncumbentBaseValue: $('#innovatorIncumbentBaseValue'),
    innovatorIncumbentSlope: $('#innovatorIncumbentSlope'),
    innovatorIncumbentSlopeValue: $('#innovatorIncumbentSlopeValue'),
    innovatorYMin: $('#innovatorYMin'),
    innovatorYMax: $('#innovatorYMax'),
    innovatorTierNames: $('#innovatorTierNames'),
    innovatorCurveType: $('#innovatorCurveType'),
    innovatorTimeMode: $('#innovatorTimeMode'),
    innovatorTimeYears: $('#innovatorTimeYears'),
    innovatorTimeMonths: $('#innovatorTimeMonths'),
    innovatorStartYear: $('#innovatorStartYear'),
    innovatorEndYear: $('#innovatorEndYear'),
    innovatorStartMonth: $('#innovatorStartMonth'),
    innovatorEndMonth: $('#innovatorEndMonth'),
  };

  const colorPairs = [
    { picker: $('#colorHero'), hex: $('#colorHeroHex'), idx: 0 },
    { picker: $('#colorSecondary'), hex: $('#colorSecondaryHex'), idx: 1 },
    { picker: $('#colorTertiary'), hex: $('#colorTertiaryHex'), idx: 2 },
    { picker: $('#colorFourth'), hex: $('#colorFourthHex'), idx: 3 },
    { picker: $('#colorFifth'), hex: $('#colorFifthHex'), idx: 4 },
  ];

  // ═══════════════════════════════════════════
  //  Number Formatting
  // ═══════════════════════════════════════════

  function formatNumber(value, format) {
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

  // ═══════════════════════════════════════════
  //  Date Utilities
  // ═══════════════════════════════════════════

  function tryParseDate(str) {
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

  function isDateColumn(values) {
    if (!values || values.length === 0) return false;
    let dateCount = 0;
    const sample = values.slice(0, Math.min(20, values.length));
    for (const v of sample) {
      if (tryParseDate(String(v))) dateCount++;
    }
    return dateCount / sample.length > 0.7;
  }

  function formatDateLabel(date, format) {
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

  function getAutoDateFormat(dateRange) {
    if (!dateRange) return 'MMM yyyy';
    const diffDays = (dateRange.max - dateRange.min) / (1000 * 60 * 60 * 24);
    if (diffDays > 365 * 5) return 'yyyy';
    if (diffDays > 365) return 'MMM yyyy';
    if (diffDays > 30) return 'MMM yy';
    return 'DD MMM';
  }

  // ═══════════════════════════════════════════
  //  Downsampling
  // ═══════════════════════════════════════════

  function downsampleData(data, mode) {
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
        const vals = bucket.indices
          .map(i => ds.values[i])
          .filter(v => v != null && !isNaN(v));
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

  function applyZoom(data) {
    if (!data) return data;
    if (zoomRange[0] === 0 && zoomRange[1] === 100) return data;

    const len = data.labels.length;
    const startIdx = Math.floor((zoomRange[0] / 100) * len);
    const endIdx = Math.ceil((zoomRange[1] / 100) * len);

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

  function updateZoomLabels() {
    let lbls = [];
    if (currentChartType === 'innovator') {
      lbls = currentInnovatorLabels;
    } else if (parsedData) {
      lbls = parsedData.labels;
    }

    if (!lbls || lbls.length === 0) return;

    const len = lbls.length;
    const startIdx = Math.floor((zoomRange[0] / 100) * len);
    const endIdx = Math.min(Math.ceil((zoomRange[1] / 100) * len), len - 1);
    dom.zoomLabelStart.textContent = lbls[startIdx] || '';
    dom.zoomLabelEnd.textContent = lbls[endIdx] || '';

    const thumbW = 16;
    dom.zoomSliderRange.style.left = `calc(${zoomRange[0]}% + ${thumbW / 2 - (zoomRange[0] / 100) * thumbW}px)`;
    dom.zoomSliderRange.style.width = `calc(${zoomRange[1] - zoomRange[0]}% - ${(zoomRange[1] - zoomRange[0]) / 100 * thumbW}px)`;
  }

  // ═══════════════════════════════════════════
  //  Theme
  // ═══════════════════════════════════════════

  function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (!userBgColor && dom.chartBgColor) {
      dom.chartBgColor.value = PALETTE[theme].bg;
    }
    if (!userGridColor && dom.chartGridColor) {
      dom.chartGridColor.value = PALETTE[theme].grid;
    }
    renderChart();
  }

  dom.themeToggle.addEventListener('click', () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // ═══════════════════════════════════════════
  //  Color Pickers
  // ═══════════════════════════════════════════

  colorPairs.forEach(({ picker, hex, idx }) => {
    if (!picker || !hex) return;

    picker.addEventListener('input', () => {
      hex.value = picker.value.toUpperCase();
      userColors[idx] = picker.value.toUpperCase();
      renderChart();
    });

    hex.addEventListener('input', () => {
      let val = hex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        picker.value = val;
        userColors[idx] = val.toUpperCase();
        renderChart();
      }
    });

    hex.addEventListener('blur', () => {
      hex.value = userColors[idx];
    });
  });

  dom.resetColorsBtn.addEventListener('click', () => {
    DEFAULT_COLORS.forEach((color, i) => {
      userColors[i] = color;
      if (colorPairs[i]) {
        colorPairs[i].picker.value = color;
        colorPairs[i].hex.value = color;
      }
    });
    userBgColor = null;
    userGridColor = null;
    if (dom.chartBgColor) dom.chartBgColor.value = currentTheme === 'dark' ? '#111622' : '#FFFBF6';
    if (dom.chartGridColor) dom.chartGridColor.value = currentTheme === 'dark' ? '#334155' : '#E8DDD0';
    document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
    document.querySelector('.palette-swatch[data-palette="default"]')?.classList.add('active');
    renderChart();
    showToast('Colors reset to defaults', 'success');
  });

  dom.presetPalettes.addEventListener('click', (e) => {
    const swatch = e.target.closest('.palette-swatch');
    if (!swatch) return;
    const paletteName = swatch.dataset.palette;
    const palette = PRESET_PALETTES[paletteName];
    if (!palette) return;

    document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');

    palette.forEach((color, i) => {
      userColors[i] = color;
      if (colorPairs[i]) {
        colorPairs[i].picker.value = color;
        colorPairs[i].hex.value = color;
      }
    });
    renderChart();
  });

  // ═══════════════════════════════════════════
  //  Chart Type Selection & Settings Visibility
  // ═══════════════════════════════════════════

  function updateSettingsVisibility() {
    const t = currentChartType;
    const isAxisChart = ['line', 'timeline', 'bar', 'vbar', 'area', 'scatter', 'waterfall'].includes(t);
    
    if (dom.timelineSettings) dom.timelineSettings.style.display = (t === 'timeline' || t === 'innovator') ? 'block' : 'none';
    if (dom.innovatorSettings) dom.innovatorSettings.style.display = t === 'innovator' ? 'block' : 'none';

    const toggle = (el, show) => {
      if (el) {
        const group = el.closest('.input-group') || el.closest('.swatch-row') || el.parentElement;
        if (group) group.style.display = show ? '' : 'none';
      }
    };

    const toggleRow = (el, show) => {
      if (el) {
        const group = el.closest('.input-group-row');
        if (group) group.style.display = show ? '' : 'none';
      }
    };

    // Style
    toggle(dom.chartCurve, ['line', 'timeline', 'area', 'radar'].includes(t));
    toggle(dom.pointSize, ['line', 'timeline', 'scatter', 'radar', 'innovator'].includes(t));
    toggle(dom.lineWidth, ['line', 'timeline', 'area', 'radar', 'innovator'].includes(t));
    
    const hasGrid = ['line', 'timeline', 'bar', 'vbar', 'area', 'scatter', 'waterfall'].includes(t);
    toggle(dom.showGrid, hasGrid);
    toggle(dom.gridStyle, hasGrid);
    toggle(dom.chartGridColor, hasGrid);

    toggle(dom.fillArea, ['line', 'timeline'].includes(t));
    toggle(dom.spanGaps, ['line', 'timeline', 'area'].includes(t));
    toggle(dom.barBorderRadius, ['bar', 'vbar', 'waterfall'].includes(t));

    // Display
    toggle(dom.legendPosition, t !== 'innovator'); // Innovator doesn't have a standard dataset layout for legend sometimes, but let's just keep pie/donut logic out

    // Formatting
    toggle(dom.xAxisType, isAxisChart);
    toggle(dom.xAxisLabel, isAxisChart);
    toggle(dom.yAxisLabel, isAxisChart);
    toggle(dom.dateFormat, isAxisChart);
    toggle(dom.maxTicks, isAxisChart);
    toggle(dom.yAxisScale, isAxisChart);
    toggleRow(dom.yAxisMin, isAxisChart);
    toggle(dom.xAxisRotation, isAxisChart);

    // Annotations
    if (dom.refLineY) {
      const annSection = dom.refLineY.closest('.panel-section');
      if (annSection) annSection.style.display = isAxisChart ? '' : 'none';
    }

    if (dom.dualAxisSection) {
      if (!isAxisChart || !rawParsedData || rawParsedData.datasets.length < 2) {
        dom.dualAxisSection.style.display = 'none';
      } else {
        dom.dualAxisSection.style.display = 'block';
      }
    }
  }

  dom.chartTypeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.chart-type-btn');
    if (!btn) return;
    $$('.chart-type-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    currentChartType = btn.dataset.type;

    updateSettingsVisibility();
    renderChart();
    updateZoomSlider();
  });

  if (dom.innovatorTimeMode) {
    dom.innovatorTimeMode.addEventListener('change', () => {
      const mode = dom.innovatorTimeMode.value;
      if (dom.innovatorTimeYears) dom.innovatorTimeYears.style.display = mode === 'years' ? 'flex' : 'none';
      if (dom.innovatorTimeMonths) dom.innovatorTimeMonths.style.display = mode === 'months' ? 'flex' : 'none';
      renderChart();
    });
  }

  let innovatorTierCustomNames = [];

  function getInnovatorTierDefaultName(t, total) {
    if (total === 1) return 'Market Demand';
    if (t === 0) return 'High-end Market';
    if (t === total - 1) return 'Low-end Market';
    return `Market Tier ${t + 1}`;
  }

  function renderInnovatorTierNames() {
    if (!dom.innovatorTierNames) return;
    const tiers = safeInt(dom.innovatorTiers?.value, 3);

    if (innovatorTierCustomNames.length > tiers) {
      innovatorTierCustomNames.length = tiers;
    }

    dom.innovatorTierNames.innerHTML = '';
    for (let t = 0; t < tiers; t++) {
      const row = document.createElement('div');
      row.className = 'swatch-row';
      const label = document.createElement('label');
      label.className = 'inline-label';
      label.style.minWidth = '18px';
      label.textContent = `${t + 1}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'swatch-hex-input';
      input.style.flex = '1';
      input.style.width = 'auto';
      input.value = innovatorTierCustomNames[t] || '';
      input.placeholder = getInnovatorTierDefaultName(t, tiers);
      input.dataset.tierIndex = t;
      input.addEventListener('input', (e) => {
        innovatorTierCustomNames[parseInt(e.target.dataset.tierIndex)] = e.target.value;
        debouncedRender();
      });
      row.appendChild(label);
      row.appendChild(input);
      dom.innovatorTierNames.appendChild(row);
    }
  }

  dom.innovatorTiers.addEventListener('input', () => {
    renderInnovatorTierNames();
  });

  // ═══════════════════════════════════════════
  //  Data Input Tabs
  // ═══════════════════════════════════════════

  $$('.data-input-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.panel-section');
      parent.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  $$('.timeline-input-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.timeline-input-tabs .tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      $$('.tl-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $(`#tltab-${btn.dataset.tltab}`).classList.add('active');
    });
  });

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

  async function parseDataFromText(text) {
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

  async function loadSampleData() {
    const samplesByType = {
      line: "Month, Revenue, Costs\nJan, 4200, 3100\nFeb, 5100, 3400\nMar, 4800, 3200\nApr, 6200, 3800\nMay, 7100, 4100\nJun, 6800, 3900\nJul, 7800, 4300\nAug, 8200, 4500",
      timeline: "Month, Price\nJan 2024, 42000\nFeb 2024, 43500\nMar 2024, 51000\nApr 2024, 64000\nMay 2024, 61000\nJun 2024, 58000\nJul 2024, 63000\nAug 2024, 59000\nSep 2024, 55000\nOct 2024, 62000\nNov 2024, 72000\nDec 2024, 68000",
      bar: "Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100\nProduct D, 2900\nProduct E, 6300\nProduct F, 4700",
      vbar: "Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100\nProduct D, 2900\nProduct E, 6300\nProduct F, 4700",
      pie: "Segment, Share\nDeFi, 35\nNFTs, 22\nInfra, 18\nGaming, 15\nSocial, 10",
      donut: "Category, Percentage\nBitcoin, 42\nEthereum, 28\nSolana, 14\nOther L1s, 10\nStablecoins, 6",
      area: "Quarter, AI, Crypto, Fintech\nQ1 '24, 120, 80, 60\nQ2 '24, 180, 110, 75\nQ3 '24, 240, 150, 95\nQ4 '24, 310, 200, 120\nQ1 '25, 380, 260, 145",
      radar: "Metric, Us, Competitor\nSpeed, 90, 65\nCost, 75, 80\nAccuracy, 95, 70\nScale, 85, 60\nUX, 88, 72\nSupport, 92, 55",
      scatter: "X, Y\n10, 25\n22, 38\n35, 52\n18, 30\n42, 61\n28, 44\n55, 72\n15, 28\n48, 65\n33, 48\n60, 78\n25, 40\n38, 55\n45, 68\n12, 22",
      waterfall: "Category, Value\nRevenue, 5000\nCOGS, -2100\nGross Profit, 2900\nSalaries, -1200\nMarketing, -400\nR&D, -350\nNet Income, 950"
    };

    const sample = samplesByType[currentChartType] || samplesByType.line;
    dom.dataTextarea.value = sample;
    rawParsedData = await parseDataFromText(sample);
    parsedData = rawParsedData;

    if (currentChartType === 'timeline') {
      timelineEvents = [
        { label: 'ETF Approved', position: 'Mar 2024' },
        { label: 'Halving', position: 'Apr 2024' }
      ];
      renderTimelineEvents();
    }

    if (currentChartType === 'innovator') {
      timelineEvents = [
        { label: 'Disruption Begins', position: '3' },
        { label: 'Market Shift', position: '6' }
      ];
      renderTimelineEvents();
    }

    updateAfterDataLoad();
  }

  function updateAfterDataLoad() {
    applyDownsampling();
    updateSettingsVisibility();
    updateDataPreview();
    updateDataInfo();
    updateDataOptions();
    updateZoomSlider();
    renderChart();
  }

  function applyDownsampling() {
    if (!rawParsedData) { parsedData = null; return; }
    const mode = dom.downsampleSelect.value;
    parsedData = downsampleData(rawParsedData, mode);
  }

  function updateDataInfo() {
    if (!parsedData) {
      dom.dataInfo.textContent = '';
      dom.rowCountBadge.textContent = '';
      return;
    }
    const count = parsedData.labels.length;
    const rawCount = rawParsedData ? rawParsedData.labels.length : count;
    let info = `${rawCount.toLocaleString()} rows`;
    if (rawCount !== count) {
      info += ` \u2192 ${count.toLocaleString()} (downsampled)`;
    }
    if (parsedData.dateRange) {
      const fmt = { year: 'numeric', month: 'short' };
      info += ` \u00B7 ${parsedData.dateRange.min.toLocaleDateString('en-US', fmt)} \u2014 ${parsedData.dateRange.max.toLocaleDateString('en-US', fmt)}`;
    }
    dom.dataInfo.textContent = info;
    dom.rowCountBadge.textContent = count;
  }

  function updateDataOptions() {
    if (!rawParsedData) {
      dom.dataOptionsSection.style.display = 'none';
      return;
    }

    const showOptions = rawParsedData.labels.length > 100 || rawParsedData.datasets.length > 1;
    dom.dataOptionsSection.style.display = showOptions ? 'block' : 'none';

    dom.columnSelect.innerHTML = '';
    rawParsedData.datasets.forEach((ds, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = ds.name;
      if (i === 0) opt.selected = true;
      dom.columnSelect.appendChild(opt);
    });

    const rows = rawParsedData.labels.length;
    let sizeHtml = `<span class="data-size-label">${rows.toLocaleString()} data points</span>`;
    if (rows <= 500) {
      sizeHtml += `<span class="data-size-ok">\u2713 Optimal size</span>`;
    } else if (rows <= 2000) {
      sizeHtml += `<span class="data-size-ok">\u2713 Good size</span>`;
    } else if (rows <= CONFIG.warnRowLimit) {
      sizeHtml += `<span class="data-size-warn">\u26A1 Large dataset — downsampling recommended</span>`;
    } else {
      sizeHtml += `<span class="data-size-danger">\u26A0 Very large — may impact performance</span>`;
    }
    dom.dataSizeInfo.innerHTML = sizeHtml;

    const isAxisChart = ['line', 'timeline', 'bar', 'vbar', 'area', 'scatter', 'waterfall'].includes(currentChartType);
    if (rawParsedData.datasets.length >= 2 && isAxisChart) {
      dom.dualAxisSection.style.display = 'block';
      if (axisAssignments.length !== rawParsedData.datasets.length) {
        axisAssignments = rawParsedData.datasets.map((_, i) => i === 0 ? 'left' : 'right');
      }
      renderAxisAssignments();
    } else {
      dom.dualAxisSection.style.display = 'none';
      dualAxisEnabled = false;
      if (dom.dualAxisToggle) dom.dualAxisToggle.checked = false;
    }
  }

  function updateZoomSlider() {
    const isInnovator = currentChartType === 'innovator';
    if (!parsedData && !isInnovator) {
      dom.zoomSliderContainer.style.display = 'none';
      return;
    }
    const isLineChart = ['line', 'timeline', 'area', 'innovator'].includes(currentChartType);
    const len = isInnovator ? currentInnovatorLabels.length : (parsedData ? parsedData.labels.length : 0);
    if (!isLineChart && len < 50) {
      dom.zoomSliderContainer.style.display = 'none';
      return;
    }
    dom.zoomSliderContainer.style.display = 'block';
    dom.zoomMin.value = zoomRange[0];
    dom.zoomMax.value = zoomRange[1];
    updateZoomLabels();
  }

  dom.parseDataBtn.addEventListener('click', async () => {
    rawParsedData = await parseDataFromText(dom.dataTextarea.value);
    if (rawParsedData) {
      parsedData = rawParsedData;
      zoomRange = [0, 100];
      updateAfterDataLoad();
      showToast('Data parsed successfully', 'success');
    } else {
      showToast('Could not parse data', 'error');
    }
  });

  // ═══════════════════════════════════════════
  //  CSV File Upload
  // ═══════════════════════════════════════════

  dom.fileDropZone.addEventListener('click', () => dom.csvFileInput.click());

  dom.fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.fileDropZone.classList.add('dragover');
  });

  dom.fileDropZone.addEventListener('dragleave', () => {
    dom.fileDropZone.classList.remove('dragover');
  });

  dom.fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.fileDropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.match(/\.(csv|tsv|txt)$/i)) {
      handleCSVFile(file);
    }
  });

  dom.csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCSVFile(file);
  });

  function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      dom.dataTextarea.value = text.substring(0, 50000);
      rawParsedData = await parseDataFromText(text);
      if (rawParsedData) {
        const parent = dom.dataTextarea.closest('.panel-section');
        parent.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const pasteTab = parent.querySelector('.tab-btn[data-tab="paste"]');
        pasteTab.classList.add('active');
        pasteTab.setAttribute('aria-selected', 'true');
        $('#tab-paste').classList.add('active');

        parsedData = rawParsedData;
        zoomRange = [0, 100];
        updateAfterDataLoad();
        showToast(`Loaded ${file.name} (${rawParsedData.labels.length.toLocaleString()} rows)`, 'success');
      }
    };
    reader.readAsText(file);
  }

  // ═══════════════════════════════════════════
  //  Manual Data Entry
  // ═══════════════════════════════════════════

  let seriesCount = 1;

  dom.addRowBtn.addEventListener('click', () => addManualRow());

  dom.addSeriesBtn.addEventListener('click', () => {
    seriesCount++;
    const headerCell = document.createElement('input');
    headerCell.type = 'text';
    headerCell.className = 'manual-cell header-cell';
    headerCell.value = `Series ${seriesCount}`;
    dom.addSeriesBtn.parentElement.insertBefore(headerCell, dom.addSeriesBtn);

    dom.manualRows.querySelectorAll('.manual-row').forEach(row => {
      const cell = document.createElement('input');
      cell.type = 'number';
      cell.className = 'manual-cell';
      cell.placeholder = 'Value';
      row.appendChild(cell);
    });
  });

  function addManualRow() {
    const row = document.createElement('div');
    row.className = 'manual-row';
    row.innerHTML = `<input type="text" class="manual-cell" placeholder="Label">`;
    for (let i = 0; i < seriesCount; i++) {
      row.innerHTML += `<input type="number" class="manual-cell" placeholder="Value">`;
    }
    dom.manualRows.appendChild(row);
  }

  const parseManualDataDebounced = debounce(parseManualData, CONFIG.debounceMs);

  dom.manualRows.parentElement.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT') parseManualDataDebounced();
  });

  function parseManualData() {
    const rows = dom.manualRows.querySelectorAll('.manual-row');
    const labels = [];
    const datasets = [];

    const headers = dom.manualRows.parentElement.querySelectorAll('.header-cell');

    for (let i = 0; i < seriesCount; i++) {
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
      rawParsedData = { labels, datasets, isTimeSeries: false, dateObjects: null, dateRange: null };
      parsedData = rawParsedData;
      updateAfterDataLoad();
    }
  }

  // ═══════════════════════════════════════════
  //  Downsample & Column Select Listeners
  // ═══════════════════════════════════════════

  dom.downsampleSelect.addEventListener('change', () => {
    applyDownsampling();
    updateDataInfo();
    updateZoomSlider();
    renderChart();
  });

  dom.columnSelect.addEventListener('change', () => {
    renderChart();
  });

  function renderAxisAssignments() {
    if (!dom.axisAssignmentList || !rawParsedData) return;
    if (!dualAxisEnabled) {
      dom.axisAssignmentList.innerHTML = '';
      return;
    }

    const frag = document.createDocumentFragment();
    const container = document.createElement('div');

    const nameRowLeft = document.createElement('div');
    nameRowLeft.className = 'axis-assign-row';
    nameRowLeft.innerHTML = `<span class="axis-assign-label" style="font-weight:600;">Left Axis Name</span>`;
    const leftInput = document.createElement('input');
    leftInput.type = 'text';
    leftInput.className = 'axis-name-input';
    leftInput.dataset.axis = 'left';
    leftInput.value = axisNames.left || '';
    leftInput.placeholder = 'e.g. Revenue';
    nameRowLeft.appendChild(leftInput);
    container.appendChild(nameRowLeft);

    const nameRowRight = document.createElement('div');
    nameRowRight.className = 'axis-assign-row';
    nameRowRight.innerHTML = `<span class="axis-assign-label" style="font-weight:600;">Right Axis Name</span>`;
    const rightInput = document.createElement('input');
    rightInput.type = 'text';
    rightInput.className = 'axis-name-input';
    rightInput.dataset.axis = 'right';
    rightInput.value = axisNames.right || '';
    rightInput.placeholder = 'e.g. Volume';
    nameRowRight.appendChild(rightInput);
    container.appendChild(nameRowRight);

    const spacer = document.createElement('div');
    spacer.className = 'input-group-separator';
    container.appendChild(spacer);

    rawParsedData.datasets.forEach((ds, i) => {
      const val = axisAssignments[i] || 'left';
      const row = document.createElement('div');
      row.className = 'axis-assign-row';

      const label = document.createElement('span');
      label.className = 'axis-assign-label';
      label.textContent = ds.name;
      row.appendChild(label);

      const select = document.createElement('select');
      select.className = 'axis-assign-select';
      select.dataset.dsIndex = i;
      ['left', 'right', 'hidden'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt === 'left' ? 'Left Y' : opt === 'right' ? 'Right Y' : 'Hidden';
        if (val === opt) o.selected = true;
        select.appendChild(o);
      });
      row.appendChild(select);
      container.appendChild(row);
    });

    dom.axisAssignmentList.innerHTML = '';
    dom.axisAssignmentList.appendChild(container);

    dom.axisAssignmentList.querySelectorAll('.axis-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        axisNames[e.target.dataset.axis] = e.target.value;
        debouncedRender();
      });
    });

    dom.axisAssignmentList.querySelectorAll('.axis-assign-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.dsIndex);
        axisAssignments[idx] = e.target.value;
        renderChart();
      });
    });
  }

  if (dom.dualAxisToggle) {
    dom.dualAxisToggle.addEventListener('change', () => {
      dualAxisEnabled = dom.dualAxisToggle.checked;
      renderAxisAssignments();
      renderChart();
    });
  }

  dom.maxRowsInput.addEventListener('change', () => {
    CONFIG.hardRowLimit = parseInt(dom.maxRowsInput.value) || 50000;
  });

  // ── Branding ──

  dom.brandLogoBtn.addEventListener('click', () => dom.brandLogoFile.click());

  dom.brandLogoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      brandLogoUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        brandLogoImg = img;
        dom.brandLogoPreview.innerHTML = `<img src="${brandLogoUrl}" alt="Logo">`;
        renderChart();
      };
      img.src = brandLogoUrl;
    };
    reader.readAsDataURL(file);
  });

  dom.brandLogoClearBtn.addEventListener('click', () => {
    brandLogoUrl = null;
    brandLogoImg = null;
    dom.brandLogoFile.value = '';
    dom.brandLogoPreview.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" opacity="0.1"/><path d="M6 18L10 10L14 14L18 6" stroke="#F7931A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    renderChart();
  });

  [dom.brandName, dom.brandPosition, dom.brandOpacity].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (el === dom.brandOpacity && dom.brandOpacityValue) {
        dom.brandOpacityValue.textContent = dom.brandOpacity.value;
      }
      debouncedRender();
    });
  });

  // ═══════════════════════════════════════════
  //  Zoom Slider
  // ═══════════════════════════════════════════

  dom.zoomMin.addEventListener('input', () => {
    let min = parseFloat(dom.zoomMin.value);
    const max = parseFloat(dom.zoomMax.value);
    if (min >= max - 2) min = max - 2;
    dom.zoomMin.value = min;
    zoomRange = [min, max];
    updateZoomLabels();
    renderChart();
  });

  dom.zoomMax.addEventListener('input', () => {
    const min = parseFloat(dom.zoomMin.value);
    let max = parseFloat(dom.zoomMax.value);
    if (max <= min + 2) max = min + 2;
    dom.zoomMax.value = max;
    zoomRange = [min, max];
    updateZoomLabels();
    renderChart();
  });

  dom.zoomResetBtn.addEventListener('click', () => {
    zoomRange = [0, 100];
    dom.zoomMin.value = 0;
    dom.zoomMax.value = 100;
    updateZoomLabels();
    renderChart();
    showToast('Zoom reset', 'success');
  });

  // ═══════════════════════════════════════════
  //  Timeline Events
  // ═══════════════════════════════════════════

  dom.addTimelineEvent.addEventListener('click', () => {
    timelineEvents.push({ label: '', position: '' });
    renderTimelineEvents();
  });

  dom.parseBulkEventsBtn.addEventListener('click', () => {
    const text = dom.bulkEventsTextarea.value.trim();
    if (!text) return;
    const lines = text.split('\n').filter(l => l.trim());
    const newEvents = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        newEvents.push({ position: parts[0], label: parts.slice(1).join(', ') });
      }
    }
    if (newEvents.length > 0) {
      timelineEvents = [...timelineEvents, ...newEvents];
      renderTimelineEvents();
      renderChart();
      showToast(`Added ${newEvents.length} events`, 'success');
    }
  });

  function renderTimelineEvents() {
    dom.timelineEventsList.innerHTML = '';
    timelineEvents.forEach((evt, i) => {
      const row = document.createElement('div');
      row.className = 'timeline-event-row';

      const dateInput = document.createElement('input');
      dateInput.type = 'text';
      dateInput.placeholder = 'Date (e.g. 2024-03-15)';
      dateInput.value = evt.position;
      dateInput.dataset.field = 'position';
      dateInput.dataset.index = i;
      row.appendChild(dateInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.placeholder = 'Event name';
      labelInput.value = evt.label;
      labelInput.dataset.field = 'label';
      labelInput.dataset.index = i;
      row.appendChild(labelInput);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.dataset.index = i;
      removeBtn.setAttribute('aria-label', 'Remove event');
      removeBtn.textContent = '\u00D7';
      row.appendChild(removeBtn);

      dom.timelineEventsList.appendChild(row);
    });

    dom.timelineEventsList.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        timelineEvents[idx][field] = e.target.value;
        debouncedRender();
      });
    });

    dom.timelineEventsList.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        timelineEvents.splice(idx, 1);
        renderTimelineEvents();
        renderChart();
      });
    });
  }

  // ═══════════════════════════════════════════
  //  Data Preview
  // ═══════════════════════════════════════════

  function updateDataPreview() {
    if (!parsedData) {
      dom.dataPreview.innerHTML = '<p class="placeholder-text">No data loaded yet</p>';
      return;
    }

    const { labels, datasets } = parsedData;
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
          // Show precise value in preview (up to 4 decimal places, strip trailing zeros)
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

  // ═══════════════════════════════════════════
  //  Chart Settings Listeners (debounced)
  // ═══════════════════════════════════════════

  const debouncedRender = debounce(renderChart, CONFIG.debounceMs);

  const settingsInputs = [
    dom.chartTitle, dom.chartSubtitle, dom.chartSource,
    dom.chartCurve, dom.pointSize, dom.lineWidth,
    dom.showLegend, dom.showGrid, dom.showDataLabels,
    dom.fillArea, dom.spanGaps, dom.numberFormat,
    dom.dateFormat, dom.maxTicks, dom.yAxisScale,
    dom.showEventMarkers, dom.eventMarkerColor,
    dom.gridStyle, dom.barBorderRadius,
    dom.legendPosition, dom.tooltipStyle, dom.animationSpeed,
    dom.yAxisMin, dom.yAxisMax, dom.xAxisRotation,
    dom.xAxisType, dom.xAxisLabel, dom.yAxisLabel,
    dom.decimalPlaces, dom.currencyPrefix,
    dom.refLineY, dom.refLineLabel,
    dom.chartBgColor, dom.chartGridColor,
    dom.innovatorXLabel, dom.innovatorYLabel,
    dom.innovatorTiers, dom.innovatorSustainingPace,
    dom.innovatorShowIncumbent, dom.innovatorShowDisruptive,
    dom.innovatorIncumbentName, dom.innovatorDisruptiveName,
    dom.innovatorDisruptionPace,
    dom.innovatorDisruptiveStart, dom.innovatorDisruptivePeak,
    dom.innovatorDisruptiveStart, dom.innovatorDisruptivePeak,
    dom.innovatorMarketTop, dom.innovatorMarketBottom,
    dom.innovatorIncumbentBase, dom.innovatorIncumbentSlope,
    dom.innovatorYMin, dom.innovatorYMax,
    dom.innovatorCurveType, dom.innovatorTimeMode,
    dom.innovatorStartYear, dom.innovatorEndYear,
    dom.innovatorStartMonth, dom.innovatorEndMonth,
  ];

  settingsInputs.forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (el === dom.maxTicks && dom.maxTicksValue) {
        dom.maxTicksValue.textContent = dom.maxTicks.value;
      }
      if (el === dom.barBorderRadius && dom.barBorderRadiusValue) {
        dom.barBorderRadiusValue.textContent = dom.barBorderRadius.value;
      }
      if (el === dom.xAxisRotation && dom.xAxisRotationValue) {
        dom.xAxisRotationValue.textContent = dom.xAxisRotation.value + '\u00B0';
      }
      if (el === dom.chartBgColor) {
        userBgColor = dom.chartBgColor.value;
      }
      if (el === dom.chartGridColor) {
        userGridColor = dom.chartGridColor.value;
      }
      if (el === dom.innovatorTiers && dom.innovatorTiersValue) {
        dom.innovatorTiersValue.textContent = dom.innovatorTiers.value;
      }
      if (el === dom.innovatorSustainingPace && dom.innovatorSustainingPaceValue) {
        dom.innovatorSustainingPaceValue.textContent = dom.innovatorSustainingPace.value;
      }
      if (el === dom.innovatorDisruptionPace && dom.innovatorDisruptionPaceValue) {
        dom.innovatorDisruptionPaceValue.textContent = dom.innovatorDisruptionPace.value;
      }
      if (el === dom.innovatorDisruptiveStart && dom.innovatorDisruptiveStartValue) {
        dom.innovatorDisruptiveStartValue.textContent = dom.innovatorDisruptiveStart.value;
      }
      if (el === dom.innovatorDisruptivePeak && dom.innovatorDisruptivePeakValue) {
        dom.innovatorDisruptivePeakValue.textContent = dom.innovatorDisruptivePeak.value;
      }
      if (el === dom.innovatorMarketTop && dom.innovatorMarketTopValue) {
        dom.innovatorMarketTopValue.textContent = dom.innovatorMarketTop.value;
      }
      if (el === dom.innovatorMarketBottom && dom.innovatorMarketBottomValue) {
        dom.innovatorMarketBottomValue.textContent = dom.innovatorMarketBottom.value;
      }
      if (el === dom.innovatorIncumbentBase && dom.innovatorIncumbentBaseValue) {
        dom.innovatorIncumbentBaseValue.textContent = dom.innovatorIncumbentBase.value;
      }
      if (el === dom.innovatorIncumbentSlope && dom.innovatorIncumbentSlopeValue) {
        dom.innovatorIncumbentSlopeValue.textContent = dom.innovatorIncumbentSlope.value;
      }
      debouncedRender();
    });
  });

  // ═══════════════════════════════════════════
  //  Chart Rendering
  // ═══════════════════════════════════════════

  function getThemeColors() {
    return PALETTE[currentTheme];
  }

  function getMultiColors() {
    return [...userColors, ...EXTRA_COLORS];
  }

  function buildYTickCallback() {
    const fmt = dom.numberFormat.value;
    const decimals = dom.decimalPlaces ? dom.decimalPlaces.value : 'auto';
    const currency = dom.currencyPrefix ? dom.currencyPrefix.value || '$' : '$';
    return (value) => formatNumber(value, fmt);
  }

  function buildDataLabelFormatter() {
    return (value) => formatNumber(value);
  }

  function buildTooltipCallback() {
    return (ctx) => {
      let label = ctx.dataset.label || '';
      if (currentChartType === 'pie' || currentChartType === 'donut') {
        label = ctx.chart.data.labels[ctx.dataIndex] || '';
      }
      const val = ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed;
      return `${label ? label + ': ' : ''}${formatNumber(typeof val === 'object' ? ctx.raw : val)}`;
    };
  }

  function getBaseChartOptions() {
    const c = getThemeColors();
    const showGrid = dom.showGrid.checked;
    const showLegend = dom.showLegend.checked;
    const showDataLabels = dom.showDataLabels.checked;
    const maxTicks = safeInt(dom.maxTicks.value, 12);
    const yScale = dom.yAxisScale.value;
    const animDuration = safeInt(dom.animationSpeed?.value, 600);
    const legendPos = dom.legendPosition?.value || 'top';
    const tooltipStyle = dom.tooltipStyle?.value || 'default';
    const gridStyleVal = dom.gridStyle?.value || 'solid';
    const yAxisMinVal = dom.yAxisMin?.value !== '' ? safeFloat(dom.yAxisMin.value, undefined) : undefined;
    const yAxisMaxVal = dom.yAxisMax?.value !== '' ? safeFloat(dom.yAxisMax.value, undefined) : undefined;
    const xRotation = safeInt(dom.xAxisRotation?.value, 45);
    const xAxisTypeVal = dom.xAxisType?.value || 'auto';
    const xAxisTitle = dom.xAxisLabel?.value || '';
    const yAxisTitle = dom.yAxisLabel?.value || '';

    const leftAxisTitle = dualAxisEnabled ? (axisNames.left || yAxisTitle) : yAxisTitle;
    const rightAxisTitle = dualAxisEnabled ? (axisNames.right || '') : '';

    if (yScale === 'logarithmic' && parsedData) {
      const hasNonPositive = parsedData.datasets.some(ds =>
        ds.values.some(v => v != null && v <= 0)
      );
      if (hasNonPositive) {
        showToast('Logarithmic scale requires all values > 0. Some values will be filtered.', 'warning');
      }
    }

    let gridDash = [];
    if (gridStyleVal === 'dashed') gridDash = [6, 4];
    else if (gridStyleVal === 'dotted') gridDash = [2, 4];
    const gridVisible = showGrid && gridStyleVal !== 'none';

    const chartBg = userBgColor || c.bg;
    const chartGrid = userGridColor || c.grid;

    const tickCallback = buildYTickCallback();
    const tooltipLabelCallback = buildTooltipCallback();
    const dlFormatter = buildDataLabelFormatter();

    let tooltipOpts = {
      backgroundColor: currentTheme === 'dark' ? '#1e293b' : '#fff',
      titleColor: c.text,
      bodyColor: c.textSecondary,
      borderColor: c.border,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      titleFont: { size: 12, weight: '600', family: "'Inter', sans-serif" },
      bodyFont: { size: 11, family: "'Inter', sans-serif" },
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 4,
      callbacks: {
        label: tooltipLabelCallback
      }
    };

    if (tooltipStyle === 'compact') {
      tooltipOpts.padding = 6;
      tooltipOpts.cornerRadius = 4;
      tooltipOpts.titleFont.size = 10;
      tooltipOpts.bodyFont.size = 10;
      tooltipOpts.boxWidth = 6;
      tooltipOpts.boxHeight = 6;
    } else if (tooltipStyle === 'detailed') {
      tooltipOpts.padding = 14;
      tooltipOpts.cornerRadius = 10;
      tooltipOpts.titleFont.size = 13;
      tooltipOpts.bodyFont.size = 12;
      tooltipOpts.boxWidth = 10;
      tooltipOpts.boxHeight = 10;
      tooltipOpts.boxPadding = 6;
    }

    const annotations = {};

    const refY = dom.refLineY?.value !== '' ? safeFloat(dom.refLineY.value, null) : null;
    if (refY != null) {
      annotations.refLine = {
        type: 'line',
        yMin: refY,
        yMax: refY,
        borderColor: hexToRgba(c.hero, 0.6),
        borderWidth: 1.5,
        borderDash: [4, 4],
        label: {
          display: !!dom.refLineLabel?.value,
          content: dom.refLineLabel?.value || '',
          position: 'end',
          backgroundColor: hexToRgba(c.hero, 0.15),
          color: c.hero,
          font: { size: 10, weight: '600', family: "'Inter', sans-serif" },
          padding: { x: 6, y: 3 },
          borderRadius: 4
        }
      };
    }

    const resolvedXType = (() => {
      if (xAxisTypeVal === 'auto') {
        if (parsedData && parsedData.isTimeSeries) return 'time';
        return 'category';
      }
      return xAxisTypeVal;
    })();

    const xAxisTitleOpts = {
      display: !!xAxisTitle,
      text: xAxisTitle,
      color: c.textSecondary,
      font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
      padding: { top: 6 }
    };

    const yAxisTitleOpts = {
      display: !!leftAxisTitle,
      text: leftAxisTitle,
      color: c.textSecondary,
      font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
      padding: { bottom: 4 }
    };

    const xScaleBase = {
      grid: {
        display: gridVisible,
        color: chartGrid,
        lineWidth: 0.5,
        borderDash: gridDash
      },
      ticks: {
        color: c.textSecondary,
        font: { size: 10, family: "'Inter', sans-serif" },
        padding: 6,
        maxTicksLimit: maxTicks,
        maxRotation: xRotation,
        autoSkip: true
      },
      title: xAxisTitleOpts,
      border: { display: false }
    };

    if (resolvedXType === 'time') {
      const dateFmt = dom.dateFormat?.value || 'auto';
      xScaleBase.type = 'time';
      xScaleBase.time = {
        unit: (() => {
          if (dateFmt !== 'auto') return undefined;
          if (!parsedData || !parsedData.dateRange) return undefined;
          const days = (parsedData.dateRange.max - parsedData.dateRange.min) / 86400000;
          if (days > 365 * 3) return 'year';
          if (days > 30) return 'month';
          if (days > 7) return 'day';
          return 'day';
        })(),
        displayFormats: {
          day: dateFmt === 'auto' ? 'dd MMM' : undefined,
          month: dateFmt === 'auto' ? 'MMM yyyy' : (dateFmt === 'MMM yy' ? 'MMM yy' : 'MMM yyyy'),
          year: 'yyyy'
        }
      };
      xScaleBase.adapters = { date: {} };
    } else if (resolvedXType === 'linear') {
      xScaleBase.type = 'linear';
    }

    const yScaleBase = {
      type: yScale,
      position: 'left',
      min: yAxisMinVal,
      max: yAxisMaxVal,
      title: yAxisTitleOpts,
      grid: {
        display: gridVisible,
        color: chartGrid,
        lineWidth: 0.5,
        borderDash: gridDash
      },
      ticks: {
        color: c.textSecondary,
        font: { size: 10, family: "'Inter', sans-serif" },
        padding: 8,
        callback: tickCallback
      },
      border: { display: false }
    };

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: animDuration,
        easing: 'easeOutQuart'
      },
      layout: {
        padding: {
          top: dom.chartTitle.value ? 8 : 4,
          bottom: dom.chartSource.value ? 24 : 8,
          left: 4,
          right: 4
        }
      },
      plugins: {
        title: {
          display: !!dom.chartTitle.value,
          text: dom.chartTitle.value,
          color: c.text,
          font: { size: 16, weight: '600', family: "'Inter', sans-serif" },
          padding: { bottom: dom.chartSubtitle.value ? 2 : 12 }
        },
        subtitle: {
          display: !!dom.chartSubtitle.value,
          text: dom.chartSubtitle.value,
          color: c.textSecondary,
          font: { size: 11, weight: '400', family: "'Inter', sans-serif" },
          padding: { bottom: 16 }
        },
        legend: {
          display: showLegend,
          position: legendPos,
          align: 'end',
          labels: {
            color: c.textSecondary,
            font: { size: 11, family: "'Inter', sans-serif" },
            boxWidth: 8,
            boxHeight: 8,
            borderRadius: 4,
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: tooltipOpts,
        datalabels: {
          display: showDataLabels,
          color: c.text,
          font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
          anchor: 'end',
          align: 'top',
          offset: 4,
          formatter: dlFormatter
        },
        annotation: { annotations }
      },
      scales: {
        x: xScaleBase,
        y: yScaleBase,
        y1: {
          type: yScale,
          position: 'right',
          min: yAxisMinVal,
          max: yAxisMaxVal,
          title: {
            display: !!rightAxisTitle,
            text: rightAxisTitle,
            color: c.textSecondary,
            font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
            padding: { bottom: 4 }
          },
          grid: { display: false },
          ticks: {
            color: c.textSecondary,
            font: { size: 10, family: "'Inter', sans-serif" },
            padding: 8,
            callback: tickCallback
          },
          border: { display: false }
        }
      }
    };
  }

  // ── Source Footer Plugin ──
  const sourceFooterPlugin = {
    id: 'sourceFooter',
    afterDraw(chart) {
      const source = dom.chartSource.value;
      if (!source) return;
      const ctx = chart.ctx;
      const c = getThemeColors();
      ctx.save();
      ctx.font = `400 9px 'Inter', sans-serif`;
      ctx.fillStyle = c.textMuted;
      ctx.textAlign = 'left';
      ctx.fillText(`Source: ${source}`, chart.chartArea.left, chart.height - 6);
      ctx.restore();
    }
  };

  // ── BG Plugin ──
  const bgPlugin = {
    id: 'customBg',
    beforeDraw(chart) {
      const ctx = chart.ctx;
      const c = getThemeColors();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = userBgColor || c.bg;
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  // ── Brand Plugin (uses cached Image) ──
  const brandPlugin = {
    id: 'brandWatermark',
    afterDraw(chart) {
      const brandNameVal = dom.brandName?.value || '';
      const opacity = safeFloat(dom.brandOpacity?.value, 0.7);
      const position = dom.brandPosition?.value || 'bottom-right';
      if (!brandNameVal && !brandLogoImg) return;

      const ctx = chart.ctx;
      ctx.save();
      ctx.globalAlpha = opacity;

      const area = chart.chartArea;
      const margin = 12;
      let x, y, textAlign;

      switch (position) {
        case 'bottom-left':
          x = area.left + margin;
          y = area.bottom - margin;
          textAlign = 'left';
          break;
        case 'top-right':
          x = area.right - margin;
          y = area.top + margin + 4;
          textAlign = 'right';
          break;
        case 'top-left':
          x = area.left + margin;
          y = area.top + margin + 4;
          textAlign = 'left';
          break;
        default:
          x = area.right - margin;
          y = area.bottom - margin;
          textAlign = 'right';
      }

      let logoH = 0;

      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth) {
        const drawH = 16;
        const drawW = (brandLogoImg.naturalWidth / brandLogoImg.naturalHeight) * drawH;
        const imgX = textAlign === 'right' ? x - drawW : x;
        const imgY = brandNameVal ? y - drawH - 2 : y - drawH;
        ctx.drawImage(brandLogoImg, imgX, imgY, drawW, drawH);
        logoH = drawH + 2;
      }

      if (brandNameVal) {
        const c = getThemeColors();
        ctx.font = `600 10px 'Inter', sans-serif`;
        ctx.fillStyle = c.textSecondary;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'bottom';
        ctx.fillText(brandNameVal, x, y - logoH);
      }

      ctx.restore();
    }
  };

  function isTimeXAxis() {
    const v = dom.xAxisType?.value || 'auto';
    if (v === 'time') return true;
    if (v === 'auto' && parsedData && parsedData.isTimeSeries) return true;
    return false;
  }

  function renderChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    if (currentChartType === 'innovator') {
      renderInnovatorsDilemmaChart();
      return;
    }

    if (!parsedData) return;

    const displayData = applyZoom(parsedData);
    if (!displayData || !displayData.labels || displayData.labels.length === 0 || !displayData.datasets || displayData.datasets.length === 0) return;

    const c = getThemeColors();
    const colors = getMultiColors();
    const { labels, datasets } = displayData;
    const tension = safeFloat(dom.chartCurve.value, 0.35);

    const useTimeAxis = isTimeXAxis();
    let timeLabels = labels;

    if (useTimeAxis && displayData.dateObjects) {
      timeLabels = displayData.dateObjects.map(d => d ? d.toISOString() : null);
    }

    let config;

    switch (currentChartType) {
      case 'line':
        config = buildLineChart(timeLabels, datasets, c, colors, tension, useTimeAxis, displayData);
        break;
      case 'timeline':
        config = buildTimelineChart(timeLabels, datasets, c, colors, tension, displayData, useTimeAxis);
        break;
      case 'bar':
        config = buildBarChart(labels, datasets, c, colors, 'y');
        break;
      case 'vbar':
        config = buildBarChart(labels, datasets, c, colors, 'x');
        break;
      case 'pie':
        config = buildPieChart(labels, datasets, c, colors);
        break;
      case 'donut':
        config = buildDonutChart(labels, datasets, c, colors);
        break;
      case 'area':
        config = buildAreaChart(timeLabels, datasets, c, colors, tension, useTimeAxis, displayData);
        break;
      case 'radar':
        config = buildRadarChart(labels, datasets, c, colors);
        break;
      case 'scatter':
        config = buildScatterChart(labels, datasets, c, colors);
        break;
      case 'waterfall':
        config = buildWaterfallChart(labels, datasets, c, colors);
        break;
      default:
        config = buildLineChart(timeLabels, datasets, c, colors, tension, useTimeAxis, displayData);
    }

    config.plugins = [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels];

    chartInstance = new Chart(dom.chartCanvas, config);
  }

  // ═══════════════════════════════════════════
  //  Chart Builders
  // ═══════════════════════════════════════════

  function getYAxisID(i) {
    if (!dualAxisEnabled) return undefined;
    const assign = axisAssignments[i] || 'left';
    if (assign === 'hidden') return undefined;
    return assign === 'right' ? 'y1' : 'y';
  }

  function getLineDatasetDefaults(ds, i, c, colors, tension, useTimeAxis, displayData) {
    const pointRadius = safeInt(dom.pointSize.value, 3);
    const lineWidth = safeFloat(dom.lineWidth.value, 2.5);
    const fill = dom.fillArea.checked;
    const gaps = dom.spanGaps.checked;
    const yAxisID = getYAxisID(i);
    const hidden = dualAxisEnabled && axisAssignments[i] === 'hidden';

    let data = ds.values;
    if (useTimeAxis && displayData?.dateObjects) {
      data = ds.values.map((v, idx) => {
        const d = displayData.dateObjects[idx];
        return d ? { x: d.getTime(), y: v } : null;
      });
    }

    return {
      label: ds.name,
      data,
      borderColor: colors[i % colors.length],
      backgroundColor: hexToRgba(colors[i % colors.length], fill ? 0.08 : 0),
      borderWidth: lineWidth,
      pointRadius,
      pointHoverRadius: pointRadius + 3,
      pointBackgroundColor: colors[i % colors.length],
      pointBorderColor: c.bg,
      pointBorderWidth: 2,
      tension,
      fill,
      spanGaps: gaps,
      yAxisID,
      hidden
    };
  }

  function buildLineChart(labels, datasets, c, colors, tension, useTimeAxis, displayData) {
    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => getLineDatasetDefaults(ds, i, c, colors, tension, useTimeAxis, displayData))
      },
      options: getBaseChartOptions()
    };
  }

  function buildTimelineChart(labels, datasets, c, colors, tension, displayData, useTimeAxis) {
    const opts = getBaseChartOptions();
    const eventColor = dom.eventMarkerColor?.value || userColors[0] || c.hero;
    const showMarkers = dom.showEventMarkers?.checked ?? true;

    const annotations = { ...opts.plugins.annotation?.annotations };

    if (showMarkers) {
      timelineEvents.forEach((evt, i) => {
        if (!evt.position) return;

        let labelIndex = labels.findIndex(l =>
          String(l).toLowerCase().trim() === evt.position.toLowerCase().trim()
        );

        if (labelIndex === -1 && displayData?.dateObjects) {
          const evtDate = tryParseDate(evt.position);
          if (evtDate) {
            let closest = -1;
            let closestDiff = Infinity;
            displayData.dateObjects.forEach((d, idx) => {
              if (!d) return;
              const diff = Math.abs(d.getTime() - evtDate.getTime());
              if (diff < closestDiff) {
                closestDiff = diff;
                closest = idx;
              }
            });
            if (closest >= 0 && closestDiff < CONFIG.eventProximityMs) {
              labelIndex = closest;
            }
          }
        }

        if (labelIndex === -1) return;

        const yAdj = 10 + (i % 4) * 20;
        const wrappedLabel = wrapText(evt.label, 18);

        annotations[`line_${i}`] = {
          type: 'line',
          xMin: labelIndex,
          xMax: labelIndex,
          borderColor: hexToRgba(eventColor, 0.7),
          borderWidth: 2.5,
          borderDash: [8, 4],
          label: {
            display: true,
            content: wrappedLabel,
            position: 'end',
            backgroundColor: hexToRgba(eventColor, 0.18),
            color: eventColor,
            font: { size: 10, weight: '600', family: "'Inter', sans-serif" },
            padding: { x: 8, y: 4 },
            borderRadius: 6,
            yAdjust: yAdj
          }
        };

        if (datasets[0]?.values[labelIndex] != null) {
          annotations[`point_${i}`] = {
            type: 'point',
            xValue: labelIndex,
            yValue: datasets[0].values[labelIndex],
            backgroundColor: eventColor,
            borderColor: userBgColor || c.bg,
            borderWidth: 3,
            radius: 7
          };
        }
      });
    }

    opts.plugins.annotation = { annotations };

    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          ...getLineDatasetDefaults(ds, i, c, colors, tension, useTimeAxis, displayData),
          fill: true,
          backgroundColor: hexToRgba(colors[i % colors.length], 0.06),
        }))
      },
      options: opts
    };
  }

  function buildBarChart(labels, datasets, c, colors, indexAxis) {
    const opts = getBaseChartOptions();
    const borderRadius = safeInt(dom.barBorderRadius?.value, 4);
    opts.indexAxis = indexAxis;
    if (indexAxis === 'y') {
      // Swap scale configs: x-axis becomes value axis, y-axis becomes category axis
      const valueConfig = { ...opts.scales.y };
      const catConfig = { ...opts.scales.x };
      opts.scales.x = valueConfig;
      opts.scales.x.grid.display = dom.showGrid.checked;
      opts.scales.y = catConfig;
      opts.scales.y.grid.display = false;
      delete opts.scales.y.type;
      delete opts.scales.y.time;
      delete opts.scales.y.adapters;
      opts.scales.y.min = undefined;
      opts.scales.y.max = undefined;
      if (opts.scales.y.ticks) delete opts.scales.y.ticks.callback;
      delete opts.scales.y1;
    }
    opts.plugins.datalabels.anchor = 'end';
    opts.plugins.datalabels.align = indexAxis === 'y' ? 'right' : 'top';

    const maxBars = CONFIG.maxBars;
    let displayLabels = labels;
    let displayDatasets = datasets;
    if (labels.length > maxBars) {
      displayLabels = labels.slice(0, maxBars);
      displayDatasets = datasets.map(ds => ({
        ...ds,
        values: ds.values.slice(0, maxBars)
      }));
    }

    return {
      type: 'bar',
      data: {
        labels: displayLabels,
        datasets: displayDatasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          backgroundColor: displayDatasets.length === 1
            ? ds.values.map((_, j) => hexToRgba(colors[j % colors.length], 0.85))
            : hexToRgba(colors[i % colors.length], 0.85),
          borderColor: displayDatasets.length === 1
            ? ds.values.map((_, j) => colors[j % colors.length])
            : colors[i % colors.length],
          borderWidth: 1,
          borderRadius,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.85
        }))
      },
      options: opts
    };
  }

  function buildPieChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    delete opts.scales;
    opts.aspectRatio = 1.6;
    opts.plugins.datalabels.color = '#fff';
    opts.plugins.datalabels.font = { size: 11, weight: '600', family: "'Inter', sans-serif" };
    opts.plugins.datalabels.anchor = 'center';
    opts.plugins.datalabels.align = 'center';
    opts.plugins.datalabels.formatter = (value, ctx) => {
      const total = ctx.dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
      if (total === 0) return '';
      const pct = ((value / total) * 100).toFixed(0);
      return pct > 5 ? `${pct}%` : '';
    };

    const maxSlices = CONFIG.maxPieSlices;
    let displayLabels = labels;
    let displayValues = datasets[0].values;
    if (labels.length > maxSlices) {
      const indexed = labels.map((l, i) => ({ l, v: datasets[0].values[i] || 0 }));
      indexed.sort((a, b) => b.v - a.v);
      const top = indexed.slice(0, maxSlices - 1);
      const otherVal = indexed.slice(maxSlices - 1).reduce((s, x) => s + x.v, 0);
      displayLabels = [...top.map(x => x.l), 'Other'];
      displayValues = [...top.map(x => x.v), otherVal];
    }

    return {
      type: 'pie',
      data: {
        labels: displayLabels,
        datasets: [{
          data: displayValues,
          backgroundColor: displayLabels.map((_, i) => hexToRgba(colors[i % colors.length], 0.85)),
          borderColor: c.bg,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: opts
    };
  }

  function buildDonutChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    delete opts.scales;
    opts.aspectRatio = 1.6;
    opts.cutout = '62%';
    opts.plugins.datalabels.color = c.text;
    opts.plugins.datalabels.font = { size: 10, weight: '600', family: "'Inter', sans-serif" };
    opts.plugins.datalabels.anchor = 'end';
    opts.plugins.datalabels.align = 'end';
    opts.plugins.datalabels.offset = 6;
    opts.plugins.datalabels.formatter = (value, ctx) => {
      const total = ctx.dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
      if (total === 0) return '';
      const pct = ((value / total) * 100).toFixed(0);
      return pct > 4 ? `${ctx.chart.data.labels[ctx.dataIndex]}\n${pct}%` : '';
    };

    const maxSlices = CONFIG.maxDonutSlices;
    let displayLabels = labels;
    let displayValues = datasets[0].values;
    if (labels.length > maxSlices) {
      const indexed = labels.map((l, i) => ({ l, v: datasets[0].values[i] || 0 }));
      indexed.sort((a, b) => b.v - a.v);
      const top = indexed.slice(0, maxSlices - 1);
      const otherVal = indexed.slice(maxSlices - 1).reduce((s, x) => s + x.v, 0);
      displayLabels = [...top.map(x => x.l), 'Other'];
      displayValues = [...top.map(x => x.v), otherVal];
    }

    return {
      type: 'doughnut',
      data: {
        labels: displayLabels,
        datasets: [{
          data: displayValues,
          backgroundColor: displayLabels.map((_, i) => hexToRgba(colors[i % colors.length], 0.85)),
          borderColor: c.bg,
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: opts
    };
  }

  function buildAreaChart(labels, datasets, c, colors, tension, useTimeAxis, displayData) {
    const opts = getBaseChartOptions();
    const gaps = dom.spanGaps.checked;

    const stacked = !dualAxisEnabled;
    opts.scales.y.stacked = stacked;
    opts.scales.x.stacked = stacked;

    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => {
          const yAxisID = getYAxisID(i);
          const hidden = dualAxisEnabled && axisAssignments[i] === 'hidden';

          let data = ds.values;
          if (useTimeAxis && displayData?.dateObjects) {
            data = ds.values.map((v, idx) => {
              const d = displayData.dateObjects[idx];
              return d ? { x: d.getTime(), y: v } : null;
            });
          }

          return {
            label: ds.name,
            data,
            borderColor: colors[i % colors.length],
            backgroundColor: hexToRgba(colors[i % colors.length], 0.2),
            borderWidth: 2,
            pointRadius: Math.min(safeInt(dom.pointSize.value, 2), ds.values.length > 200 ? 0 : 3),
            pointHoverRadius: 5,
            pointBackgroundColor: colors[i % colors.length],
            pointBorderColor: c.bg,
            pointBorderWidth: 2,
            tension,
            fill: stacked,
            spanGaps: gaps,
            yAxisID,
            hidden
          };
        })
      },
      options: opts
    };
  }

  function buildRadarChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    delete opts.scales;
    opts.aspectRatio = 1.6;
    opts.scales = {
      r: {
        angleLines: { color: c.grid, lineWidth: 0.5 },
        grid: { color: c.grid, lineWidth: 0.5 },
        pointLabels: {
          color: c.textSecondary,
          font: { size: 10, weight: '500', family: "'Inter', sans-serif" }
        },
        ticks: { display: false, backdropColor: 'transparent' },
        suggestedMin: 0,
        suggestedMax: 100
      }
    };
    opts.plugins.datalabels.display = false;

    return {
      type: 'radar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          borderColor: colors[i % colors.length],
          backgroundColor: hexToRgba(colors[i % colors.length], 0.15),
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: c.bg,
          pointBorderWidth: 2
        }))
      },
      options: opts
    };
  }

  function buildScatterChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();

    opts.plugins.datalabels.display = false;

    const scatterDatasets = datasets.map((ds, dsIdx) => {
      const points = labels.map((label, i) => ({
        x: typeof label === 'number' ? label : parseFloat(label) || i,
        y: ds.values[i]
      })).filter(p => p.y != null);

      const color = colors[dsIdx % colors.length];
      return {
        label: ds.name || `Series ${dsIdx + 1}`,
        data: points,
        backgroundColor: hexToRgba(color, 0.7),
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: Math.min(safeInt(dom.pointSize.value, 5), points.length > 500 ? 2 : 5),
        pointHoverRadius: 8,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: c.bg,
      };
    });

    return {
      type: 'scatter',
      data: { datasets: scatterDatasets },
      options: opts
    };
  }

  function buildWaterfallChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    const values = datasets[0].values;
    const borderRadius = safeInt(dom.barBorderRadius?.value, 4);

    let cumulative = 0;
    const bases = [];
    const positives = [];
    const negatives = [];
    const isTotal = [];

    values.forEach((val, i) => {
      if (val == null) val = 0;
      const isLast = i === values.length - 1;
      const isTotalBar = isLast;

      if (isTotalBar) {
        if (i === 0) {
          bases.push(0);
          positives.push(val);
          negatives.push(0);
          cumulative = val;
        } else {
          bases.push(0);
          positives.push(cumulative);
          negatives.push(0);
        }
        isTotal.push(true);
      } else if (val >= 0) {
        bases.push(cumulative);
        positives.push(val);
        negatives.push(0);
        cumulative += val;
        isTotal.push(false);
      } else {
        bases.push(cumulative + val);
        positives.push(0);
        negatives.push(Math.abs(val));
        cumulative += val;
        isTotal.push(false);
      }
    });

    opts.scales.x.stacked = true;
    opts.scales.y.stacked = true;
    opts.plugins.datalabels.display = dom.showDataLabels.checked;
    opts.plugins.datalabels.formatter = (value, ctx) => {
      if (ctx.datasetIndex === 0) return '';
      return value ? formatNumber(value) : '';
    };

    const barColorsBg = values.map((v, i) => {
      if (isTotal[i]) return hexToRgba(userColors[0], 0.85);
      return (v || 0) >= 0 ? hexToRgba(SEMANTIC.up, 0.85) : hexToRgba(SEMANTIC.down, 0.85);
    });
    const barColorsBorder = values.map((v, i) => {
      if (isTotal[i]) return userColors[0];
      return (v || 0) >= 0 ? SEMANTIC.up : SEMANTIC.down;
    });

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Base',
            data: bases,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Increase',
            data: positives,
            backgroundColor: barColorsBg,
            borderColor: barColorsBorder,
            borderWidth: 1,
            borderRadius: { topLeft: Math.min(borderRadius, 6), topRight: Math.min(borderRadius, 6) },
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Decrease',
            data: negatives,
            backgroundColor: barColorsBg,
            borderColor: barColorsBorder,
            borderWidth: 1,
            borderRadius: { topLeft: Math.min(borderRadius, 6), topRight: Math.min(borderRadius, 6) },
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        ...opts,
        plugins: {
          ...opts.plugins,
          legend: { display: false }
        }
      }
    };
  }

  // ═══════════════════════════════════════════
  //  Innovator's Dilemma Chart
  // ═══════════════════════════════════════════

  function renderInnovatorsDilemmaChart() {
    const c = getThemeColors();
    const colors = getMultiColors();

    const tiers = safeInt(dom.innovatorTiers?.value, 3);
    const sustainingPace = safeFloat(dom.innovatorSustainingPace?.value, 1.2);
    const showIncumbent = dom.innovatorShowIncumbent?.checked ?? true;
    const showDisruptive = dom.innovatorShowDisruptive?.checked ?? true;
    const incumbentName = dom.innovatorIncumbentName?.value?.trim() || 'Incumbent Technology';
    const disruptiveName = dom.innovatorDisruptiveName?.value?.trim() || 'Disruptive Technology';
    const disruptionPace = safeFloat(dom.innovatorDisruptionPace?.value, 2.0);
    const curveType = dom.innovatorCurveType?.value || 'exponential';
    const timeMode = dom.innovatorTimeMode?.value || 'abstract';
    const xLabel = dom.innovatorXLabel?.value || 'Time';
    const yLabel = dom.innovatorYLabel?.value || 'Performance / Quality';

    const disruptiveStart = safeFloat(dom.innovatorDisruptiveStart?.value, 3);
    const disruptivePeak = safeFloat(dom.innovatorDisruptivePeak?.value, 90);
    const incumbentBase = safeFloat(dom.innovatorIncumbentBase?.value, 75);
    const incumbentSlope = safeFloat(dom.innovatorIncumbentSlope?.value, 11);
    const marketTop = safeFloat(dom.innovatorMarketTop?.value, 70);
    const marketBottom = safeFloat(dom.innovatorMarketBottom?.value, 20);

    const yAxisMinVal = dom.innovatorYMin?.value !== '' ? safeFloat(dom.innovatorYMin.value, 0) : 0;
    const yAxisMaxVal = dom.innovatorYMax?.value > 0 ? safeFloat(dom.innovatorYMax.value, undefined) : undefined;

    const disruptiveRange = Math.max(disruptivePeak - disruptiveStart, 1);
    const slopePerUnit = sustainingPace * 0.8;

    function disruptiveValue(xNorm) {
      switch (curveType) {
        case 'logistic':
          return disruptiveStart + disruptiveRange / (1 + Math.exp(-disruptionPace * 6 * (xNorm - 0.5)));
        case 'linear':
          return disruptiveStart + disruptiveRange * xNorm;
        case 'power':
          return disruptiveStart + disruptiveRange * Math.pow(Math.max(xNorm, 0.001), 3 / Math.max(disruptionPace, 0.1));
        case 'exponential':
        default:
          return disruptiveStart + disruptiveRange * (1 - Math.exp(-disruptionPace * 1.5 * xNorm));
      }
    }

    let labels;
    let isDateAxis = false;

    if (timeMode === 'years') {
      const startY = safeInt(dom.innovatorStartYear?.value, 1990);
      const endY = safeInt(dom.innovatorEndYear?.value, 2020);
      const clampedEnd = Math.max(startY + 1, endY);
      labels = [];
      for (let y = startY; y <= clampedEnd; y++) labels.push(String(y));
      isDateAxis = true;
    } else if (timeMode === 'months') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const startStr = dom.innovatorStartMonth?.value || 'Jan 2020';
      const endStr = dom.innovatorEndMonth?.value || 'Dec 2020';
      const startDate = tryParseDate(startStr) || new Date(2020, 0, 1);
      const endDate = tryParseDate(endStr) || new Date(2020, 11, 31);
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      labels = [];
      while (cur <= end) {
        labels.push(`${months[cur.getMonth()]} ${cur.getFullYear()}`);
        cur.setMonth(cur.getMonth() + 1);
      }
      if (labels.length < 2) labels = ['Jan 2020', 'Dec 2020'];
      isDateAxis = true;
    } else {
      const numPoints = 80;
      const xMax = 10;
      labels = Array.from({ length: numPoints + 1 }, (_, i) =>
        parseFloat(((i / numPoints) * xMax).toFixed(2))
      );
    }

    const n = labels.length;
    const normX = (i) => i / Math.max(n - 1, 1);

    currentInnovatorLabels = labels;
    if (currentChartType === 'innovator') setTimeout(updateZoomLabels, 0);

    const startRatio = zoomRange[0] / 100;
    const endRatio = zoomRange[1] / 100;
    const startIndex = Math.floor(startRatio * labels.length);
    const endIndex = Math.ceil(endRatio * labels.length) || 1;
    const displayLabels = labels.slice(startIndex, endIndex);

    const datasets = [];
    const tierSpacing = tiers > 1 ? (marketTop - marketBottom) / (tiers - 1) : 0;

    if (showDisruptive) {
      const data = labels.map((_, i) => disruptiveValue(normX(i))).slice(startIndex, endIndex);
      datasets.push({
        label: disruptiveName,
        data,
        borderColor: colors[0] || c.hero,
        backgroundColor: hexToRgba(colors[0] || c.hero, 0.06),
        borderWidth: 3,
        pointRadius: 0,
        tension: curveType === 'linear' ? 0 : 0.35,
        fill: true,
        order: 0,
      });
    }

    if (showIncumbent) {
      const data = labels.map((_, i) => incumbentBase + normX(i) * incumbentSlope).slice(startIndex, endIndex);
      datasets.push({
        label: incumbentName,
        data,
        borderColor: colors[1] || '#60A5FA',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [10, 6],
        pointRadius: 0,
        tension: 0,
        fill: false,
        order: 1,
      });
    }

    const tierAnnotations = {};

    for (let t = 0; t < tiers; t++) {
      const baseY = tiers === 1
        ? (marketTop + marketBottom) / 2
        : marketTop - t * tierSpacing;
      const data = labels.map((_, i) => baseY + normX(i) * 10 * slopePerUnit).slice(startIndex, endIndex);

      const tierName = (innovatorTierCustomNames[t] && innovatorTierCustomNames[t].trim())
        ? innovatorTierCustomNames[t].trim()
        : getInnovatorTierDefaultName(t, tiers);

      datasets.push({
        label: tierName,
        data,
        borderColor: hexToRgba(c.textSecondary, 0.22 + t * 0.04),
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0,
        fill: false,
        order: 2 + t,
      });

      const labelIdx = Math.max(0, Math.floor(displayLabels.length * 0.82));
      if (labelIdx < displayLabels.length && data.length > labelIdx) {
        tierAnnotations[`tierLabel_${t}`] = {
          type: 'label',
          xValue: displayLabels[labelIdx],
          yValue: data[labelIdx],
          content: [tierName],
          color: hexToRgba(c.textSecondary, 0.65 + t * 0.05),
          font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
          backgroundColor: hexToRgba(c.bg, 0.75),
          padding: { top: 2, bottom: 2, left: 4, right: 4 },
          xAdjust: 0,
          yAdjust: -12,
          callout: { display: false },
        };
      }
    }

    const showMarkers = dom.showEventMarkers?.checked ?? true;
    const eventColor = dom.eventMarkerColor?.value || userColors[0] || c.hero;

    if (showMarkers) {
      timelineEvents.forEach((evt, i) => {
        if (!evt.position) return;

        let labelIndex = -1;

        for (let li = 0; li < displayLabels.length; li++) {
          const lbl = String(displayLabels[li]).toLowerCase().trim();
          const pos = evt.position.toLowerCase().trim();
          if (lbl === pos) { labelIndex = li; break; }
          if (isDateAxis) {
            const lblDate = tryParseDate(String(displayLabels[li]));
            const posDate = tryParseDate(evt.position);
            if (lblDate && posDate && lblDate.getTime() === posDate.getTime()) {
              labelIndex = li; break;
            }
          }
        }

        if (labelIndex === -1 && isDateAxis) {
          const evtDate = tryParseDate(evt.position);
          if (evtDate) {
            let closest = -1;
            let closestDiff = Infinity;
            displayLabels.forEach((lbl, idx) => {
              const d = tryParseDate(String(lbl));
              if (!d) return;
              const diff = Math.abs(d.getTime() - evtDate.getTime());
              if (diff < closestDiff) { closestDiff = diff; closest = idx; }
            });
            if (closest >= 0) labelIndex = closest;
          }
        }

        if (labelIndex === -1) {
          const numericPos = parseFloat(evt.position);
          if (!isNaN(numericPos) && !isDateAxis) {
            let closest = -1;
            let closestDiff = Infinity;
            displayLabels.forEach((lbl, idx) => {
              const val = parseFloat(lbl);
              if (isNaN(val)) return;
              const diff = Math.abs(val - numericPos);
              if (diff < closestDiff) { closestDiff = diff; closest = idx; }
            });
            if (closest >= 0 && closestDiff < (10 / displayLabels.length) * 2) {
              labelIndex = closest;
            }
          }
        }

        if (labelIndex === -1) return;

        const yAdj = 10 + (i % 4) * 20;
        const wrappedLabel = wrapText(evt.label, 18);

        tierAnnotations[`evtLine_${i}`] = {
          type: 'line',
          xMin: labelIndex,
          xMax: labelIndex,
          borderColor: hexToRgba(eventColor, 0.7),
          borderWidth: 2.5,
          borderDash: [8, 4],
          label: {
            display: true,
            content: wrappedLabel,
            position: 'end',
            backgroundColor: hexToRgba(eventColor, 0.18),
            color: eventColor,
            font: { size: 10, weight: '600', family: "'Inter', sans-serif" },
            padding: { x: 8, y: 4 },
            borderRadius: 6,
            yAdjust: yAdj,
          },
        };

        const firstDsData = datasets[0]?.data;
        if (firstDsData && firstDsData[labelIndex] != null) {
          tierAnnotations[`evtPoint_${i}`] = {
            type: 'point',
            xValue: labelIndex,
            yValue: firstDsData[labelIndex],
            backgroundColor: eventColor,
            borderColor: userBgColor || c.bg,
            borderWidth: 3,
            radius: 7,
          };
        }
      });
    }

    const animDuration = safeInt(dom.animationSpeed?.value, 600);

    const config = {
      type: 'line',
      data: { labels: displayLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: animDuration, easing: 'easeOutQuart' },
        layout: {
          padding: {
            top: dom.chartTitle.value ? 8 : 4,
            bottom: dom.chartSource.value ? 24 : 8,
            left: 4,
            right: 20,
          },
        },
        plugins: {
          title: {
            display: !!dom.chartTitle.value,
            text: dom.chartTitle.value,
            color: c.text,
            font: { size: 16, weight: '600', family: "'Inter', sans-serif" },
            padding: { bottom: dom.chartSubtitle.value ? 2 : 12 },
          },
          subtitle: {
            display: !!dom.chartSubtitle.value,
            text: dom.chartSubtitle.value,
            color: c.textSecondary,
            font: { size: 11, weight: '400', family: "'Inter', sans-serif" },
            padding: { bottom: 16 },
          },
          legend: {
            display: dom.showLegend?.checked ?? true,
            position: dom.legendPosition?.value || 'top',
            align: 'end',
            labels: {
              color: c.textSecondary,
              font: { size: 11, family: "'Inter', sans-serif" },
              boxWidth: 12,
              boxHeight: 3,
              padding: 14,
              usePointStyle: false,
            },
          },
          tooltip: {
            backgroundColor: currentTheme === 'dark' ? '#1e293b' : '#fff',
            titleColor: c.text,
            bodyColor: c.textSecondary,
            borderColor: c.border,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items) => isDateAxis ? items[0]?.label : `Time: ${items[0]?.label}`,
              label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`,
            },
          },
          datalabels: { display: false },
          annotation: { annotations: tierAnnotations },
        },
        scales: {
          x: {
            type: isDateAxis ? 'category' : 'linear',
            title: {
              display: true,
              text: xLabel,
              color: c.textSecondary,
              font: { size: 11, weight: '500', family: "'Inter', sans-serif" },
            },
            grid: { display: false },
            ticks: {
              color: isDateAxis ? c.textMuted : c.textMuted,
              font: { size: isDateAxis ? 10 : 9, family: "'Inter', sans-serif" },
              maxTicksLimit: isDateAxis ? Math.min(labels.length, 15) : 6,
              maxRotation: isDateAxis ? 45 : 0,
              autoSkip: true,
            },
            border: { display: false },
            ...(isDateAxis ? {} : { min: 0, max: 10 }),
          },
          y: {
            title: {
              display: true,
              text: yLabel,
              color: c.textSecondary,
              font: { size: 11, weight: '500', family: "'Inter', sans-serif" },
            },
            grid: { display: false },
            ticks: {
              color: c.textSecondary,
              font: { size: 10, family: "'Inter', sans-serif" },
              padding: 8,
            },
            border: { display: false },
            min: yAxisMinVal,
            ...(yAxisMaxVal != null ? { max: yAxisMaxVal } : {}),
          },
        },
      },
      plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
    };

    chartInstance = new Chart(dom.chartCanvas, config);
  }

  // ═══════════════════════════════════════════
  //  Export
  // ═══════════════════════════════════════════

  dom.exportBtn.addEventListener('click', exportChart);

  function exportChart() {
    if (!chartInstance) {
      showToast('No chart to export', 'error');
      return;
    }

    const format = dom.exportFormat.value;
    const ext = { jpg: 'jpg', webp: 'webp', svg: 'svg' }[format] || 'png';
    const suggested = getExportFilename(ext);

    showExportModal(suggested, (confirmedName) => {
      doExport(confirmedName, format, ext);
    });
  }

  function showExportModal(suggestedName, onConfirm) {
    document.querySelectorAll('.export-modal-overlay').forEach(m => m.remove());

    const overlay = document.createElement('div');
    overlay.className = 'export-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'export-modal';

    const title = document.createElement('h3');
    title.className = 'export-modal-title';
    title.textContent = 'Export Chart';
    modal.appendChild(title);

    const label = document.createElement('label');
    label.className = 'export-modal-label';
    label.textContent = 'Filename';
    modal.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'export-modal-input';
    input.value = suggestedName;
    modal.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'export-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancel';
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-primary';
    confirmBtn.textContent = 'Export';
    actions.appendChild(confirmBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    input.focus();
    const dotIdx = input.value.lastIndexOf('.');
    if (dotIdx > 0) input.setSelectionRange(0, dotIdx);

    cancelBtn.addEventListener('click', () => overlay.remove());
    confirmBtn.addEventListener('click', () => {
      const name = input.value.trim() || suggestedName;
      overlay.remove();
      onConfirm(name);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = input.value.trim() || suggestedName;
        overlay.remove();
        onConfirm(name);
      } else if (e.key === 'Escape') {
        overlay.remove();
      }
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  function doExport(filename, format, ext) {
    const sizeStr = dom.exportSize.value;
    const [w, h] = sizeStr.split('x').map(Number);
    const quality = safeInt(dom.exportQuality?.value, 2);

    if (format === 'svg') {
      exportAsSVG(w, h, filename);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'export-canvas-wrapper';
    wrapper.style.width = w + 'px';
    wrapper.style.height = h + 'px';
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w * quality;
    offCanvas.height = h * quality;
    offCanvas.style.width = w + 'px';
    offCanvas.style.height = h + 'px';
    wrapper.appendChild(offCanvas);
    document.body.appendChild(wrapper);

    const tickCallback = buildYTickCallback();
    const dlFormatter = buildDataLabelFormatter();
    const tooltipLabelCallback = buildTooltipCallback();

    const exportConfig = JSON.parse(JSON.stringify(chartInstance.config._config));

    if (!exportConfig.options) exportConfig.options = {};
    if (!exportConfig.options.layout) exportConfig.options.layout = { padding: { top: 4, bottom: 8, left: 4, right: 4 } };

    const scaleFonts = (obj) => {
      if (!obj) return;
      if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          if (key === 'size' && typeof obj[key] === 'number') {
            obj[key] = Math.round(obj[key] * (1 + quality * 0.25));
          } else {
            scaleFonts(obj[key]);
          }
        }
      }
    };
    scaleFonts(exportConfig.options);

    if (exportConfig.options.layout?.padding) {
      const pad = exportConfig.options.layout.padding;
      if (typeof pad === 'object') {
        Object.keys(pad).forEach(k => { pad[k] = Math.round(pad[k] * (1 + quality * 0.5)); });
      }
    }

    exportConfig.options.animation = false;
    exportConfig.options.responsive = false;
    exportConfig.options.maintainAspectRatio = false;

    if (exportConfig.options?.scales?.y?.ticks) {
      exportConfig.options.scales.y.ticks.callback = tickCallback;
    }
    if (exportConfig.options?.scales?.y1?.ticks) {
      exportConfig.options.scales.y1.ticks.callback = tickCallback;
    }
    if (exportConfig.options?.plugins?.datalabels) {
      exportConfig.options.plugins.datalabels.formatter = dlFormatter;
    }

    const exportChartInstance = new Chart(offCanvas, {
      ...exportConfig,
      plugins: [bgPlugin, {
        id: 'sourceFooterExport',
        afterDraw(chart) {
          const source = dom.chartSource.value;
          if (!source) return;
          const ctx = chart.ctx;
          const c = getThemeColors();
          ctx.save();
          ctx.font = `400 14px 'Inter', sans-serif`;
          ctx.fillStyle = c.textMuted;
          ctx.textAlign = 'left';
          ctx.fillText(`Source: ${source}`, chart.chartArea.left, chart.height - 12);
          ctx.restore();
        }
      }, brandPlugin, ChartDataLabels]
    });

    requestAnimationFrame(() => {
      setTimeout(() => {
        const mimeType = { jpg: 'image/jpeg', webp: 'image/webp' }[format] || 'image/png';

        const link = document.createElement('a');
        link.download = filename;
        link.href = offCanvas.toDataURL(mimeType, 0.95);
        link.click();

        exportChartInstance.destroy();
        document.body.removeChild(wrapper);
        showToast(`Chart exported as ${ext.toUpperCase()}!`, 'success');
      }, 200);
    });
  }

  function exportAsSVG(w, h, filename) {
    const dataUrl = dom.chartCanvas.toDataURL('image/png', 1.0);
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" xlink:href="${dataUrl}"/>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Chart exported as SVG!', 'success');
  }

  // ═══════════════════════════════════════════
  //  Clipboard Copy
  // ═══════════════════════════════════════════

  dom.copyClipboardBtn.addEventListener('click', copyToClipboard);
  dom.copyJsonBtn.addEventListener('click', copyAsJSON);

  async function copyAsJSON() {
    if (!parsedData) {
      showToast('No data to copy', 'error');
      return;
    }

    try {
      const jsonData = {
        chartType: currentChartType,
        title: dom.chartTitle.value || '',
        subtitle: dom.chartSubtitle.value || '',
        source: dom.chartSource.value || '',
        labels: parsedData.labels,
        datasets: parsedData.datasets.map(ds => ({
          name: ds.name,
          values: ds.values
        })),
        isTimeSeries: parsedData.isTimeSeries,
        colors: userColors,
        theme: currentTheme
      };

      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      showToast('Chart data copied as JSON!', 'success');
    } catch (err) {
      showToast('Copy failed', 'error');
    }
  }

  async function copyToClipboard() {
    if (!chartInstance) {
      showToast('No chart to copy', 'error');
      return;
    }

    try {
      const canvas = dom.chartCanvas;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Chart copied to clipboard!', 'success');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = getExportFilename('png');
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Clipboard not supported \u2014 downloaded instead', 'warning');
      }
    } catch (err) {
      showToast('Copy failed \u2014 try downloading instead', 'error');
    }
  }

  // ═══════════════════════════════════════════
  //  Utilities
  // ═══════════════════════════════════════════

  function getExportFilename(ext) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const legendNames = parsedData ? parsedData.datasets.map(ds => ds.name).filter(Boolean) : [];
    const subtitle = dom.chartSubtitle?.value.trim() || '';
    const title = dom.chartTitle?.value.trim() || '';

    let base = '';
    if (legendNames.length > 0 && legendNames.length <= 3) {
      base = legendNames.join(' vs ');
    } else if (legendNames.length > 3) {
      base = legendNames[0] + ' et al';
    }
    if (!base) base = subtitle;
    if (!base) base = title;
    if (!base) base = currentChartType + '-chart';

    base = base.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
    return `${base}-${dateStr}.${ext}`;
  }

  function showToast(message, type = 'success') {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ═══════════════════════════════════════════
  //  Clipboard Paste
  // ═══════════════════════════════════════════

  document.addEventListener('paste', async (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const text = e.clipboardData?.getData('text');
    if (!text) return;

    dom.dataTextarea.value = text;
    rawParsedData = await parseDataFromText(text);
    if (rawParsedData) {
      parsedData = rawParsedData;
      zoomRange = [0, 100];
      updateAfterDataLoad();
      showToast('Data pasted and parsed!', 'success');
    }
  });

  // ═══════════════════════════════════════════
  //  Keyboard Shortcuts
  // ═══════════════════════════════════════════

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      exportChart();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          e.preventDefault();
          copyToClipboard();
        }
      }
    }
  });

  // ═══════════════════════════════════════════
  //  Init
  // ═══════════════════════════════════════════

  function init() {
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels.display = false;

    dom.maxTicksValue.textContent = dom.maxTicks.value;
    if (dom.barBorderRadiusValue) dom.barBorderRadiusValue.textContent = dom.barBorderRadius.value;
    if (dom.xAxisRotationValue) dom.xAxisRotationValue.textContent = dom.xAxisRotation.value + '\u00B0';
    if (dom.innovatorTiersValue) dom.innovatorTiersValue.textContent = dom.innovatorTiers.value;
    if (dom.innovatorSustainingPaceValue) dom.innovatorSustainingPaceValue.textContent = dom.innovatorSustainingPace.value;
    if (dom.innovatorDisruptionPaceValue) dom.innovatorDisruptionPaceValue.textContent = dom.innovatorDisruptionPace.value;
    if (dom.innovatorDisruptiveStartValue) dom.innovatorDisruptiveStartValue.textContent = dom.innovatorDisruptiveStart.value;
    if (dom.innovatorDisruptivePeakValue) dom.innovatorDisruptivePeakValue.textContent = dom.innovatorDisruptivePeak.value;
    if (dom.innovatorIncumbentBaseValue) dom.innovatorIncumbentBaseValue.textContent = dom.innovatorIncumbentBase.value;
    if (dom.innovatorIncumbentSlopeValue) dom.innovatorIncumbentSlopeValue.textContent = dom.innovatorIncumbentSlope.value;
    if (dom.innovatorMarketTopValue) dom.innovatorMarketTopValue.textContent = dom.innovatorMarketTop.value;
    if (dom.innovatorMarketBottomValue) dom.innovatorMarketBottomValue.textContent = dom.innovatorMarketBottom.value;

    renderInnovatorTierNames();

    if (dom.maxRowsInput) {
      CONFIG.hardRowLimit = parseInt(dom.maxRowsInput.value) || 50000;
    }

    loadSampleData();
  }

  init();

})();
