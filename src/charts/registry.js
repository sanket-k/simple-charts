/** Chart type registry — single source of truth for all chart descriptors.
 *  Each chart module registers itself via registerChart() at import time. */

const registry = new Map();

/** Intent-based categories for organizing the chart catalog. */
export const CHART_CATEGORIES = [
  { id: 'trend', label: 'Trend & Time' },
  { id: 'compare', label: 'Compare & Rank' },
  { id: 'part', label: 'Part of Whole' },
  { id: 'rel', label: 'XY & Multi-Axis' },
  { id: 'flow', label: 'Flow & Change' },
  { id: 'strategy', label: 'Frameworks & Calc' },
];

const CHART_CATALOG_META = {
  line: {
    category: 'trend',
    isCore: true,
    summary: 'Trends over continuous time or intervals',
    guide: {
      bestFor: [
        'Trends over continuous time (days, months, years)',
        'Comparing 2–4 metrics on the same timeline',
      ],
      avoid: 'Discrete unordered categories — use V-Bar or H-Bar instead.',
      columns: [
        { col: 'Col 1', role: 'Date / Label' },
        { col: 'Col 2+', role: 'Line Series' },
      ],
    },
  },
  bar: {
    category: 'compare',
    isCore: true,
    summary: 'Horizontal bars for ranking & long labels',
    guide: {
      bestFor: [
        'Ranking categories & leaderboards',
        'Long category names that wrap poorly under vertical columns',
      ],
      avoid: 'Continuous time trends — use Line or Area instead.',
      columns: [
        { col: 'Col 1', role: 'Category' },
        { col: 'Col 2+', role: 'Bar Series' },
      ],
    },
  },
  vbar: {
    category: 'compare',
    isCore: true,
    summary: 'Vertical columns for comparing categories',
    guide: {
      bestFor: [
        'Comparing 3–12 categories side-by-side',
        'Short labels across quarters, cohorts, or groups',
      ],
      avoid: 'Long label text (use H-Bar) or >30 bars.',
      columns: [
        { col: 'Col 1', role: 'Category' },
        { col: 'Col 2+', role: 'Bar Series' },
      ],
    },
  },
  pie: {
    category: 'part',
    isCore: true,
    summary: 'Share of whole (auto-groups >12 slices)',
    guide: {
      bestFor: [
        'Quick share-of-whole breakdowns (≤6 main slices)',
        'Highlighting one dominant slice against the rest',
      ],
      avoid: 'Comparing close values or >12 slices — use H-Bar instead.',
      columns: [
        { col: 'Col 1', role: 'Slice Name' },
        { col: 'Col 2', role: 'Share Value' },
      ],
    },
  },
  donut: {
    category: 'part',
    summary: 'Clean part-of-whole with center cutout',
    guide: {
      bestFor: [
        'Clean part-of-whole share with modern center cutout',
        'Budget, market share, or portfolio composition (≤10 slices)',
      ],
      avoid: 'Multiple series or precise value comparisons — use Segmented or H-Bar.',
      columns: [
        { col: 'Col 1', role: 'Slice Name' },
        { col: 'Col 2', role: 'Share Value' },
      ],
    },
  },
  area: {
    category: 'trend',
    isCore: true,
    summary: 'Stacked volume & composition over time',
    guide: {
      bestFor: [
        'Cumulative volume & stacked composition over time',
        'Showing how sub-segments grow into a total',
      ],
      avoid: 'Non-additive metrics (like % rates) — use Line instead.',
      columns: [
        { col: 'Col 1', role: 'Date / Period' },
        { col: 'Col 2+', role: 'Stacked Series' },
      ],
    },
  },
  radar: {
    category: 'rel',
    summary: 'Compare multi-metric profiles on spokes',
    guide: {
      bestFor: [
        'Multi-dimensional profile comparisons (e.g. Us vs. Competitor)',
        'Scoring 3–8 balanced attributes on one polygon',
      ],
      avoid: 'Fewer than 3 rows or metrics with wildly different units.',
      columns: [
        { col: 'Col 1', role: 'Metric Axis (≥3)' },
        { col: 'Col 2+', role: 'Polygon Series' },
      ],
    },
  },
  scatter: {
    category: 'rel',
    summary: 'Correlation & outliers across X / Y values',
    guide: {
      bestFor: [
        'Spotting correlation, clusters, and outliers across X & Y',
        'Continuous numeric pairs (e.g. spend vs. conversion)',
      ],
      avoid: 'Text category labels — X values must be numeric.',
      columns: [
        { col: 'Col 1', role: 'X (Numeric)' },
        { col: 'Col 2', role: 'Y (Numeric)' },
        { col: 'Col 3+', role: 'Extra Series' },
      ],
    },
  },
  waterfall: {
    category: 'flow',
    summary: 'Step-by-step +/- variance to cumulative total',
    guide: {
      bestFor: [
        'Income statements (Revenue → COGS → OpEx → Net Profit)',
        'Step-by-step +/- bridges explaining net change',
      ],
      avoid: 'Independent totals with no running sum — use V-Bar.',
      columns: [
        { col: 'Col 1', role: 'Step Label' },
        { col: 'Col 2', role: '+/- Value' },
      ],
    },
  },
  combo: {
    category: 'trend',
    isCore: true,
    summary: 'Bars + trend line with optional dual axis',
    guide: {
      bestFor: [
        'Pairing volume (bars) with rate or % margin (line)',
        'Comparing two different units via Dual Y-Axis',
      ],
      avoid: 'Single-series data — use V-Bar or Line instead.',
      columns: [
        { col: 'Col 1', role: 'Period / Label' },
        { col: 'Col 2', role: 'Bar Series' },
        { col: 'Col 3+', role: 'Line Series' },
      ],
    },
  },
  timeline: {
    category: 'trend',
    summary: 'Line trend with vertical milestone markers',
    guide: {
      bestFor: [
        'Price or metric trends annotated with dated milestones',
        'Storytelling around launches, forks, or policy dates',
      ],
      avoid: 'Data without dates — use Line instead.',
      columns: [
        { col: 'Col 1', role: 'Date' },
        { col: 'Col 2', role: 'Metric Value' },
      ],
    },
  },
  segmented: {
    category: 'part',
    summary: 'Single stacked bar (100% or unit values)',
    guide: {
      bestFor: [
        '100% composition or unit share in a single stacked bar',
        'Before/after share shifts across 1–4 groups (e.g. 2020 vs. 2025)',
      ],
      avoid: 'More than ~6 tiny segments — use H-Bar for clarity.',
      columns: [
        { col: 'Col 1', role: 'Group Name' },
        { col: 'Col 2+', role: 'Segment Values' },
      ],
    },
  },
  innovator: {
    category: 'strategy',
    summary: 'Christensen sustaining vs disruptive curve',
    guide: {
      bestFor: [
        'Christensen disruption decks (disruptive curve crossing market tiers)',
        'Progressive input: 1 column auto-generates incumbent & tiers',
      ],
      avoid: 'Standard KPI time-series without market tiers — use Line.',
      columns: [
        { col: 'Col 1', role: 'Time' },
        { col: 'Col 2', role: 'Disruptive' },
        { col: 'Col 3+', role: 'Incumbent / Tiers (opt.)' },
      ],
    },
  },
  kano: {
    category: 'strategy',
    summary: 'Feature prioritization (Must-be vs Delight)',
    guide: {
      bestFor: [
        'Product roadmap prioritization (Cost vs. Satisfaction)',
        'Separating Must-be table stakes from Delighters',
      ],
      avoid: 'Generic XY numeric data — use Scatter instead.',
      columns: [
        { col: 'Col 1', role: 'Feature' },
        { col: 'Col 2', role: 'Cost (1–10)' },
        { col: 'Col 3', role: 'Sat (-3–10)' },
      ],
    },
  },
  dumbbell: {
    category: 'compare',
    summary: 'Before/after gap with xN improvement pill',
    guide: {
      bestFor: [
        'Dramatic Before → After leaps spanning 10×–1000×',
        'Highlighting relative ×N improvement multipliers',
      ],
      avoid: 'Zero or negative values (log scale requires > 0) — use H-Bar or Waterfall.',
      columns: [
        { col: 'Col 1', role: 'Metric' },
        { col: 'Col 2', role: 'Before (>0)' },
        { col: 'Col 3', role: 'After (>0)' },
      ],
    },
  },
  'bubble-compare': {
    category: 'compare',
    summary: 'Area-proportional before/after circles',
    guide: {
      bestFor: [
        'Visualizing huge area-proportional before/after scale gaps',
        'Executive storytelling where circle size conveys magnitude',
      ],
      avoid: 'Zero/negative values (> 0 required) or precise reading — use Dumbbell.',
      columns: [
        { col: 'Col 1', role: 'Metric' },
        { col: 'Col 2', role: 'Before (>0)' },
        { col: 'Col 3', role: 'After (>0)' },
      ],
    },
  },
  overlay: {
    category: 'compare',
    summary: 'Log-scale foreground bar over faded baseline',
    guide: {
      bestFor: [
        'Foreground vs. baseline bar layered on one track',
        'Compact log-scale comparison with ×N ratio badges',
      ],
      avoid: 'Values ≤ 0 (> 0 required) or >2 data columns — use Dual-Bar or H-Bar.',
      columns: [
        { col: 'Col 1', role: 'Metric' },
        { col: 'Col 2', role: 'Foreground (>0)' },
        { col: 'Col 3', role: 'Baseline (>0)' },
      ],
    },
  },
  'dual-bar': {
    category: 'compare',
    isNew: true,
    summary: 'Concentric current vs target progress bars',
    guide: {
      bestFor: [
        'Concentric Current vs. Target progress (OKRs, quotas, budgets)',
        'Showing % attainment when all rows share the same unit',
      ],
      avoid: 'Inner values larger than target or mismatched row units — use H-Bar.',
      columns: [
        { col: 'Col 1', role: 'Category' },
        { col: 'Col 2', role: 'Target (Outer)' },
        { col: 'Col 3', role: 'Current (Inner)' },
      ],
    },
  },
  inflation: {
    category: 'strategy',
    isNew: true,
    summary: 'Purchasing power calculator across years',
    guide: {
      bestFor: [
        'Interactive purchasing-power erosion across years',
        'Driven by left-panel Amount/Rate/Year sliders (no CSV needed)',
      ],
      avoid: 'Plotting your own custom spreadsheet data — use Line or Area.',
      columns: [
        { col: 'Inputs', role: 'Amount, Rate % & Years (Left Panel)' },
      ],
    },
  },
};

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
  const meta = CHART_CATALOG_META[descriptor.id] || {};
  registry.set(descriptor.id, {
    category: descriptor.category || meta.category || 'compare',
    summary: descriptor.summary || meta.summary || '',
    isCore: descriptor.isCore ?? meta.isCore ?? false,
    isNew: descriptor.isNew ?? meta.isNew ?? false,
    guide: descriptor.guide || meta.guide || null,
    ...descriptor,
  });
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
    case 'dual-bar': {
      if (numDatasets < 2) {
        return `${chartName} requires exactly 2 data series (Target and Current). Currently only ${numDatasets} series found. Add a second value column.`;
      }
      if (numDatasets > 2) {
        return `${chartName} uses the first 2 columns only (outer and inner bars). Extra columns will be ignored.`;
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
      // Single dataset = single group of segments (valid); 2+ datasets = multi-group comparison
      if (numDatasets < 1) {
        return 'Segmented needs at least 1 value column.';
      }
      break;
    }
    case 'combo': {
      if (numDatasets < 2) {
        return 'Combo works best with 2+ data series (one as bars, one as lines). Currently only 1 series found.';
      }
      break;
    }
    case 'innovator': {
      if (numLabels < 2) {
        return 'Innovator needs at least 2 time points to plot curves.';
      }
      if (numDatasets === 1) {
        return 'Using 1 dataset for disruptive curve. Incumbent and tiers will be auto-generated.';
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
