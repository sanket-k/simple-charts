/** Innovator's Dilemma chart — disruptive vs. incumbent technology curves with market tier lines. */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba, wrapText } from '../utils.js';
import { getThemeColors, getMultiColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase } from './base-options.js';
import { tryParseDate } from '../date-utils.js';
import { registerChart } from './registry.js';

/** Returns the default display name for a market tier by index. */
export function getInnovatorTierDefaultName(t, total) {
  if (total === 1) return 'Market Demand';
  if (t === 0) return 'High-end Market';
  if (t === total - 1) return 'Low-end Market';
  return `Market Tier ${t + 1}`;
}

/** Renders the tier name input fields in the settings panel. */
export function renderInnovatorTierNames() {
  if (!dom.innovatorTierNames) return;
  const tiers = safeInt(dom.innovatorTiers?.value, 3);

  if (state.charts.innovator.tierCustomNames.length > tiers) {
    state.charts.innovator.tierCustomNames.length = tiers;
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
    input.value = state.charts.innovator.tierCustomNames[t] || '';
    input.placeholder = getInnovatorTierDefaultName(t, tiers);
    input.dataset.tierIndex = t;
    input.addEventListener('input', (e) => {
      state.charts.innovator.tierCustomNames[parseInt(e.target.dataset.tierIndex)] = e.target.value;
      if (window.__debouncedRender) window.__debouncedRender();
    });
    row.appendChild(label);
    row.appendChild(input);
    dom.innovatorTierNames.appendChild(row);
  }
}

/** Self-managed render: builds the Innovator's Dilemma chart from formula settings or parsed data. */
export function renderInnovatorsDilemmaChart() {
  const c = getThemeColors();
  const colors = getMultiColors();

  // ── Mode detection ──────────────────────────────────────────
  const pd = state.parsedData;
  const hasData = pd && pd.datasets && pd.datasets.length > 0
    && pd.labels && pd.labels.length > 0;
  const dataDsCount = hasData ? pd.datasets.length : 0;

  // ── UI params ───────────────────────────────────────────────
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

  const rawDisruptiveStart = safeFloat(dom.innovatorDisruptiveStart?.value, 3);
  const rawDisruptivePeak = safeFloat(dom.innovatorDisruptivePeak?.value, 90);
  const rawIncumbentBase = safeFloat(dom.innovatorIncumbentBase?.value, 75);
  const rawIncumbentSlope = safeFloat(dom.innovatorIncumbentSlope?.value, 11);
  const rawMarketTop = safeFloat(dom.innovatorMarketTop?.value, 70);
  const rawMarketBottom = safeFloat(dom.innovatorMarketBottom?.value, 20);

  const userYMin = dom.innovatorYMin?.value !== '';
  const userYMax = dom.innovatorYMax?.value !== '' && safeFloat(dom.innovatorYMax.value, 0) > 0;
  const yAxisMinVal = userYMin ? safeFloat(dom.innovatorYMin.value, 0) : undefined;
  const yAxisMaxVal = userYMax ? safeFloat(dom.innovatorYMax.value, undefined) : undefined;

  // ── Auto-scaling: remap formula values when Y-axis range ≠ default 0–90 ──
  const defaultMin = 0;
  const defaultMax = 90;
  const targetMin = yAxisMinVal ?? defaultMin;
  const targetMax = yAxisMaxVal ?? defaultMax;
  const rangeRatio = (targetMax - targetMin) / (defaultMax - defaultMin);
  const needsScaling = targetMin !== defaultMin || targetMax !== defaultMax;
  const remap = needsScaling
    ? (v) => targetMin + (v - defaultMin) * rangeRatio
    : (v) => v;

  const disruptiveStart = remap(rawDisruptiveStart);
  const disruptivePeak = remap(rawDisruptivePeak);
  const incumbentBase = remap(rawIncumbentBase);
  const incumbentSlope = needsScaling ? rawIncumbentSlope * rangeRatio : rawIncumbentSlope;
  const marketTop = remap(rawMarketTop);
  const marketBottom = remap(rawMarketBottom);

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

  // ── Labels ──────────────────────────────────────────────────
  let labels;
  let isDateAxis = false;
  let isCategoryAxis = false;

  if (hasData) {
    labels = pd.labels.map(String);
    isDateAxis = pd.isTimeSeries || false;
    isCategoryAxis = true;
  } else if (timeMode === 'years') {
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

  state.charts.innovator.currentLabels = labels;

  const startRatio = state.zoomRange[0] / 100;
  const endRatio = state.zoomRange[1] / 100;
  const startIndex = Math.floor(startRatio * labels.length);
  const endIndex = Math.ceil(endRatio * labels.length) || 1;
  const displayLabels = labels.slice(startIndex, endIndex);

  // ── Data range (for auto-scaling tiers in data mode) ────────
  let dataRangeMin = Infinity, dataRangeMax = -Infinity;
  if (hasData) {
    for (const ds of pd.datasets) {
      for (const v of (ds.values || [])) {
        if (v != null && !isNaN(v)) {
          dataRangeMin = Math.min(dataRangeMin, v);
          dataRangeMax = Math.max(dataRangeMax, v);
        }
      }
    }
    if (dataRangeMin === Infinity) { dataRangeMin = 0; dataRangeMax = 100; }
  }

  // Effective tier positioning params (data-derived or formula-scaled)
  const effMarketTop = hasData ? dataRangeMax - (dataRangeMax - dataRangeMin) * 0.1 : marketTop;
  const effMarketBottom = hasData ? dataRangeMin + (dataRangeMax - dataRangeMin) * 0.15 : marketBottom;
  const effSlopePerUnit = hasData
    ? slopePerUnit * ((dataRangeMax - dataRangeMin) / Math.max(defaultMax - defaultMin, 1))
    : slopePerUnit;

  // ── Build datasets ──────────────────────────────────────────
  const datasets = [];
  const customTierCount = hasData ? Math.max(0, dataDsCount - 2) : 0;
  const effectiveTiers = customTierCount > 0 ? customTierCount : tiers;
  const tierSpacing = effectiveTiers > 1 ? (effMarketTop - effMarketBottom) / (effectiveTiers - 1) : 0;

  // Disruptive curve
  if (showDisruptive) {
    const data = hasData
      ? pd.datasets[0].values.slice(startIndex, endIndex)
      : labels.map((_, i) => disruptiveValue(normX(i))).slice(startIndex, endIndex);

    datasets.push({
      label: hasData ? (pd.datasets[0].name || disruptiveName) : disruptiveName,
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

  // Incumbent line
  if (showIncumbent) {
    let data;
    if (hasData && dataDsCount >= 2) {
      data = pd.datasets[1].values.slice(startIndex, endIndex);
    } else if (hasData) {
      // Auto-generate incumbent scaled to data range
      const incBase = dataRangeMax - (dataRangeMax - dataRangeMin) * 0.15;
      const incSlope = (dataRangeMax - dataRangeMin) * 0.12;
      data = labels.map((_, i) => incBase + normX(i) * incSlope).slice(startIndex, endIndex);
    } else {
      data = labels.map((_, i) => incumbentBase + normX(i) * incumbentSlope).slice(startIndex, endIndex);
    }

    datasets.push({
      label: hasData && dataDsCount >= 2 ? (pd.datasets[1].name || incumbentName) : incumbentName,
      data,
      borderColor: colors[1] || c.secondary,
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      borderDash: [10, 6],
      pointRadius: 0,
      tension: 0,
      fill: false,
      order: 1,
    });
  }

  // Tier lines
  const tierAnnotations = {};

  for (let t = 0; t < effectiveTiers; t++) {
    let data;
    let tierName;

    if (customTierCount > 0 && hasData) {
      const dsIdx = t + 2;
      data = pd.datasets[dsIdx].values.slice(startIndex, endIndex);
      tierName = pd.datasets[dsIdx].name || getInnovatorTierDefaultName(t, effectiveTiers);
    } else {
      const baseY = effectiveTiers === 1
        ? (effMarketTop + effMarketBottom) / 2
        : effMarketTop - t * tierSpacing;
      data = labels.map((_, i) => baseY + normX(i) * 10 * effSlopePerUnit).slice(startIndex, endIndex);
      tierName = (state.charts.innovator.tierCustomNames[t] && state.charts.innovator.tierCustomNames[t].trim())
        ? state.charts.innovator.tierCustomNames[t].trim()
        : getInnovatorTierDefaultName(t, effectiveTiers);
    }

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
        font: FONTS.datalabels,
        backgroundColor: hexToRgba(c.bg, 0.75),
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        xAdjust: 0,
        yAdjust: -12,
        callout: { display: false },
      };
    }
  }

  // ── Event markers ───────────────────────────────────────────
  const showMarkers = dom.showEventMarkers?.checked ?? true;
  const eventColor = dom.eventMarkerColor?.value || state.userColors[0] || c.hero;

  if (showMarkers) {
    state.charts.timeline.events.forEach((evt, i) => {
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

      const xRef = (isCategoryAxis || isDateAxis) ? displayLabels[labelIndex] : labelIndex;

      tierAnnotations[`evtLine_${i}`] = {
        type: 'line',
        xMin: xRef,
        xMax: xRef,
        borderColor: hexToRgba(eventColor, 0.7),
        borderWidth: 2.5,
        borderDash: [8, 4],
        label: {
          display: true,
          content: wrappedLabel,
          position: 'end',
          backgroundColor: hexToRgba(eventColor, 0.18),
          color: eventColor,
          font: FONTS.annotation,
          padding: { x: 8, y: 4 },
          borderRadius: 6,
          yAdjust: yAdj,
        },
      };

      const firstDsData = datasets[0]?.data;
      if (firstDsData && firstDsData[labelIndex] != null) {
        tierAnnotations[`evtPoint_${i}`] = {
          type: 'point',
          xValue: xRef,
          yValue: firstDsData[labelIndex],
          backgroundColor: eventColor,
          borderColor: state.userBgColor || c.bg,
          borderWidth: 3,
          radius: 7,
        };
      }
    });
  }

  // ── Y-axis bounds ───────────────────────────────────────────
  // In data mode without explicit user bounds, let Chart.js auto-determine range
  let yMin, yMax;
  if (hasData) {
    yMin = userYMin ? yAxisMinVal : undefined;
    yMax = userYMax ? yAxisMaxVal : undefined;
  } else {
    yMin = yAxisMinVal ?? 0;
    yMax = yAxisMaxVal;
  }

  // ── Chart config ────────────────────────────────────────────
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
          top: dom.chartTitle?.value ? 8 : 4,
          bottom: dom.chartSource.value ? 24 : 8,
          left: 4,
          right: 20,
        },
      },
      plugins: {
        title: {
          display: !!dom.chartTitle?.value,
          text: dom.chartTitle?.value,
          color: c.text,
          font: FONTS.title,
          padding: { bottom: dom.chartSubtitle?.value ? 2 : 12 },
        },
        subtitle: {
          display: !!dom.chartSubtitle?.value,
          text: dom.chartSubtitle?.value,
          color: c.textSecondary,
          font: FONTS.subtitle,
          padding: { bottom: 16 },
        },
        legend: {
          ...getLegendBase(),
          position: dom.legendPosition?.value || 'top',
          align: 'end',
          labels: {
            ...getLegendBase().labels,
            boxWidth: 12,
            boxHeight: 3,
            usePointStyle: false,
          },
        },
        tooltip: {
          ...getTooltipBase(),
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (items) => (isDateAxis || isCategoryAxis) ? items[0]?.label : `Time: ${items[0]?.label}`,
            label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`,
          },
        },
        datalabels: { display: false },
        annotation: { annotations: tierAnnotations },
      },
      scales: {
        x: {
          type: isCategoryAxis || isDateAxis ? 'category' : 'linear',
          title: {
            display: true,
            text: xLabel,
            color: c.textSecondary,
            font: FONTS.axisTitleLg,
          },
          grid: { display: false },
          ticks: {
            color: c.textMuted,
            font: (isCategoryAxis || isDateAxis) ? FONTS.tick : FONTS.tickSmall,
            maxTicksLimit: (isCategoryAxis || isDateAxis) ? Math.min(labels.length, 15) : 6,
            maxRotation: (isCategoryAxis || isDateAxis) ? 45 : 0,
            autoSkip: true,
          },
          border: { display: false },
          ...((isCategoryAxis || isDateAxis) ? {} : { min: 0, max: 10 }),
        },
        y: {
          title: {
            display: true,
            text: yLabel,
            color: c.textSecondary,
            font: FONTS.axisTitleLg,
          },
          grid: { display: false },
          ticks: {
            color: c.textSecondary,
            font: FONTS.tick,
            padding: 8,
          },
          border: { display: false },
          ...(yMin != null ? { min: yMin } : {}),
          ...(yMax != null ? { max: yMax } : {}),
        },
      },
    },
    plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'innovator',
  label: 'Innovator',
  icon: '<svg viewBox="0 0 40 40" fill="none"><path d="M8 28L32 20" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M8 20L32 12" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M8 12L32 4" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M8 34C14 30 22 18 28 10L34 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dataHint: 'Progressive input — Col 1 = time/x-axis labels. Col 2 = Disruptive tech (required). Col 3 = Incumbent tech (optional, auto-generated if omitted). Col 4+ = Market tier lines (optional, auto-generated if omitted). 1 dataset = disruptive only. 2 = disruptive + incumbent. 3+ = disruptive + incumbent + custom tier lines.',
  dataExample: 'Period, Disruptive, Incumbent, High-end Market, Mid Market, Low-end Market\nQ1, 12, 75, 68, 45, 22\nQ2, 28, 78, 70, 47, 23\nQ3, 45, 81, 72, 49, 24\nQ4, 61, 84, 74, 51, 25\nQ5, 78, 86, 76, 53, 26\nQ6, 89, 88, 78, 55, 27',
  dataJsonHint: 'Progressive input — 1 dataset = disruptive curve only. 2 = disruptive + incumbent. 3+ = disruptive + incumbent + market tier lines. Omitted columns are auto-generated from formula settings.',
  dataJsonExample: '{\n  "labels": ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"],\n  "datasets": [\n    { "name": "Disruptive", "values": [12, 28, 45, 61, 78, 89] },\n    { "name": "Incumbent", "values": [75, 78, 81, 84, 86, 88] },\n    { "name": "High-end Market", "values": [68, 70, 72, 74, 76, 78] },\n    { "name": "Mid Market", "values": [45, 47, 49, 51, 53, 55] },\n    { "name": "Low-end Market", "values": [22, 23, 24, 25, 26, 27] }\n  ]\n}',
  isSelfManaged: true,
  builder: () => renderInnovatorsDilemmaChart(),
  capabilities: { pointSize: true, lineWidth: true },
});
