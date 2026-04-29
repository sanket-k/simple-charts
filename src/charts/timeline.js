import { CONFIG } from '../constants.js';
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, hexToRgba, wrapText } from '../utils.js';
import { getBaseChartOptions, FONTS } from './base-options.js';
import { getLineDatasetDefaults } from './line.js';
import { tryParseDate } from '../date-utils.js';

export function buildTimelineChart(labels, datasets, c, colors, tension, displayData, useTimeAxis) {
  const opts = getBaseChartOptions();
  const eventColor = dom.eventMarkerColor?.value || state.userColors[0] || c.hero;
  const showMarkers = dom.showEventMarkers?.checked ?? true;

  const annotations = { ...opts.plugins.annotation?.annotations };

  if (showMarkers) {
    state.timelineEvents.forEach((evt, i) => {
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
