/** Theme color palettes — colors used for chart backgrounds, grid lines, text, and borders. */
export const PALETTE = {
  dark: {
    hero: '#F7931A',
    secondary: '#60A5FA',
    bg: '#111622',
    grid: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#2a3345',
  },
  light: {
    hero: '#F7931A',
    secondary: '#3B82F6',
    bg: '#FFFBF6',
    grid: '#E8DDD0',
    text: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E8DDD0',
  }
};

/** Default 5-color palette assigned to data series when no custom colors are set */
export const DEFAULT_COLORS = ['#F7931A', '#60A5FA', '#34D399', '#F472B6', '#A78BFA'];
/** Additional colors used when more than 5 data series need distinct colors */
export const EXTRA_COLORS = ['#FBBF24', '#FB923C', '#2DD4BF', '#818CF8', '#F87171'];

/** Named preset palettes the user can switch between via the UI */
export const PRESET_PALETTES = {
  default: ['#F7931A', '#60A5FA', '#34D399', '#F472B6', '#A78BFA'],
  warm: ['#F59E0B', '#EF4444', '#F97316', '#EC4899', '#D97706'],
  cool: ['#3B82F6', '#06B6D4', '#8B5CF6', '#14B8A6', '#6366F1'],
  neon: ['#00FF87', '#FF006E', '#FFBE0B', '#3A86FF', '#8338EC'],
  pastel: ['#FCA5A5', '#93C5FD', '#86EFAC', '#FDE68A', '#C4B5FD'],
  mono: ['#F8FAFC', '#CBD5E1', '#94A3B8', '#64748B', '#475569']
};

/** Semantic colors for positive (up) and negative (down) values, used in waterfall charts */
export const SEMANTIC = { up: '#34D399', down: '#F87171' };

/** Global configuration limits and thresholds */
export const CONFIG = {
  warnRowLimit: 10000,
  hardRowLimit: 50000,
  maxBars: 30,
  maxPieSlices: 12,
  maxDonutSlices: 10,
  eventProximityMs: 30 * 24 * 60 * 60 * 1000,
  debounceMs: 300,
};
