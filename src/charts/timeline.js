/** Timeline chart — line chart with vertical event marker annotations and date-aware positioning. */
import { CONFIG } from '../constants.js';
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, hexToRgba, wrapText } from '../utils.js';
import { getBaseChartOptions, FONTS } from './base-options.js';
import { getLineDatasetDefaults } from './line.js';
import { tryParseDate } from '../date-utils.js';
import { registerChart } from './registry.js';

/** Returns Chart.js config for a timeline chart with event marker annotations. */
export function buildTimelineChart(labels, datasets, c, colors, tension, displayData, useTimeAxis) {
  const opts = getBaseChartOptions();
  const eventColor = dom.eventMarkerColor?.value || state.userColors[0] || c.hero;
  const showMarkers = dom.showEventMarkers?.checked ?? true;

  const annotations = { ...opts.plugins.annotation?.annotations };

  if (showMarkers) {
    state.charts.timeline.events.forEach((evt, i) => {
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

      const xVal = useTimeAxis ? labels[labelIndex] : labelIndex;
      const yAdj = 10 + (i % 4) * 20;
      const wrappedLabel = wrapText(evt.label, 18);

      annotations[`line_${i}`] = {
        type: 'line',
        xMin: xVal,
        xMax: xVal,
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
          yAdjust: yAdj
        }
      };

      if (datasets[0]?.values[labelIndex] != null) {
        annotations[`point_${i}`] = {
          type: 'point',
          xValue: xVal,
          yValue: datasets[0].values[labelIndex],
          backgroundColor: eventColor,
          borderColor: state.userBgColor || c.bg,
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

registerChart({
  id: 'timeline',
  label: 'Timeline',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 30L14 18L22 24L34 10" stroke-linecap="round" stroke-linejoin="round"/><line x1="20" y1="8" x2="20" y2="32" stroke-dasharray="2 2" opacity="0.5"/><circle cx="20" cy="8" r="2" fill="currentColor"/></svg>',
  dataHint: 'First column = dates (auto-detected), second column = values. Add event markers via the Timeline Events settings panel.',
  dataExample: 'Month, Price\nJan 2024, 42000\nFeb 2024, 43500\nMar 2024, 51000',
  dataJsonHint: 'Provide date strings as labels and a single values dataset. Dates are auto-detected.',
  dataJsonExample: '{\n  "labels": ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024"],\n  "datasets": [\n    { "name": "Price", "values": [42000, 43500, 51000, 64000] }\n  ]\n}',
  isSelfManaged: false,
  builder: (ctx) => buildTimelineChart(ctx.timeLabels, ctx.datasets, ctx.c, ctx.colors, ctx.tension, ctx.displayData, ctx.useTimeAxis),
  capabilities: { curve: true, pointSize: true, lineWidth: true, grid: true, fillArea: true, spanGaps: true, highLow: true, legend: true, axisFormatting: true, dualAxis: true, lineStyle: true, zoom: true },
});
