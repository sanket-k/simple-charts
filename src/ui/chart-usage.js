/** Chart Usage Tracker — weighted usage scoring, 30-day recency decay,
 *  and unseen-chart tracking persisted separately from Brand Kit exports. */
import { state } from '../state.js';

const USAGE_STORAGE_KEY = 'simple_charts_chart_usage_v1';
const USAGE_THRESHOLD = 3.0;
const HALF_LIFE_DAYS = 30;
const MS_PER_DAY = 86_400_000;

const SIGNAL_WEIGHTS = {
  browse: 0.25,
  edit: 1.0,
  export: 3.0,
};

let usageStore = null;
let editRecordedForVisit = false;

function createEmptyStore() {
  return {
    version: 1,
    lastDecayAt: Date.now(),
    scores: {},
    seenIds: [],
  };
}

function loadStore() {
  if (usageStore) return usageStore;
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        usageStore = {
          version: 1,
          lastDecayAt: typeof parsed.lastDecayAt === 'number' ? parsed.lastDecayAt : Date.now(),
          scores: (parsed.scores && typeof parsed.scores === 'object') ? { ...parsed.scores } : {},
          seenIds: Array.isArray(parsed.seenIds) ? [...parsed.seenIds] : [],
        };
        applyDailyDecay(usageStore);
        return usageStore;
      }
    }
  } catch (err) {
    console.warn('Unable to read chart usage stats:', err);
  }
  usageStore = createEmptyStore();
  return usageStore;
}

function saveStore() {
  if (!usageStore) return;
  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usageStore));
  } catch (err) {
    console.warn('Unable to persist chart usage stats:', err);
  }
}

function applyDailyDecay(store) {
  const now = Date.now();
  const elapsedDays = (now - store.lastDecayAt) / MS_PER_DAY;
  if (elapsedDays < 1) return;

  const factor = Math.pow(0.5, elapsedDays / HALF_LIFE_DAYS);
  Object.keys(store.scores).forEach(id => {
    const decayed = Number((store.scores[id] * factor).toFixed(2));
    if (decayed < 0.05) {
      delete store.scores[id];
    } else {
      store.scores[id] = decayed;
    }
  });
  store.lastDecayAt = now;
  saveStore();
}

/** Resets per-visit edit throttling when the user switches chart types. */
export function resetVisitEditGuard() {
  editRecordedForVisit = false;
}

/** Records a weighted usage signal ('browse' | 'edit' | 'export') for a chart type.
 *  Returns true if the top-3 Most Used ranking may have changed. */
export function recordChartUsage(chartId, signal = 'browse') {
  if (!chartId) return false;
  const weight = SIGNAL_WEIGHTS[signal];
  if (!weight) return false;

  if (signal === 'edit') {
    if (editRecordedForVisit) return false;
    editRecordedForVisit = true;
  }

  const store = loadStore();
  const prevHasUsage = Object.keys(store.scores).length > 0;
  const prevTop = getTopUsedChartIds(3).join(',');
  store.scores[chartId] = Number(((store.scores[chartId] || 0) + weight).toFixed(2));
  saveStore();

  const nextTop = getTopUsedChartIds(3).join(',');
  return !prevHasUsage || (signal !== 'browse' && prevTop !== nextTop);
}

/** Records a weighted usage action and refreshes the chart type grid when rankings or visibility change. */
export function trackChartAction(chartId, signal = 'edit') {
  if (recordChartUsage(chartId, signal) && window.__refreshChartTypeGrid) {
    window.__refreshChartTypeGrid();
  }
}

/** Returns up to `limit` chart IDs meeting the minimum usage threshold, sorted by score desc. */
export function getTopUsedChartIds(limit = 3) {
  if (!state.smartChartTop) return [];
  const store = loadStore();
  return Object.entries(store.scores)
    .filter(([, score]) => typeof score === 'number' && score >= USAGE_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/** Returns true if any tracked usage exists (for showing Reset control). */
export function hasRecordedUsage() {
  const store = loadStore();
  return Object.keys(store.scores).length > 0;
}

/** Marks a new chart ID as seen so its New badge clears. */
export function markChartSeen(chartId) {
  if (!chartId) return false;
  const store = loadStore();
  if (store.seenIds.includes(chartId)) return false;
  store.seenIds.push(chartId);
  saveStore();
  return true;
}

/** Returns whether a descriptor's New badge is still unseen by the user. */
export function isChartUnseenNew(descriptor) {
  if (!descriptor?.isNew) return false;
  const store = loadStore();
  return !store.seenIds.includes(descriptor.id);
}

/** Clears all stored chart usage scores (preserving seenIds). */
export function resetChartUsage() {
  const store = loadStore();
  store.scores = {};
  store.lastDecayAt = Date.now();
  saveStore();
}
