/** Chart type registry — single source of truth for all chart descriptors.
 *  Each chart module registers itself via registerChart() at import time. */

const registry = new Map();

/** Default capability values (all false). Descriptors only override what's true. */
const DEFAULT_CAPABILITIES = {
  grid: false,
  curve: false,
  pointSize: false,
  lineWidth: false,
  fillArea: false,
  spanGaps: false,
  highLow: false,
  barRadius: false,
  legend: false,
  axisFormatting: false,
  dualAxis: false,
  lineStyle: false,
  zoom: false,
};

export function registerChart(descriptor) {
  registry.set(descriptor.id, descriptor);
}

export function getChartDescriptor(id) {
  return registry.get(id);
}

export function getAllChartDescriptors() {
  return [...registry.values()];
}

export function getCapabilities(id) {
  const caps = registry.get(id)?.capabilities ?? {};
  return { ...DEFAULT_CAPABILITIES, ...caps };
}

/** Validate parsed data against chart requirements. Returns error message or null. */
export function validateChartData(chartId, parsedData) {
  if (!parsedData || !parsedData.datasets || parsedData.datasets.length === 0) {
    return 'No data to render. Paste or type data in the Data panel and click Parse Data.';
  }
  if (!parsedData.labels || parsedData.labels.length === 0) {
    return 'No labels found. Ensure your data has a header row with at least one label column.';
  }

  const ds = parsedData.datasets;
  const numDatasets = ds.length;
  const numLabels = parsedData.labels.length;
  const chartName = registry.get(chartId)?.label ?? chartId;

  // Check all datasets for numeric values
  const allEmpty = ds.every(d => !d.values || d.values.every(v => v === null || v === undefined || isNaN(v)));
  if (allEmpty) {
    return `No valid numeric data found. ${chartName} requires numbers in the value columns.`;
  }

  switch (chartId) {
    case 'pie':
    case 'donut': {
      const max = chartId === 'pie' ? 12 : 10;
      if (numLabels > max) {
        return null; // Silently groups into "Other" — acceptable behavior
      }
      if (numDatasets > 1) {
        return `${chartName} uses only the first data column. Extra columns (${numDatasets - 1}) will be ignored.`;
      }
      break;
    }
    case 'scatter': {
      const hasNumeric = ds.some(d => d.values && d.values.some(v => v !== null && !isNaN(v)));
      if (!hasNumeric) {
        return 'Scatter requires numeric X and Y values. Labels must be numbers, not text.';
      }
      break;
    }
    case 'waterfall': {
      if (numDatasets > 1) {
        return 'Waterfall uses only the first data column. Extra columns will be ignored.';
      }
      break;
    }
    case 'dumbbell':
    case 'bubble-compare':
    case 'overlay': {
      if (numDatasets < 2) {
        return `${chartName} requires exactly 2 data series (Before and After). Currently only ${numDatasets} series found. Add a second value column.`;
      }
      if (numDatasets > 2) {
        return `${chartName} requires exactly 2 data series. Using the first 2 columns only.`;
      }
      // Check for positive values (log scale)
      const hasNonPositive = ds.some(d => d.values && d.values.some(v => v !== null && v <= 0));
      if (hasNonPositive) {
        return `${chartName} uses a logarithmic scale — all values must be positive (> 0). Found zero or negative values.`;
      }
      break;
    }
    case 'kano': {
      if (numDatasets < 2) {
        return 'Kano requires at least 2 data columns: Implementation cost and User satisfaction.';
      }
      break;
    }
    case 'segmented': {
      if (numDatasets < 2) {
        return 'Segmented requires at least 2 segment columns. Add more value columns for each segment.';
      }
      break;
    }
    case 'combo': {
      if (numDatasets < 2) {
        return 'Combo works best with 2+ data series (one as bars, one as lines). Currently only 1 series found.';
      }
      break;
    }
    case 'radar': {
      if (numLabels < 3) {
        return 'Radar needs at least 3 metric rows to form a polygon. Add more data rows.';
      }
      break;
    }
    default:
      break;
  }

  return null; // No error
}
