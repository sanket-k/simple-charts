import { state } from './state.js';
import { dom } from './dom.js';
import { safeFloat } from './utils.js';
import { getThemeColors, getMultiColors, isTimeXAxis, bgPlugin, sourceFooterPlugin, brandPlugin } from './charts/base-options.js';
import { applyZoom } from './data.js';
import { buildLineChart } from './charts/line.js';
import { buildBarChart } from './charts/bar.js';
import { buildPieChart } from './charts/pie.js';
import { buildDonutChart } from './charts/donut.js';
import { buildAreaChart } from './charts/area.js';
import { buildRadarChart } from './charts/radar.js';
import { buildScatterChart } from './charts/scatter.js';
import { buildWaterfallChart } from './charts/waterfall.js';
import { buildComboChart } from './charts/combo.js';
import { buildTimelineChart } from './charts/timeline.js';
import { renderSegmentedChart } from './charts/segmented.js';
import { renderInnovatorsDilemmaChart } from './charts/innovator.js';

/** Main chart render function */
export function renderChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  if (state.currentChartType === 'innovator') {
    renderInnovatorsDilemmaChart();
    return;
  }

  if (state.currentChartType === 'segmented') {
    renderSegmentedChart();
    return;
  }

  if (!state.parsedData) return;

  const displayData = applyZoom(state.parsedData);
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

  switch (state.currentChartType) {
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
    case 'combo':
      config = buildComboChart(timeLabels, datasets, c, colors, tension, useTimeAxis, displayData);
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

  state.chartInstance = new Chart(dom.chartCanvas, config);
}
