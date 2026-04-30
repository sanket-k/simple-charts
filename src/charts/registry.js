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
