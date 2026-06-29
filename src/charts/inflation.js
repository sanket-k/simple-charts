/** Inflation chart (Value Track) — shows what an amount is worth over time at a
 *  given annual inflation rate. Self-managed: driven entirely by the settings-panel
 *  inputs (amount, rate, base/target year), no pasted data.
 *  Model: equivalent = amount × (1 + r) ^ (year − baseYear) */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba } from '../utils.js';
import { formatNumber } from '../format.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, ASPECT_RATIOS } from './base-options.js';
import { registerChart } from './registry.js';

/** Reads the inflation inputs into a normalized model object. */
function readModel() {
  const amount = safeFloat(dom.inflationAmount?.value, 1000);
  const rate = safeFloat(dom.inflationRate?.value, 3) / 100;
  const baseYear = safeInt(dom.inflationBaseYear?.value, 2000);
  let targetYear = safeInt(dom.inflationTargetYear?.value, 2024);
  return { amount: Math.max(0, amount), rate: Math.max(0, rate), baseYear, targetYear };
}

/** Equivalent value of `amount` (denominated in baseYear) expressed in `year`'s dollars. */
function equivalent(amount, rate, year, baseYear) {
  return amount * Math.pow(1 + rate, year - baseYear);
}

/** Self-managed render: builds the Value-Track line chart from the panel inputs. */
export function renderInflationChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  const { amount, rate, baseYear, targetYear } = readModel();
  const tension = safeFloat(dom.inflationTension?.value, 0.35);
  const showMarkers = dom.inflationMarkers?.checked !== false;

  // X range: from the earlier year to the later year, with ~20% context padding.
  const lo = Math.min(baseYear, targetYear);
  const hi = Math.max(baseYear, targetYear);
  const span = hi - lo;
  const pad = Math.max(2, Math.round(span * 0.2));
  const startYear = lo - pad;
  const endYear = hi + pad;

  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  const values = years.map((y) => equivalent(amount, rate, y, baseYear));
  const baseIdx = years.indexOf(baseYear);
  const targetIdx = years.indexOf(targetYear);
  const targetValue = equivalent(amount, rate, targetYear, baseYear);

  const c = getThemeColors();
  const isMark = (i) => showMarkers && (i === baseIdx || i === targetIdx);

  const fmtMoney = (v) => formatNumber(v, 'currency'); // compact, for axis ticks
  const currency = dom.currencyPrefix?.value || '$';
  const fmtFull = (v) => currency + (Math.abs(v) < 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US')); // full, for labels

  // Headline subtitle: "$1,000 in 2000 ≈ $2,033 in 2024"
  const headline = `${fmtFull(amount)} in ${baseYear} ≈ ${fmtFull(targetValue)} in ${targetYear} · ${(rate * 100).toFixed(1)}%/yr`;

  // Custom plugin: label the base & target points with their values.
  const inflationLabelPlugin = {
    id: 'inflationLabels',
    afterDatasetsDraw(chart) {
      if (!showMarkers) return;
      const meta = chart.getDatasetMeta(0);
      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = `${FONTS.datalabelsBold.weight} ${FONTS.datalabelsBold.size}px ${FONTS.datalabelsBold.family}`;

      const draw = (idx, text, color) => {
        const pt = meta.data[idx];
        if (!pt) return;
        ctx.fillStyle = color;
        ctx.fillText(text, pt.x, pt.y - 10);
      };
      if (baseIdx >= 0) draw(baseIdx, fmtFull(amount), c.hero);
      if (targetIdx >= 0 && targetIdx !== baseIdx) draw(targetIdx, fmtFull(targetValue), c.secondary);
      ctx.restore();
    },
  };

  const config = {
    type: 'line',
    plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, inflationLabelPlugin],
    data: {
      labels: years,
      datasets: [{
        label: 'Equivalent value',
        data: values,
        borderColor: c.hero,
        backgroundColor: hexToRgba(c.hero, 0.15),
        fill: true,
        tension,
        borderWidth: 2.5,
        pointRadius: values.map((_, i) => (isMark(i) ? 5 : 0)),
        pointHoverRadius: 6,
        pointBackgroundColor: values.map((_, i) => (i === targetIdx ? c.secondary : c.hero)),
        pointBorderColor: '#fff',
        pointBorderWidth: values.map((_, i) => (isMark(i) ? 2 : 0)),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: ASPECT_RATIOS.standard,
      animation: { duration: safeInt(dom.animationSpeed?.value, 600), easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          title: { display: true, text: 'Year', color: c.textSecondary, font: FONTS.axisTitle },
          grid: { color: c.grid, lineWidth: 0.5 },
          border: { display: false },
          ticks: { color: c.textSecondary, font: FONTS.tick, maxRotation: 0, autoSkipPadding: 16 },
        },
        y: {
          title: { display: true, text: 'Value', color: c.textSecondary, font: FONTS.axisTitle },
          grid: { color: c.grid, lineWidth: 0.5 },
          border: { display: false },
          ticks: { color: c.textSecondary, font: FONTS.tick, callback: (v) => fmtMoney(v) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...getTooltipBase(),
          callbacks: {
            title(items) { return `Year ${items[0].label}`; },
            label(item) { return ` Equivalent: ${fmtFull(item.parsed.y)}`; },
          },
        },
        datalabels: { display: false },
        title: {
          display: !!dom.chartTitle?.value,
          text: dom.chartTitle?.value || '',
          color: c.text,
          font: FONTS.title,
          padding: { bottom: 8 },
        },
        subtitle: {
          display: true,
          text: dom.chartSubtitle?.value || headline,
          color: c.textSecondary,
          font: FONTS.subtitle,
          padding: { bottom: 4 },
        },
      },
      layout: {
        padding: {
          top: dom.chartTitle?.value ? 28 : 24,
          bottom: dom.chartSource?.value ? 24 : 8,
          left: 4,
          right: 8,
        },
      },
    },
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'inflation',
  label: 'Inflation',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 30 L16 20 L22 24 L34 10" /><path d="M27 10 L34 10 L34 17" /><circle cx="16" cy="20" r="2.4" fill="currentColor" stroke="none"/><circle cx="22" cy="24" r="2.4" fill="currentColor" stroke="none"/></svg>',
  dataHint: 'The Inflation chart is driven by its own controls (amount, rate, years) — no data input needed. Adjust the values in the Inflation panel on the left.',
  dataExample: 'No data required. Use the Amount, Rate, Base Year, and Target Year controls.',
  isSelfManaged: true,
  builder: () => renderInflationChart(),
  capabilities: {},
});
