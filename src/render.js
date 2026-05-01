import { state } from './state.js';
import { dom } from './dom.js';
import { safeFloat, showToast } from './utils.js';
import { getThemeColors, getMultiColors, isTimeXAxis, bgPlugin, sourceFooterPlugin, brandPlugin } from './charts/base-options.js';
import { applyZoom } from './data.js';
import { getChartDescriptor, validateChartData } from './charts/registry.js';

// Import all chart modules to trigger self-registration
import './charts/line.js';
import './charts/bar.js';
import './charts/pie.js';
import './charts/donut.js';
import './charts/area.js';
import './charts/radar.js';
import './charts/scatter.js';
import './charts/waterfall.js';
import './charts/combo.js';
import './charts/timeline.js';
import './charts/segmented.js';
import './charts/innovator.js';
import './charts/kano.js';
import './charts/dumbbell.js';
import './charts/bubble-compare.js';
import './charts/overlay.js';

/** Main chart render function */
export function renderChart() {
  // Always destroy previous chart before rendering any type
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  const desc = getChartDescriptor(state.currentChartType);

  // Self-managed charts handle their own rendering lifecycle
  if (desc?.isSelfManaged) {
    // Validate data for self-managed charts too (they skip render.js's normal path)
    const err = validateChartData(state.currentChartType, state.parsedData);
    if (err) {
      const isWarning = err.includes('ignored') || err.includes('Using') || err.includes('best with');
      showToast(err, isWarning ? 'warning' : 'error');
      if (!isWarning) return;
    }
    desc.builder();
    return;
  }

  if (!state.parsedData) {
    showToast('No data loaded. Paste or type data in the Data panel, then click Parse Data.', 'warning');
    return;
  }

  const displayData = applyZoom(state.parsedData);
  if (!displayData || !displayData.labels || displayData.labels.length === 0 || !displayData.datasets || displayData.datasets.length === 0) {
    showToast('Data has no numeric values to chart. Check the format hint above the data input for the expected layout.', 'warning');
    return;
  }

  // Validate data against chart requirements
  const err = validateChartData(state.currentChartType, displayData);
  if (err) {
    const isWarning = err.includes('ignored') || err.includes('Using') || err.includes('best with');
    showToast(err, isWarning ? 'warning' : 'error');
    if (!isWarning) return;
  }

  const c = getThemeColors();
  const colors = getMultiColors();
  const { labels, datasets } = displayData;
  const tension = safeFloat(dom.chartCurve.value, 0.35);

  const useTimeAxis = isTimeXAxis();
  let timeLabels = labels;

  if (useTimeAxis && displayData.dateObjects) {
    timeLabels = displayData.dateObjects.map(d => d ? d.toISOString() : null);
  }

  const ctx = { labels, timeLabels, datasets, c, colors, tension, useTimeAxis, displayData };

  if (!desc) return;
  const config = desc.builder(ctx);

  config.plugins = [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels];

  state.chartInstance = new Chart(dom.chartCanvas, config);
}
