import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba, wrapText } from '../utils.js';
import { getThemeColors, getMultiColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase } from './base-options.js';
import { tryParseDate } from '../date-utils.js';

export function getInnovatorTierDefaultName(t, total) {
  if (total === 1) return 'Market Demand';
  if (t === 0) return 'High-end Market';
  if (t === total - 1) return 'Low-end Market';
  return `Market Tier ${t + 1}`;
}

export function renderInnovatorTierNames() {
  if (!dom.innovatorTierNames) return;
  const tiers = safeInt(dom.innovatorTiers?.value, 3);

  if (state.innovatorTierCustomNames.length > tiers) {
    state.innovatorTierCustomNames.length = tiers;
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
    input.value = state.innovatorTierCustomNames[t] || '';
    input.placeholder = getInnovatorTierDefaultName(t, tiers);
    input.dataset.tierIndex = t;
    input.addEventListener('input', (e) => {
      state.innovatorTierCustomNames[parseInt(e.target.dataset.tierIndex)] = e.target.value;
      if (window.__debouncedRender) window.__debouncedRender();
    });
    row.appendChild(label);
    row.appendChild(input);
    dom.innovatorTierNames.appendChild(row);
  }
}

export function renderInnovatorsDilemmaChart() {
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

  state.currentInnovatorLabels = labels;

  const startRatio = state.zoomRange[0] / 100;
  const endRatio = state.zoomRange[1] / 100;
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

    const tierName = (state.innovatorTierCustomNames[t] && state.innovatorTierCustomNames[t].trim())
      ? state.innovatorTierCustomNames[t].trim()
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
        font: FONTS.datalabels,
        backgroundColor: hexToRgba(c.bg, 0.75),
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        xAdjust: 0,
        yAdjust: -12,
        callout: { display: false },
      };
    }
  }

  const showMarkers = dom.showEventMarkers?.checked ?? true;
  const eventColor = dom.eventMarkerColor?.value || state.userColors[0] || c.hero;

  if (showMarkers) {
    state.timelineEvents.forEach((evt, i) => {
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
          xValue: labelIndex,
          yValue: firstDsData[labelIndex],
          backgroundColor: eventColor,
          borderColor: state.userBgColor || c.bg,
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
            color: c.textSecondary,
            font: FONTS.legend,
            boxWidth: 12,
            boxHeight: 3,
            padding: 16,
            usePointStyle: false,
          },
        },
        tooltip: {
          ...getTooltipBase(),
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
            font: FONTS.axisTitleLg,
          },
          grid: { display: false },
          ticks: {
            color: isDateAxis ? c.textMuted : c.textMuted,
            font: isDateAxis ? FONTS.tick : FONTS.tickSmall,
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
            font: FONTS.axisTitleLg,
          },
          grid: { display: false },
          ticks: {
            color: c.textSecondary,
            font: FONTS.tick,
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

  state.chartInstance = new Chart(dom.chartCanvas, config);
}
