/* ═══════════════════════════════════════════
   Inflation Chart — Variant Gallery
   Single classic script (no ES modules). Each builder is a pure
   (state, colors) → Chart.js config so the chosen variant can be lifted
   into the main app's self-managed chart pattern later.
   Model: equivalent = amount × (1 + r)^(target − base)
   ═══════════════════════════════════════════ */
'use strict';

const FONT = "'Inter', system-ui, -apple-system, sans-serif";
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const charts = {};          // id (1..8) → Chart instance
const builders = {};        // id → config builder

/* ── Theme color + format helpers ── */
function getColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return {
    hero: g('--chart-hero'),
    secondary: g('--chart-secondary'),
    bg: g('--bg-tertiary'),
    grid: g('--chart-grid'),
    text: g('--chart-text'),
    textSecondary: g('--chart-text-secondary'),
    textTertiary: g('--text-tertiary'),
    border: g('--border-primary'),
    palette: ['--palette-1','--palette-2','--palette-3','--palette-4','--palette-5','--palette-6','--palette-7','--palette-8'].map(g),
  };
}
function hexToRgba(hex, a = 1) {
  if (!hex) return `rgba(0,0,0,${a})`;
  hex = hex.trim();
  if (!hex.startsWith('#')) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtMoney(v, dec = 0) {
  if (!isFinite(v)) return '—';
  return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtCompact(v) {
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 1000) return '$' + Number(v).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 });
  return fmtMoney(v, 0);
}
const ticks = (c, fmt) => ({ color: c.textTertiary, font: { family: FONT, size: 10 }, maxRotation: 0, autoSkipPadding: 16, ...(fmt ? { callback: fmt } : {}) });
const grid = (c) => ({ color: hexToRgba(c.grid, 0.4) });
const axisTitle = (c, text) => ({ display: !!text, text: text || '', color: c.textSecondary, font: { family: FONT, size: 11 } });
function legend(c, display = true) {
  return { display, position: 'bottom', labels: { color: c.textSecondary, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { family: FONT, size: 11 } } };
}
function tooltip(c, callbacks = {}) {
  return {
    backgroundColor: c.bg, titleColor: c.text, bodyColor: c.textSecondary,
    borderColor: c.border, borderWidth: 1, cornerRadius: 8, padding: 10, boxPadding: 4,
    titleFont: { family: FONT, size: 12, weight: '600' }, bodyFont: { family: FONT, size: 12 },
    callbacks,
  };
}

/* ── Math ── */
function readState() {
  return {
    amount: +$('amount').value,
    rate: +$('rate').value / 100,
    baseYear: +$('baseYear').value,
    targetYear: +$('targetYear').value,
    rangeMin: +$('rangeMin').value,
    rangeMax: +$('rangeMax').value,
  };
}
const equiv = (A, r, y, yb) => A * Math.pow(1 + r, y - yb);
function seriesYears(I) {
  const out = [];
  for (let y = I.rangeMin; y <= I.rangeMax; y++) out.push(y);
  return out;
}
function sampleYears(yrs, maxN) {
  if (yrs.length <= maxN) return yrs.slice();
  const out = [];
  const step = (yrs.length - 1) / (maxN - 1);
  for (let i = 0; i < maxN; i++) out.push(yrs[Math.round(i * step)]);
  return out;
}
function purchasingPower(I) {
  const n = I.targetYear - I.baseYear;
  const retained = n > 0 ? 1 / Math.pow(1 + I.rate, n) : 1;
  return { n, retained: clamp(retained, 0, 1), retainedPct: clamp(retained * 100, 0, 100), erodedPct: clamp((1 - retained) * 100, 0, 100) };
}

/* ── Canvas-drawing helpers (custom plugins) ── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawPill(ctx, cx, cy, text, bg, fg = '#fff') {
  ctx.font = `600 11px ${FONT}`;
  const w = ctx.measureText(text).width + 16, h = 20;
  ctx.fillStyle = bg;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
}
function endLabels(axis, fmt, color) {
  return {
    id: 'endLabels',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data) return;
      const { ctx } = chart;
      const ds = chart.data.datasets[0];
      ctx.save();
      ctx.font = `600 10px ${FONT}`;
      ctx.fillStyle = color;
      meta.data.forEach((bar, i) => {
        const val = ds.data[i];
        const v = Array.isArray(val) ? val[1] : val;
        if (!isFinite(v)) return;
        if (axis === 'x') { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), bar.x, bar.y - 4); }
        else { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(v), bar.x + 6, bar.y); }
      });
      ctx.restore();
    },
  };
}

/* ═══════════════════════════════════════════
   VARIANTS
   ═══════════════════════════════════════════ */

/* 1 · Value Track (line, fill) */
builders[1] = (I, c) => {
  const yrs = seriesYears(I);
  const data = yrs.map((y) => equiv(I.amount, I.rate, y, I.baseYear));
  const tension = parseFloat($('v1-tension').value);
  const markers = $('v1-markers').checked;
  const baseIdx = yrs.indexOf(I.baseYear);
  const tgtIdx = yrs.indexOf(I.targetYear);
  const mark = (i) => markers && (i === baseIdx || i === tgtIdx);
  return {
    type: 'line',
    data: { labels: yrs, datasets: [{
      label: 'Equivalent value', data,
      borderColor: c.hero, backgroundColor: hexToRgba(c.hero, 0.18),
      fill: true, tension, borderWidth: 2.5, pointHoverRadius: 6,
      pointRadius: data.map((_, i) => (mark(i) ? 5 : 0)),
      pointBackgroundColor: data.map((_, i) => (i === tgtIdx ? c.secondary : c.hero)),
      pointBorderColor: '#fff', pointBorderWidth: data.map((_, i) => (mark(i) ? 2 : 0)),
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: legend(c, false), tooltip: tooltip(c, { label: (x) => ' ' + fmtMoney(x.parsed.y) }) },
      scales: {
        x: { title: axisTitle(c, 'Year'), grid: grid(c), ticks: ticks(c), border: { color: c.border } },
        y: { title: axisTitle(c, 'Value'), grid: grid(c), ticks: ticks(c, (v) => fmtCompact(v)), border: { color: c.border } },
      },
    },
  };
};

/* 2 · Purchasing-Power Donut */
builders[2] = (I, c) => {
  const { retainedPct, erodedPct } = purchasingPower(I);
  const cutout = $('v2-cutout').value + '%';
  const showCenter = $('v2-center').checked;
  const centerPlugin = {
    id: 'donutCenter',
    afterDatasetsDraw(chart) {
      const arc = chart.getDatasetMeta(0).data[0];
      if (!arc) return;
      const { ctx } = chart;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = c.text; ctx.font = `700 22px ${FONT}`;
      ctx.fillText(retainedPct.toFixed(1) + '%', arc.x, arc.y - 6);
      ctx.fillStyle = c.textSecondary; ctx.font = `500 11px ${FONT}`;
      ctx.fillText('retained', arc.x, arc.y + 16);
    },
  };
  return {
    type: 'doughnut',
    data: { labels: ['Retained', 'Lost to inflation'], datasets: [{
      data: [retainedPct, erodedPct],
      backgroundColor: [c.hero, hexToRgba(c.textSecondary, 0.25)],
      borderColor: c.bg, borderWidth: 2, hoverOffset: 6,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout,
      plugins: {
        legend: legend(c, true),
        tooltip: tooltip(c, { label: (x) => ` ${x.label}: ${x.parsed.toFixed(1)}%` }),
      },
    },
    plugins: showCenter ? [centerPlugin] : [],
  };
};

/* 3 · Then-vs-Now Dumbbell (scatter + connector plugin) */
builders[3] = (I, c) => {
  const eq = equiv(I.amount, I.rate, I.targetYear, I.baseYear);
  const { n } = purchasingPower(I);
  const ratio = eq / I.amount;
  const pointSize = parseFloat($('v3-point').value);
  const showPill = $('v3-pill').checked;
  const connector = {
    id: 'dumbbellLine',
    afterDatasetsDraw(chart) {
      const m0 = chart.getDatasetMeta(0).data[0];
      const m1 = chart.getDatasetMeta(1).data[0];
      if (!m0 || !m1) return;
      const { ctx } = chart;
      const y = (m0.y + m1.y) / 2;
      ctx.save();
      ctx.strokeStyle = hexToRgba(c.textSecondary, 0.55);
      ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(m0.x, y); ctx.lineTo(m1.x, y); ctx.stroke();
      ctx.setLineDash([]);
      if (showPill) {
        drawPill(ctx, (m0.x + m1.x) / 2, y - 16, `${ratio.toFixed(2)}×`, c.hero);
        ctx.fillStyle = c.textTertiary; ctx.font = `500 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.abs(n)} yr`, (m0.x + m1.x) / 2, y + 18);
      }
      ctx.restore();
    },
  };
  return {
    type: 'scatter',
    data: { datasets: [
      { label: `${I.baseYear} (original)`, data: [{ x: I.amount, y: 0 }], backgroundColor: c.secondary, borderColor: '#fff', borderWidth: 2, pointRadius: pointSize, pointHoverRadius: pointSize + 2 },
      { label: `${I.targetYear} (equivalent)`, data: [{ x: eq, y: 0 }], backgroundColor: c.hero, borderColor: '#fff', borderWidth: 2, pointRadius: pointSize, pointHoverRadius: pointSize + 2 },
    ] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: legend(c, true),
        tooltip: tooltip(c, { label: (x) => ' ' + fmtMoney(x.parsed.x) }),
      },
      scales: {
        x: { type: 'linear', title: axisTitle(c, 'Value'), grid: grid(c), ticks: ticks(c, (v) => fmtCompact(v)), border: { color: c.border } },
        y: { min: -0.5, max: 0.5, display: false, grid: { display: false } },
      },
    },
    plugins: [connector],
  };
};

/* 4 · Yearly-Equivalent Bars (horizontal) */
builders[4] = (I, c) => {
  const dec = parseInt($('v4-dec').value, 10);
  const maxN = parseInt($('v4-max').value, 10);
  const yrs = sampleYears(seriesYears(I), maxN);
  const data = yrs.map((y) => equiv(I.amount, I.rate, y, I.baseYear));
  const tgtIdx = yrs.indexOf(I.targetYear);
  return {
    type: 'bar',
    data: { labels: yrs, datasets: [{
      label: 'Equivalent value', data,
      backgroundColor: data.map((_, i) => (i === tgtIdx ? c.secondary : hexToRgba(c.hero, 0.85))),
      borderRadius: 3, borderSkipped: false,
    }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legend(c, false),
        tooltip: tooltip(c, { label: (x) => ' ' + fmtMoney(x.parsed.x, dec) }),
      },
      scales: {
        x: { title: axisTitle(c, 'Value'), grid: grid(c), ticks: ticks(c, (v) => fmtCompact(v)), border: { color: c.border } },
        y: { grid: { display: false }, ticks: ticks(c), border: { color: c.border } },
      },
    },
    plugins: [endLabels('y', (v) => fmtCompact(v), c.textSecondary)],
  };
};

/* 5 · Cumulative-Erosion Waterfall (floating bars) */
builders[5] = (I, c) => {
  const opacity = parseInt($('v5-opacity').value, 10) / 100;
  const highlight = $('v5-highlight').checked;
  const yrs = sampleYears(seriesYears(I), 24);
  const data = yrs.map((y, i) => {
    const hi = equiv(I.amount, I.rate, y, I.baseYear);
    const lo = i === 0 ? hi : equiv(I.amount, I.rate, y - 1, I.baseYear);
    return [lo, hi];
  });
  const tgtIdx = yrs.indexOf(I.targetYear);
  return {
    type: 'bar',
    data: { labels: yrs, datasets: [{
      label: 'Yearly step', data,
      backgroundColor: data.map((_, i) => (highlight && i === tgtIdx ? c.secondary : hexToRgba(c.hero, opacity))),
      borderRadius: 2, borderSkipped: false,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legend(c, false),
        tooltip: tooltip(c, {
          title: (items) => 'Year ' + items[0].label,
          label: (x) => ` step ${fmtMoney(x.parsed.y[1] - x.parsed.y[0])} → ${fmtMoney(x.parsed.y[1])}`,
        }),
      },
      scales: {
        x: { title: axisTitle(c, 'Year'), grid: grid(c), ticks: ticks(c), border: { color: c.border } },
        y: { title: axisTitle(c, 'Running value'), grid: grid(c), ticks: ticks(c, (v) => fmtCompact(v)), border: { color: c.border } },
      },
    },
  };
};

/* 6 · Purchasing-Power Gauge (partial doughnut + needle) */
builders[6] = (I, c) => {
  const { retainedPct } = purchasingPower(I);
  const cutout = $('v6-cutout').value + '%';
  const showLabel = $('v6-label').checked;
  const needle = {
    id: 'gaugeNeedle',
    afterDatasetsDraw(chart) {
      const arc = chart.getDatasetMeta(0).data[0];
      if (!arc) return;
      const { ctx } = chart;
      const cx = arc.x, cy = arc.y, r = arc.outerRadius;
      const theta = (180 + (retainedPct / 100) * 180) * Math.PI / 180;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(theta);
      ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(r * 0.82, 0); ctx.lineTo(-6, 3); ctx.closePath();
      ctx.fillStyle = c.text; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (showLabel) {
        ctx.fillStyle = c.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `700 24px ${FONT}`;
        ctx.fillText(retainedPct.toFixed(1) + '%', cx, cy + r * 0.42);
        ctx.fillStyle = c.textSecondary; ctx.font = `500 11px ${FONT}`;
        ctx.fillText('purchasing power', cx, cy + r * 0.42 + 20);
      }
    },
  };
  return {
    type: 'doughnut',
    data: { labels: ['Retained', 'Lost'], datasets: [{
      data: [retainedPct, Math.max(0.0001, 100 - retainedPct)],
      backgroundColor: [c.hero, hexToRgba(c.textSecondary, 0.16)],
      borderWidth: 0,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, rotation: -90, circumference: 180, cutout,
      plugins: { legend: legend(c, false), tooltip: tooltip(c, { label: (x) => ` ${x.label}: ${x.parsed.toFixed(1)}%` }) },
    },
    plugins: [needle],
  };
};

/* 7 · Rate-Sensitivity Columns */
builders[7] = (I, c) => {
  const rates = [1, 3, 5, 8, 12];
  const { n } = purchasingPower(I);
  const vals = rates.map((p) => I.amount * Math.pow(1 + p / 100, Math.max(0, n)));
  const cur = I.rate * 100;
  const hlOpacity = parseInt($('v7-hl').value, 10) / 100;
  const yLog = $('v7-log').checked;
  const colors = rates.map((p) => (Math.abs(p - cur) <= 0.05 ? c.secondary : hexToRgba(c.hero, hlOpacity)));
  return {
    type: 'bar',
    data: { labels: rates.map((p) => p + '%'), datasets: [{
      label: `Equivalent in ${I.targetYear}`, data: vals,
      backgroundColor: colors, borderRadius: 4, borderSkipped: false,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: legend(c, false),
        tooltip: tooltip(c, { label: (x) => ` at ${x.label}/yr → ${fmtMoney(x.parsed.y)}` }),
      },
      scales: {
        x: { title: axisTitle(c, 'Annual inflation rate'), grid: { display: false }, ticks: ticks(c), border: { color: c.border } },
        y: { type: yLog ? 'logarithmic' : 'linear', title: axisTitle(c, `Value in ${I.targetYear}`), grid: grid(c), ticks: ticks(c, (v) => fmtCompact(v)), border: { color: c.border } },
      },
    },
    plugins: [endLabels('x', (v) => fmtCompact(v), c.textSecondary)],
  };
};

/* 8 · Decade Polar */
builders[8] = (I, c) => {
  const startAngle = parseInt($('v8-angle').value, 10);
  const floor = parseInt($('v8-floor').value, 10) / 100;
  let dec = [];
  for (let y = Math.ceil(I.rangeMin / 10) * 10; y <= I.rangeMax; y += 10) dec.push(y);
  if (dec.length < 3) dec = sampleYears(seriesYears(I), 6);
  const vals = dec.map((y) => equiv(I.amount, I.rate, y, I.baseYear));
  const cols = dec.map((_, i) => hexToRgba(c.hero, +(floor + (1 - floor) * (i / Math.max(1, dec.length - 1))).toFixed(2)));
  return {
    type: 'polarArea',
    data: { labels: dec.map(String), datasets: [{
      label: 'Equivalent value', data: vals,
      backgroundColor: cols, borderColor: c.bg, borderWidth: 2, startAngle,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: legend(c, false),
        tooltip: tooltip(c, { label: (x) => ` ${fmtCompact(x.parsed.r ?? x.parsed)}` }),
      },
      scales: { r: {
        ticks: { display: false, backdropColor: 'transparent' },
        grid: { color: hexToRgba(c.grid, 0.5) },
        angleLines: { color: hexToRgba(c.grid, 0.5) },
        pointLabels: { color: c.textSecondary, font: { family: FONT, size: 10 } },
      } },
    },
  };
};

/* ═══════════════════════════════════════════
   RENDER + WIRING
   ═══════════════════════════════════════════ */
function renderOne(id) {
  const I = readState();
  const c = getColors();
  Chart.defaults.color = c.textTertiary;
  const cfg = builders[id](I, c);
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($('v' + id), cfg);
}
function renderAll() {
  syncAndClamp();
  const I = readState();
  const c = getColors();
  Chart.defaults.color = c.textTertiary;
  Chart.defaults.font.family = FONT;
  for (let id = 1; id <= 8; id++) {
    const cfg = builders[id](I, c);
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($('v' + id), cfg);
  }
  updateSummary(I);
}
function updateSummary(I) {
  const { n, retainedPct } = purchasingPower(I);
  const eq = equiv(I.amount, I.rate, I.targetYear, I.baseYear);
  const yrs = n === 1 ? '1 yr' : `${Math.abs(n)} yrs`;
  $('summary').innerHTML =
    `<b>${fmtMoney(I.amount)}</b> in <b>${I.baseYear}</b> ≈ <b>${fmtMoney(eq)}</b> in <b>${I.targetYear}</b>` +
    ` <span style="color:var(--text-tertiary)">(${(I.rate * 100).toFixed(1)}%/yr · ${n >= 0 ? '+' : '−'}${yrs})</span>` +
    ` &nbsp;·&nbsp; Purchasing power retained: <b>${retainedPct.toFixed(1)}%</b>`;
}

/* value-span formatting + clamping */
const spanFmt = {
  amount: (v) => fmtMoney(+v),
  rate: (v) => (+v).toFixed(1) + '%',
  baseYear: (v) => v, targetYear: (v) => v, rangeMin: (v) => v, rangeMax: (v) => v,
  'v1-tension': (v) => (+v).toFixed(2),
  'v2-cutout': (v) => v + '%',
  'v3-point': (v) => v,
  'v4-max': (v) => v, 'v4-dec': (v) => v,
  'v5-opacity': (v) => v + '%',
  'v6-cutout': (v) => v + '%',
  'v7-hl': (v) => v + '%',
  'v8-angle': (v) => v + '°',
  'v8-floor': (v) => ((+v) / 100).toFixed(2),
};
function setSpan(id) { const el = $(id); if (el && spanFmt[id]) $(id + 'Value').textContent = spanFmt[id](el.value); }
function syncAndClamp() {
  let rmin = +$('rangeMin').value, rmax = +$('rangeMax').value;
  if (rmin >= rmax) { rmin = rmax - 1; $('rangeMin').value = rmin; }
  let by = clamp(+$('baseYear').value, rmin, rmax);
  let ty = clamp(+$('targetYear').value, rmin, rmax);
  if (ty < by) ty = by;
  $('baseYear').value = by; $('targetYear').value = ty;
  $('baseYear').min = rmin; $('baseYear').max = ty;   // base can't pass target
  $('targetYear').min = by; $('targetYear').max = rmax; // target can't drop below base
  ['amount', 'rate', 'baseYear', 'targetYear', 'rangeMin', 'rangeMax'].forEach(setSpan);
}

/* which variant a local control belongs to */
const localOwner = {
  'v1-tension': 1, 'v1-markers': 1,
  'v2-cutout': 2, 'v2-center': 2,
  'v3-point': 3, 'v3-pill': 3,
  'v4-max': 4, 'v4-dec': 4,
  'v5-opacity': 5, 'v5-highlight': 5,
  'v6-cutout': 6, 'v6-label': 6,
  'v7-hl': 7, 'v7-log': 7,
  'v8-angle': 8, 'v8-floor': 8,
};
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const debouncedAll = debounce(renderAll, 120);
const debouncedOneFns = {};
const renderOneDebounced = (id) => { (debouncedOneFns[id] ||= debounce(() => renderOne(id), 120))(); };

function wireShared() {
  ['amount', 'rate', 'baseYear', 'targetYear', 'rangeMin', 'rangeMax'].forEach((id) => {
    $(id).addEventListener('input', () => { syncAndClamp(); updateSummary(readState()); debouncedAll(); });
  });
}
function wireLocal() {
  Object.keys(localOwner).forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (el.type === 'range' && spanFmt[id]) setSpan(id);
      renderOneDebounced(localOwner[id]);
    });
  });
}

/* theme + reset */
function initThemeToggle() {
  const btn = $('themeToggle');
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    btn.textContent = next === 'dark' ? '🌙 Dark' : '☀️ Light';
    renderAll();
  });
}
const DEFAULTS = { amount: 1000, rate: 3, baseYear: 2000, targetYear: 2024, rangeMin: 1970, rangeMax: 2026 };
function initReset() {
  $('resetBtn').addEventListener('click', () => {
    Object.entries(DEFAULTS).forEach(([k, v]) => { $(k).value = v; });
    renderAll();
  });
}

/* ── init ── */
function init() {
  if (typeof Chart === 'undefined') { console.error('Chart.js failed to load'); return; }
  Chart.defaults.font.family = FONT;
  wireShared();
  wireLocal();
  initThemeToggle();
  initReset();
  syncAndClamp();
  renderAll();
}
window.addEventListener('DOMContentLoaded', init);
