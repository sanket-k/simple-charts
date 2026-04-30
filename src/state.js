import { DEFAULT_COLORS } from './constants.js';

/** Single mutable state object shared across all modules */
export const state = {
  // Core state
  currentTheme: 'light',
  currentChartType: 'line',
  chartInstance: null,
  parsedData: null,
  rawParsedData: null,
  userColors: [...DEFAULT_COLORS],
  userBgColor: null,
  userGridColor: null,
  brandLogoUrl: null,
  brandLogoImg: null,
  dualAxisEnabled: false,
  axisAssignments: [],
  axisNames: {},
  datasetChartTypes: [],
  datasetLineStyles: [],
  zoomRange: [0, 100],
  dataFormat: 'csv',
  seriesCount: 1,
  chartDataStore: {},
  previousChartType: null,

  // Per-chart namespaced state
  charts: {
    innovator: {
      tierCustomNames: [],
      currentLabels: [],
    },
    kano: {
      features: [],
    },
    segmented: {
      segments: [],
      groups: [],
      activeGroupIndex: 0,
    },
    timeline: {
      events: [],
    },
  },
};
