/** Saved Graphs Library — localStorage persistence, sector auto-detection,
 *  Option A (inline 4th Data tab) and Option C (2-pane Spotlight preview modal). */
import { state } from '../state.js';
import { dom, colorPairs, $, $$ } from '../dom.js';
import { escapeHtml, showToast } from '../utils.js';
import { parseInputText } from '../data.js';
import { getAllChartDescriptors, getChartDescriptor } from '../charts/registry.js';
import { renderGroupTabs, renderSegmentList } from '../charts/segmented.js';
import { renderInnovatorTierNames } from '../charts/innovator.js';
import { renderTimelineEvents } from './timeline-ui.js';
import { renderLineStyleControls } from './line-style-ui.js';
import { updateDataFormatTip } from './settings.js';
import { setSuppressProfileAutoSave } from './user-profile.js';

const STORAGE_KEY = 'simple_charts_saved_graphs_v1';

/** Default preset sectors shown in suggestions alongside user-created sectors */
const DEFAULT_SECTORS = ['Finance', 'Crypto', 'Macro', 'Product', 'Tech / AI', 'General'];

/** Keyword dictionary for automatic sector classification */
const SECTOR_KEYWORDS = {
  Crypto: [
    'btc', 'bitcoin', 'eth', 'ethereum', 'solana', 'sol', 'defi', 'tvl', 'token',
    'chain', 'l1', 'l2', 'halving', 'nft', 'nfts', 'stablecoin', 'stablecoins',
    'glassnode', 'defillama', 'crypto', 'web3', 'dex', 'wallet', 'staking', 'sui', 'base',
  ],
  Finance: [
    'revenue', 'cost', 'costs', 'cogs', 'income', 'ebitda', 'arr', 'mrr', 'margin',
    'spend', 'profit', 'salary', 'salaries', 'budget', 'valuation', 'vc', 'funding',
    'finance', 'sales', 'erp', 'roi', 'pnl', 'p&l', 'cash', 'dividend', 'capex', 'opex',
  ],
  Macro: [
    'cpi', 'inflation', 'gdp', 'fed', 'interest rate', 'rates', 'yield', 'treasury',
    'unemployment', 'm2', 'purchasing power', 'bls', 'fred', 'macro', 'economy',
    'recession', 'tariff', 'debt', 'housing', 'forex', 'import', 'export',
  ],
  Product: [
    'users', 'dau', 'mau', 'signup', 'signups', 'funnel', 'churn', 'retention',
    'conversion', 'cohort', 'feature', 'kano', 'ux', 'support', 'nps', 'onboarding',
    'engagement', 'adoption', 'satisfaction', 'session', 'clicks', 'active users',
  ],
  'Tech / AI': [
    'gpu', 'cpu', 'latency', 'throughput', 'cloud', 'aws', 'infra', 'model', 'llm',
    'ai', 'inference', 'benchmark', 'speed', 'accuracy', 'scale', 'tokens', 'uptime',
    'api', 'server', 'compute', 'training', 'engineering',
  ],
};

let savedGraphs = [];
let activeGraphId = null;
let selectedModalGraphId = null;
let activeCategory = 'All';

// ═══════════════════════════════════════════
//  Storage & Serialization Helpers
// ═══════════════════════════════════════════

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedGraphs));
  } catch (e) {
    showToast('Storage quota exceeded — export library as JSON to free space', 'warning');
  }
}

/** Auto-detects the most likely sector/category from current chart text & headers. */
export function detectSector() {
  const parts = [
    dom.chartTitle?.value || '',
    dom.chartSubtitle?.value || '',
    dom.chartSource?.value || '',
    dom.dataTextarea?.value?.slice(0, 600) || '',
  ];

  if (state.rawParsedData) {
    if (Array.isArray(state.rawParsedData.datasets)) {
      parts.push(state.rawParsedData.datasets.map(d => d.name).join(' '));
    }
    if (Array.isArray(state.rawParsedData.labels)) {
      parts.push(state.rawParsedData.labels.slice(0, 20).join(' '));
    }
  }

  const haystack = parts.join(' ').toLowerCase();
  const scores = {};

  // Chart-type domain priors
  if (state.currentChartType === 'inflation') scores.Macro = (scores.Macro || 0) + 4;
  if (state.currentChartType === 'waterfall') scores.Finance = (scores.Finance || 0) + 4;
  if (state.currentChartType === 'kano') scores.Product = (scores.Product || 0) + 4;
  if (state.currentChartType === 'innovator') scores['Tech / AI'] = (scores['Tech / AI'] || 0) + 4;

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    let score = scores[sector] || 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(haystack)) score += 2;
    }
    if (score > 0) scores[sector] = score;
  }

  if (Object.keys(scores).length === 0) {
    return { sector: 'General', autoDetected: false };
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return { sector: best, autoDetected: true };
}

/** Generates a sensible default name from the chart title, subtitle, or dataset names. */
function suggestGraphName() {
  const title = dom.chartTitle?.value.trim();
  if (title) return title;
  const subtitle = dom.chartSubtitle?.value.trim();
  if (subtitle) return subtitle;
  const dsNames = state.rawParsedData?.datasets?.map(d => d.name).filter(Boolean) || [];
  if (dsNames.length > 0 && dsNames.length <= 3) {
    return dsNames.join(' vs ');
  }
  const desc = getChartDescriptor(state.currentChartType);
  return `${desc ? desc.label : state.currentChartType} Snapshot`;
}

/** Transient Saved-Graphs UI inputs excluded when scanning chart control inputs */
const EXCLUDED_INPUT_IDS = new Set([
  'dataTextarea',
  'saveNameInput',
  'saveCategoryInput',
  'saveDateInput',
  'savedSearchInput',
  'savedTypeFilter',
  'savedSortSelect',
  'modalSavedSearch',
  'modalSavedTypeFilter',
  'modalSavedSort',
  'modalEditNameInput',
  'modalEditCategoryInput',
  'modalEditDateInput',
  'csvFileInput',
  'brandLogoFile',
  'importSavedLibInput',
]);

/** Auto-scans all DOM control inputs (<input>, <select>, <textarea> with an id)
 *  across left panel, right panel, and topbar (labels, formats, axis, branding, colors, export). */
function captureAllControlInputs() {
  const inputs = {};
  $$('.panel-left [id], .panel-right [id], .topbar [id]').forEach(el => {
    const tag = el.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
    if (!el.id || EXCLUDED_INPUT_IDS.has(el.id) || el.type === 'file') return;
    if (el.type === 'checkbox' || el.type === 'radio') {
      inputs[el.id] = { type: el.type, checked: el.checked };
    } else {
      inputs[el.id] = { value: el.value };
    }
  });
  return inputs;
}

/** Restores all saved DOM control inputs and syncs their paired value display spans. */
function restoreAllControlInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') return;
  for (const [id, entry] of Object.entries(inputs)) {
    if (EXCLUDED_INPUT_IDS.has(id)) continue;
    const el = document.getElementById(id);
    if (!el || entry == null) continue;
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (typeof entry.checked === 'boolean') el.checked = entry.checked;
    } else if (entry.value !== undefined) {
      el.value = entry.value;
    }
    // Sync paired `<id>Value` display badge if present
    const valSpan = document.getElementById(`${id}Value`);
    if (valSpan && entry.value !== undefined) {
      if (id === 'xAxisRotation') valSpan.textContent = `${entry.value}\u00B0`;
      else if (id === 'segmentedMinLabelPct' || id === 'dualBarInnerWidth' || id === 'dualBarOuterOpacity') {
        valSpan.textContent = `${entry.value}%`;
      } else {
        valSpan.textContent = entry.value;
      }
    }
  }
}

/** Captures mutable state (colors, theme, branding logo, dual-axis, line styles, per-chart state). */
function captureFullChartState() {
  return {
    currentTheme: state.currentTheme,
    userColors: [...(state.userColors || [])],
    userBgColor: state.userBgColor,
    userGridColor: state.userGridColor,
    brandLogoDataUrl: state.brandLogoUrl && state.brandLogoUrl.startsWith('data:') ? state.brandLogoUrl : null,
    brandLogoSvgCode: dom.brandLogoSvgInput?.value || '',
    dualAxisEnabled: Boolean(state.dualAxisEnabled),
    axisAssignments: [...(state.axisAssignments || [])],
    axisNames: { ...(state.axisNames || {}) },
    axisFormats: { ...(state.axisFormats || { left: null, right: null }) },
    datasetChartTypes: [...(state.datasetChartTypes || [])],
    datasetLineStyles: [...(state.datasetLineStyles || [])],
    zoomRange: [...(state.zoomRange || [0, 100])],
    timelineEvents: JSON.parse(JSON.stringify(state.charts.timeline?.events || [])),
    segmentedGroups: JSON.parse(JSON.stringify(state.charts.segmented?.groups || [])),
    segmentedSegments: JSON.parse(JSON.stringify(state.charts.segmented?.segments || [])),
    activeGroupIndex: state.charts.segmented?.activeGroupIndex || 0,
    innovatorTierNames: [...(state.charts.innovator?.tierCustomNames || [])],
  };
}

const DEFAULT_BRAND_LOGO_SVG = `<svg width="16" height="16" viewBox="-2 -4 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M10 1L18.66 15H1.34L10 1z"/></svg>`;

/** Restores theme, colors, brand logo, dual-axis, line styles, and chart-specific state. */
function restoreFullChartState(savedState = {}, legacySpecific = {}) {
  const st = { ...legacySpecific, ...savedState };

  // 1. Theme
  if (st.currentTheme) {
    state.currentTheme = st.currentTheme;
    document.documentElement.setAttribute('data-theme', st.currentTheme);
  }

  // 2. Colors & Palette Pickers
  if (Array.isArray(st.userColors) && st.userColors.length > 0) {
    state.userColors = [...st.userColors];
    colorPairs.forEach(({ picker, hex, idx }) => {
      if (state.userColors[idx]) {
        if (picker) picker.value = state.userColors[idx];
        if (hex) hex.value = state.userColors[idx].toUpperCase();
      }
    });
  }
  state.userBgColor = st.userBgColor ?? null;
  state.userGridColor = st.userGridColor ?? null;

  // 3. Dual-Axis & Dataset Types / Line Styles
  if (typeof st.dualAxisEnabled === 'boolean') {
    state.dualAxisEnabled = st.dualAxisEnabled;
    if (dom.dualAxisToggle) dom.dualAxisToggle.checked = st.dualAxisEnabled;
  }
  if (Array.isArray(st.axisAssignments) && st.axisAssignments.length > 0) {
    state.axisAssignments = [...st.axisAssignments];
  }
  if (st.axisNames) state.axisNames = { ...st.axisNames };
  if (st.axisFormats) state.axisFormats = { ...st.axisFormats };
  if (Array.isArray(st.datasetChartTypes) && st.datasetChartTypes.length > 0) {
    state.datasetChartTypes = [...st.datasetChartTypes];
  }
  if (Array.isArray(st.datasetLineStyles) && st.datasetLineStyles.length > 0) {
    state.datasetLineStyles = [...st.datasetLineStyles];
  }

  // 4. Brand Logo (Data URL or SVG Code)
  if (st.brandLogoDataUrl) {
    state.brandLogoUrl = st.brandLogoDataUrl;
    const img = new Image();
    img.onload = () => {
      state.brandLogoImg = img;
      if (dom.brandLogoPreview) dom.brandLogoPreview.innerHTML = `<img src="${state.brandLogoUrl}" alt="Logo">`;
      if (window.__renderChart) window.__renderChart();
    };
    img.src = st.brandLogoDataUrl;
  } else if (st.brandLogoSvgCode && /<svg[\s>]/i.test(st.brandLogoSvgCode)) {
    if (dom.brandLogoSvgInput) dom.brandLogoSvgInput.value = st.brandLogoSvgCode;
    dom.brandLogoSvgApply?.click();
  } else if ('brandLogoDataUrl' in st) {
    state.brandLogoUrl = null;
    state.brandLogoImg = null;
    if (dom.brandLogoPreview) dom.brandLogoPreview.innerHTML = DEFAULT_BRAND_LOGO_SVG;
  }

  // 5. Chart-Specific State (Timeline, Segmented, Innovator)
  if (Array.isArray(st.timelineEvents)) {
    state.charts.timeline.events = JSON.parse(JSON.stringify(st.timelineEvents));
    renderTimelineEvents();
  }
  if (Array.isArray(st.segmentedGroups) && st.segmentedGroups.length > 0 && state.currentChartType === 'segmented') {
    state.charts.segmented.groups = JSON.parse(JSON.stringify(st.segmentedGroups));
    state.charts.segmented.segments = JSON.parse(JSON.stringify(st.segmentedSegments || []));
    state.charts.segmented.activeGroupIndex = st.activeGroupIndex || 0;
    renderGroupTabs();
    renderSegmentList();
  }
  if (Array.isArray(st.innovatorTierNames) && state.currentChartType === 'innovator') {
    state.charts.innovator.tierCustomNames = [...st.innovatorTierNames];
    renderInnovatorTierNames();
  }
}

/** Builds a new saved graph object capturing both data values and all chart settings/branding/colors. */
function createSnapshot({ name, category, date }) {
  const rowCount = state.rawParsedData?.labels?.length || 0;
  const seriesNames = state.rawParsedData?.datasets?.map(d => d.name).filter(Boolean) || [];
  const nowIso = new Date().toISOString();

  return {
    schema: 2,
    id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: (name || suggestGraphName()).trim(),
    category: (category || 'General').trim() || 'General',
    date: date || nowIso.slice(0, 10),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chartType: state.currentChartType,
    dataFormat: state.dataFormat || 'csv',
    rawText: dom.dataTextarea?.value || '',
    title: dom.chartTitle?.value || '',
    subtitle: dom.chartSubtitle?.value || '',
    source: dom.chartSource?.value || '',
    zoomRange: [...(state.zoomRange || [0, 100])],
    rowCount,
    seriesCount: seriesNames.length,
    seriesNames,
    inputs: captureAllControlInputs(),
    savedState: captureFullChartState(),
  };
}

/** Applies a saved graph entry to the app state & triggers render.
 *  @param {string} id - Saved graph ID
 *  @param {object} opts - { valuesOnly: boolean } */
export async function applySavedGraph(id, { valuesOnly = false } = {}) {
  const entry = savedGraphs.find(g => g.id === id);
  if (!entry) return;

  activeGraphId = entry.id;
  setSuppressProfileAutoSave(true);

  try {
    if (!valuesOnly && entry.chartType && entry.chartType !== state.currentChartType) {
      state.previousChartType = state.currentChartType;
      state.currentChartType = entry.chartType;
      $$('.chart-type-btn').forEach(b => {
        const isMatch = b.dataset.type === entry.chartType;
        b.classList.toggle('active', isMatch);
        b.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });
      updateDataFormatTip();
    }

    if (!valuesOnly) {
      restoreAllControlInputs(entry.inputs);
      if (dom.chartTitle && entry.title !== undefined && !entry.inputs?.chartTitle) dom.chartTitle.value = entry.title;
      if (dom.chartSubtitle && entry.subtitle !== undefined && !entry.inputs?.chartSubtitle) dom.chartSubtitle.value = entry.subtitle;
      if (dom.chartSource && entry.source !== undefined && !entry.inputs?.chartSource) dom.chartSource.value = entry.source;
      state.zoomRange = Array.isArray(entry.zoomRange) ? [...entry.zoomRange] : [0, 100];
    }

    // Restore format toggle & raw textarea
    if (entry.dataFormat) {
      state.dataFormat = entry.dataFormat;
      dom.formatToggle?.querySelectorAll('.format-opt').forEach(b => {
        b.classList.toggle('active', b.dataset.format === entry.dataFormat);
      });
    }

    if (dom.dataTextarea) {
      dom.dataTextarea.value = entry.rawText || '';
    }

    if (entry.rawText && entry.rawText.trim()) {
      const parsed = await parseInputText(entry.rawText);
      if (parsed) {
        state.rawParsedData = parsed;
        state.parsedData = parsed;
      }
    } else if (state.currentChartType === 'innovator' || state.currentChartType === 'inflation') {
      state.rawParsedData = null;
      state.parsedData = null;
    }

    if (!valuesOnly) {
      restoreFullChartState(entry.savedState, entry.chartSpecific);
    }

    // Sync per-chart store so switching chart types preserves the loaded data
    if (state.rawParsedData) {
      state.chartDataStore[state.currentChartType] = {
        textareaValue: dom.dataTextarea?.value || '',
        rawParsedData: state.rawParsedData,
        zoomRange: [...state.zoomRange],
      };
    }

    if (window.__updateAfterDataLoad) {
      window.__updateAfterDataLoad();
    }

    // Re-apply state that updateAfterDataLoad may reset (dualAxis, segmentedGroups, lineStyles)
    if (!valuesOnly) {
      restoreFullChartState(entry.savedState, entry.chartSpecific);
      renderLineStyleControls();
      if (window.__renderChart) window.__renderChart();
    }

    renderSavedGraphsUI();
    const modeLabel = valuesOnly ? `values into ${state.currentChartType}` : `"${entry.name}"`;
    showToast(`Loaded ${modeLabel}`, 'success');
  } finally {
    setSuppressProfileAutoSave(false);
  }
}

// ═══════════════════════════════════════════
//  Filtering & Category Helpers
// ═══════════════════════════════════════════

function getAllCategories() {
  const cats = new Set(['All']);
  savedGraphs.forEach(g => {
    if (g.category) cats.add(g.category);
  });
  return [...cats];
}

function getSuggestedSectors() {
  const set = new Set(DEFAULT_SECTORS);
  savedGraphs.forEach(g => {
    if (g.category) set.add(g.category);
  });
  return [...set];
}

function getFilteredGraphs({ query = '', typeFilter = 'all', sortMode = 'newest' }) {
  const q = query.trim().toLowerCase();
  return savedGraphs
    .filter(g => {
      if (activeCategory !== 'All' && g.category !== activeCategory) return false;
      if (typeFilter !== 'all' && g.chartType !== typeFilter) return false;
      if (!q) return true;
      const inName = (g.name || '').toLowerCase().includes(q);
      const inCat = (g.category || '').toLowerCase().includes(q);
      const inTitle = (g.title || '').toLowerCase().includes(q);
      const inSeries = (g.seriesNames || []).some(s => s.toLowerCase().includes(q));
      const inRaw = (g.rawText || '').toLowerCase().includes(q);
      const inDate = (g.date || '').includes(q);
      return inName || inCat || inTitle || inSeries || inRaw || inDate;
    })
    .sort((a, b) => {
      if (sortMode === 'oldest') {
        return (a.date || '').localeCompare(b.date || '') || (a.createdAt - b.createdAt);
      }
      if (sortMode === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return (b.date || '').localeCompare(a.date || '') || (b.createdAt - a.createdAt);
    });
}

// ═══════════════════════════════════════════
//  UI Rendering (Option A Tab + Option C Modal)
// ═══════════════════════════════════════════

function populateChartTypeFilters() {
  const descriptors = getAllChartDescriptors();
  const selects = [dom.savedTypeFilter, dom.modalSavedTypeFilter].filter(Boolean);
  selects.forEach(sel => {
    const current = sel.value || 'all';
    sel.innerHTML = `<option value="all">Type: All</option>` +
      descriptors.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.label)}</option>`).join('');
    sel.value = current;
  });
}

function renderDatalistAndChips() {
  const sectors = getSuggestedSectors();
  if (dom.savedCategoryDatalist) {
    dom.savedCategoryDatalist.innerHTML = sectors
      .map(s => `<option value="${escapeHtml(s)}"></option>`)
      .join('');
  }
  if (dom.quickSaveSectorChips) {
    const currentVal = dom.saveCategoryInput?.value.trim() || '';
    dom.quickSaveSectorChips.innerHTML = sectors.slice(0, 6).map(s => `
      <button type="button" class="sector-chip ${s === currentVal ? 'active' : ''}" data-sector="${escapeHtml(s)}">
        ${escapeHtml(s)}
      </button>
    `).join('');
    dom.quickSaveSectorChips.querySelectorAll('.sector-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        if (dom.saveCategoryInput) {
          dom.saveCategoryInput.value = btn.dataset.sector;
          if (dom.saveSectorBadge) {
            dom.saveSectorBadge.textContent = 'Selected';
            dom.saveSectorBadge.classList.remove('auto');
          }
          renderDatalistAndChips();
        }
      });
    });
  }
}

function renderCategoryPills(container) {
  if (!container) return;
  const categories = getAllCategories();
  if (!categories.includes(activeCategory)) activeCategory = 'All';

  container.innerHTML = categories.map(cat => {
    const count = cat === 'All'
      ? savedGraphs.length
      : savedGraphs.filter(g => g.category === cat).length;
    return `
      <button type="button" class="saved-cat-pill ${cat === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
        ${escapeHtml(cat)} <span class="pill-count">${count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.saved-cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderSavedGraphsUI();
    });
  });
}

function buildSavedCardHTML(g, isModalList = false) {
  const desc = getChartDescriptor(g.chartType);
  const typeLabel = desc ? desc.label : g.chartType;
  const isSelected = isModalList ? g.id === selectedModalGraphId : g.id === activeGraphId;
  const metaParts = [typeLabel];
  if (g.rowCount > 0) metaParts.push(`${g.rowCount} rows`);
  if (g.seriesCount > 0) metaParts.push(`${g.seriesCount} series`);
  if (g.date) metaParts.push(g.date);

  return `
    <div class="saved-graph-card ${isSelected ? 'active' : ''}" data-id="${escapeHtml(g.id)}">
      <div class="saved-card-header">
        <span class="saved-card-name" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</span>
        <button type="button" class="saved-sector-tag" data-action="edit-sector" data-id="${escapeHtml(g.id)}" title="Click to change sector (${escapeHtml(g.category)})">
          ${escapeHtml(g.category || 'General')} ✎
        </button>
      </div>
      <div class="saved-card-meta">${escapeHtml(metaParts.join(' · '))}</div>
      <div class="saved-card-actions">
        <button type="button" class="saved-btn-xs primary" data-action="load-full" data-id="${escapeHtml(g.id)}" title="Restore chart type, labels, and values">Load Full</button>
        <button type="button" class="saved-btn-xs" data-action="load-values" data-id="${escapeHtml(g.id)}" title="Load only the values into current chart type">Values Only</button>
        ${!isModalList ? `<button type="button" class="saved-btn-xs" data-action="inspect" data-id="${escapeHtml(g.id)}" title="Inspect values & edit metadata">Inspect</button>` : ''}
        <button type="button" class="saved-btn-xs danger" data-action="delete" data-id="${escapeHtml(g.id)}" title="Delete saved graph" aria-label="Delete saved graph">&times;</button>
      </div>
    </div>
  `;
}

/** Inline sector editor popover on a saved card when user clicks the sector badge. */
function promptInlineSectorUpdate(id, anchorEl) {
  const entry = savedGraphs.find(g => g.id === id);
  if (!entry) return;

  // Remove any existing inline editor
  document.querySelectorAll('.inline-sector-editor').forEach(el => el.remove());

  const wrapper = document.createElement('div');
  wrapper.className = 'inline-sector-editor';
  const sectors = getSuggestedSectors();

  wrapper.innerHTML = `
    <div class="inline-sector-row">
      <input type="text" class="inline-sector-input" list="savedCategoryDatalist" value="${escapeHtml(entry.category || 'General')}" placeholder="Sector name…">
      <button type="button" class="saved-btn-xs primary">Save</button>
    </div>
    <div class="inline-sector-chips">
      ${sectors.map(s => `<button type="button" class="sector-chip ${s === entry.category ? 'active' : ''}" data-sector="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
    </div>
  `;

  const card = anchorEl.closest('.saved-graph-card');
  if (!card) return;
  card.appendChild(wrapper);

  const input = wrapper.querySelector('.inline-sector-input');
  const saveBtn = wrapper.querySelector('.saved-btn-xs.primary');
  input.focus();
  input.select();

  const commit = (newSector) => {
    const cleaned = (newSector || '').trim() || 'General';
    entry.category = cleaned;
    entry.updatedAt = Date.now();
    saveToStorage();
    wrapper.remove();
    renderSavedGraphsUI();
    showToast(`Updated sector to "${cleaned}"`, 'success');
  };

  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    commit(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(input.value);
    } else if (e.key === 'Escape') {
      wrapper.remove();
    }
  });

  wrapper.querySelectorAll('.sector-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      commit(chip.dataset.sector);
    });
  });
}

function wireCardEvents(container, isModalList = false) {
  if (!container) return;

  container.querySelectorAll('.saved-graph-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.inline-sector-editor')) return;
      const id = card.dataset.id;
      if (isModalList) {
        selectedModalGraphId = id;
        renderSavedGraphsUI();
      } else {
        applySavedGraph(id, { valuesOnly: false });
      }
    });
  });

  container.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'load-full') {
        applySavedGraph(id, { valuesOnly: false });
        if (isModalList) closeSavedModal();
      } else if (action === 'load-values') {
        applySavedGraph(id, { valuesOnly: true });
        if (isModalList) closeSavedModal();
      } else if (action === 'inspect') {
        selectedModalGraphId = id;
        openSavedModal();
      } else if (action === 'edit-sector') {
        promptInlineSectorUpdate(id, btn);
      } else if (action === 'delete') {
        deleteSavedGraph(id);
      }
    });
  });
}

/** Builds a preview table HTML string from raw CSV/TSV/JSON text for Option C's right pane. */
function buildPreviewTableHTML(entry) {
  const raw = (entry.rawText || '').trim();
  if (!raw) {
    if (entry.chartType === 'innovator') {
      const inc = entry.inputs?.innovatorIncumbentName?.value || entry.chartSpecific?.innovator?.incumbentName || 'Incumbent';
      const dis = entry.inputs?.innovatorDisruptiveName?.value || entry.chartSpecific?.innovator?.disruptiveName || 'Disruptor';
      const tiers = entry.inputs?.innovatorTiers?.value || entry.chartSpecific?.innovator?.tiers || 3;
      return `<div class="saved-preview-empty">Formula-driven Innovator chart (${escapeHtml(inc)} vs ${escapeHtml(dis)}, ${escapeHtml(String(tiers))} tiers).</div>`;
    }
    if (entry.chartType === 'inflation') {
      const amt = entry.inputs?.inflationAmount?.value || entry.chartSpecific?.inflation?.amount || 100;
      const rate = entry.inputs?.inflationRate?.value || entry.chartSpecific?.inflation?.rate || 3;
      const base = entry.inputs?.inflationBaseYear?.value || entry.chartSpecific?.inflation?.baseYear || 1990;
      const target = entry.inputs?.inflationTargetYear?.value || entry.chartSpecific?.inflation?.targetYear || 2025;
      return `<div class="saved-preview-empty">Inflation parameters: $${escapeHtml(String(amt))} at ${escapeHtml(String(rate))}% (${escapeHtml(String(base))}–${escapeHtml(String(target))}).</div>`;
    }
    return `<div class="saved-preview-empty">No raw tabular text stored for this snapshot.</div>`;
  }

  // Parse lightweight preview rows
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (raw.startsWith('{') || raw.startsWith('[')) {
    return `<pre class="saved-preview-code">${escapeHtml(raw.slice(0, 1200))}</pre>`;
  }

  const delimiter = raw.includes('\t') ? '\t' : ',';
  const parsedRows = lines.slice(0, 16).map(line => line.split(delimiter).map(c => c.trim()));
  const headers = parsedRows[0] || [];
  const bodyRows = parsedRows.slice(1);

  return `
    <div class="saved-preview-table-wrap">
      <table class="saved-preview-table">
        <thead>
          <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${bodyRows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      ${lines.length > 16 ? `<div class="saved-preview-more">Showing first 15 of ${lines.length - 1} rows</div>` : ''}
    </div>
  `;
}

/** Renders the right inspection pane inside the Option C 2-Pane Modal. */
function renderModalInspectorPane(filteredList) {
  const pane = dom.modalPreviewPane;
  if (!pane) return;

  let entry = savedGraphs.find(g => g.id === selectedModalGraphId);
  if (!entry && filteredList.length > 0) {
    entry = filteredList[0];
    selectedModalGraphId = entry.id;
  }

  if (!entry) {
    pane.innerHTML = `
      <div class="saved-preview-placeholder">
        <p>No saved graph selected.</p>
        <span>Save a graph using "+ Save" in the Data panel to inspect and reuse its values anytime.</span>
      </div>
    `;
    return;
  }

  const desc = getChartDescriptor(entry.chartType);
  const typeLabel = desc ? desc.label : entry.chartType;
  const currentDesc = getChartDescriptor(state.currentChartType);
  const currentTypeLabel = currentDesc ? currentDesc.label : state.currentChartType;

  pane.innerHTML = `
    <div class="modal-inspector-top">
      <div class="modal-inspector-header">
        <div class="modal-edit-fields">
          <div class="modal-field-group">
            <label>Graph Name</label>
            <input type="text" id="modalEditNameInput" class="saved-input" value="${escapeHtml(entry.name)}">
          </div>
          <div class="modal-field-group">
            <label>Sector / Category</label>
            <input type="text" id="modalEditCategoryInput" class="saved-input" list="savedCategoryDatalist" value="${escapeHtml(entry.category || 'General')}">
          </div>
          <div class="modal-field-group small">
            <label>Date</label>
            <input type="date" id="modalEditDateInput" class="saved-input" value="${escapeHtml(entry.date || '')}">
          </div>
          <button type="button" class="btn-secondary btn-compact" id="modalSaveMetaBtn" style="align-self:flex-end;">Update Info</button>
        </div>
      </div>

      <div class="modal-inspector-summary">
        <span><strong>Type:</strong> ${escapeHtml(typeLabel)}</span>
        <span><strong>Rows:</strong> ${entry.rowCount || 0}</span>
        <span><strong>Series:</strong> ${entry.seriesNames?.length ? escapeHtml(entry.seriesNames.join(', ')) : '1'}</span>
        ${entry.inputs?.numberFormat?.value ? `<span><strong>Format:</strong> ${escapeHtml(entry.inputs.numberFormat.value)}</span>` : ''}
        ${entry.inputs?.brandName?.value ? `<span><strong>Brand:</strong> ${escapeHtml(entry.inputs.brandName.value)} (${escapeHtml(entry.inputs?.brandPosition?.value || 'bottom-right')})</span>` : ''}
        ${entry.savedState?.userColors?.length ? `<span style="display:inline-flex;align-items:center;gap:3px;"><strong>Palette:</strong> ${entry.savedState.userColors.slice(0, 5).map(c => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${escapeHtml(c)};border:1px solid var(--border-primary);"></span>`).join('')}</span>` : ''}
        ${entry.title ? `<span><strong>Title:</strong> ${escapeHtml(entry.title)}</span>` : ''}
        ${entry.source ? `<span><strong>Source:</strong> ${escapeHtml(entry.source)}</span>` : ''}
      </div>

      <div class="modal-preview-section">
        <div class="modal-preview-label">Stored Values Preview</div>
        ${buildPreviewTableHTML(entry)}
      </div>
    </div>

    <div class="modal-inspector-footer">
      <button type="button" class="btn-secondary" id="modalOverwriteCurrentBtn" title="Overwrite this saved item with current workspace values">
        Overwrite with Current Values
      </button>
      <div class="modal-inspector-actions-right">
        <button type="button" class="btn-secondary" id="modalLoadValuesOnlyBtn">
          Load Values Only (Keep ${escapeHtml(currentTypeLabel)})
        </button>
        <button type="button" class="btn-primary" id="modalLoadFullGraphBtn">
          Load Full Graph
        </button>
      </div>
    </div>
  `;

  $('#modalSaveMetaBtn')?.addEventListener('click', () => {
    const newName = $('#modalEditNameInput')?.value.trim() || entry.name;
    const newCat = $('#modalEditCategoryInput')?.value.trim() || 'General';
    const newDate = $('#modalEditDateInput')?.value || entry.date;
    entry.name = newName;
    entry.category = newCat;
    entry.date = newDate;
    entry.updatedAt = Date.now();
    saveToStorage();
    renderSavedGraphsUI();
    showToast('Updated saved graph metadata', 'success');
  });

  $('#modalOverwriteCurrentBtn')?.addEventListener('click', () => {
    const fresh = createSnapshot({
      name: $('#modalEditNameInput')?.value.trim() || entry.name,
      category: $('#modalEditCategoryInput')?.value.trim() || entry.category,
      date: $('#modalEditDateInput')?.value || entry.date,
    });
    Object.assign(entry, fresh, { id: entry.id, createdAt: entry.createdAt, updatedAt: Date.now() });
    saveToStorage();
    renderSavedGraphsUI();
    showToast(`Updated values for "${entry.name}"`, 'success');
  });

  $('#modalLoadValuesOnlyBtn')?.addEventListener('click', () => {
    applySavedGraph(entry.id, { valuesOnly: true });
    closeSavedModal();
  });

  $('#modalLoadFullGraphBtn')?.addEventListener('click', () => {
    applySavedGraph(entry.id, { valuesOnly: false });
    closeSavedModal();
  });
}

/** Master UI refresh for both Option A (inline tab) and Option C (2-pane modal). */
export function renderSavedGraphsUI() {
  const count = savedGraphs.length;
  if (dom.savedCountBadge) dom.savedCountBadge.textContent = count > 0 ? String(count) : '';
  if (dom.topbarSavedCount) dom.topbarSavedCount.textContent = String(count);

  renderDatalistAndChips();
  renderCategoryPills(dom.savedCategoryPills);
  renderCategoryPills(dom.modalCategoryPills);

  // Option A list
  if (dom.savedGraphsList) {
    const listA = getFilteredGraphs({
      query: dom.savedSearchInput?.value || '',
      typeFilter: dom.savedTypeFilter?.value || 'all',
      sortMode: dom.savedSortSelect?.value || 'newest',
    });

    if (savedGraphs.length === 0) {
      dom.savedGraphsList.innerHTML = `
        <div class="saved-empty-state">
          <p>No saved graphs yet</p>
          <span>Click <strong>+ Save</strong> above to store your current values with auto-detected sector tags.</span>
        </div>
      `;
    } else if (listA.length === 0) {
      dom.savedGraphsList.innerHTML = `<div class="saved-empty-state"><p>No matching graphs</p><span>Try clearing your search or category filter.</span></div>`;
    } else {
      dom.savedGraphsList.innerHTML = listA.map(g => buildSavedCardHTML(g, false)).join('');
      wireCardEvents(dom.savedGraphsList, false);
    }
  }

  // Option C modal list & right inspector
  if (dom.modalSavedList) {
    const listC = getFilteredGraphs({
      query: dom.modalSavedSearch?.value || '',
      typeFilter: dom.modalSavedTypeFilter?.value || 'all',
      sortMode: dom.modalSavedSort?.value || 'newest',
    });

    if (listC.length === 0) {
      dom.modalSavedList.innerHTML = `<div class="saved-empty-state"><p>No graphs match filter</p></div>`;
    } else {
      dom.modalSavedList.innerHTML = listC.map(g => buildSavedCardHTML(g, true)).join('');
      wireCardEvents(dom.modalSavedList, true);
    }
    renderModalInspectorPane(listC);
  }
}

// ═══════════════════════════════════════════
//  CRUD Operations & Import/Export
// ═══════════════════════════════════════════

function openQuickSaveBox() {
  if (!dom.quickSaveBox) return;
  const isOpen = dom.quickSaveBox.classList.toggle('open');
  if (!isOpen) return;

  const { sector, autoDetected } = detectSector();
  if (dom.saveNameInput) dom.saveNameInput.value = suggestGraphName();
  if (dom.saveCategoryInput) dom.saveCategoryInput.value = sector;
  if (dom.saveDateInput) dom.saveDateInput.value = new Date().toISOString().slice(0, 10);

  if (dom.saveSectorBadge) {
    dom.saveSectorBadge.textContent = autoDetected ? `Auto: ${sector}` : 'Default';
    dom.saveSectorBadge.classList.toggle('auto', autoDetected);
  }

  renderDatalistAndChips();
  dom.saveNameInput?.focus();
  dom.saveNameInput?.select();
}

function saveCurrentGraph() {
  const hasRawText = dom.dataTextarea?.value.trim().length > 0;
  const isFormulaChart = state.currentChartType === 'innovator' || state.currentChartType === 'inflation';
  if (!hasRawText && !isFormulaChart && !state.rawParsedData) {
    showToast('No chart values to save yet', 'error');
    return;
  }

  const name = dom.saveNameInput?.value.trim() || suggestGraphName();
  const category = dom.saveCategoryInput?.value.trim() || detectSector().sector || 'General';
  const date = dom.saveDateInput?.value || new Date().toISOString().slice(0, 10);

  const snapshot = createSnapshot({ name, category, date });
  savedGraphs.unshift(snapshot);
  activeGraphId = snapshot.id;
  selectedModalGraphId = snapshot.id;
  saveToStorage();

  dom.quickSaveBox?.classList.remove('open');

  // Switch to the Saved tab in Option A so user sees their saved card immediately
  if (dom.savedTabBtn) {
    dom.savedTabBtn.click();
  }

  renderSavedGraphsUI();
  showToast(`Saved "${snapshot.name}" in ${snapshot.category}`, 'success');
}

function deleteSavedGraph(id) {
  const idx = savedGraphs.findIndex(g => g.id === id);
  if (idx === -1) return;
  const [removed] = savedGraphs.splice(idx, 1);
  if (activeGraphId === id) activeGraphId = null;
  if (selectedModalGraphId === id) {
    selectedModalGraphId = savedGraphs[0]?.id || null;
  }
  saveToStorage();
  renderSavedGraphsUI();
  showToast(`Removed "${removed.name}"`, 'success');
}

function exportLibraryJSON() {
  if (savedGraphs.length === 0) {
    showToast('No saved graphs to export', 'warning');
    return;
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(savedGraphs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simple-charts-library-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${savedGraphs.length} saved graphs`, 'success');
}

function importLibraryJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.graphs) ? parsed.graphs : null);
      if (!list) {
        showToast('Invalid library JSON file', 'error');
        return;
      }
      const existingIds = new Set(savedGraphs.map(g => g.id));
      let added = 0;
      list.forEach(item => {
        if (item && (item.rawText != null || item.chartSpecific)) {
          const entry = {
            ...item,
            id: item.id && !existingIds.has(item.id) ? item.id : `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: item.name || 'Imported Graph',
            category: item.category || 'General',
            date: item.date || new Date().toISOString().slice(0, 10),
          };
          savedGraphs.unshift(entry);
          existingIds.add(entry.id);
          added++;
        }
      });
      saveToStorage();
      renderSavedGraphsUI();
      showToast(`Imported ${added} saved graph${added === 1 ? '' : 's'}!`, 'success');
    } catch (err) {
      showToast('Failed to parse library JSON', 'error');
    }
  };
  reader.readAsText(file);
}

export function openSavedModal() {
  if (!dom.savedGraphsModal) return;
  populateChartTypeFilters();
  if (!selectedModalGraphId && savedGraphs.length > 0) {
    selectedModalGraphId = activeGraphId || savedGraphs[0].id;
  }
  renderSavedGraphsUI();
  dom.savedGraphsModal.classList.add('open');
  dom.modalSavedSearch?.focus();
}

export function closeSavedModal() {
  dom.savedGraphsModal?.classList.remove('open');
}

// ═══════════════════════════════════════════
//  Initialization
// ═══════════════════════════════════════════

export function initSavedGraphs() {
  savedGraphs = loadFromStorage();
  populateChartTypeFilters();
  renderSavedGraphsUI();

  // Quick Save triggers
  dom.openQuickSaveBtn?.addEventListener('click', openQuickSaveBox);
  dom.closeQuickSaveBtn?.addEventListener('click', () => dom.quickSaveBox?.classList.remove('open'));
  dom.confirmSaveGraphBtn?.addEventListener('click', saveCurrentGraph);

  dom.saveCategoryInput?.addEventListener('input', () => {
    if (dom.saveSectorBadge) {
      dom.saveSectorBadge.textContent = 'Custom';
      dom.saveSectorBadge.classList.remove('auto');
    }
    renderDatalistAndChips();
  });

  dom.saveNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCurrentGraph();
    } else if (e.key === 'Escape') {
      dom.quickSaveBox?.classList.remove('open');
    }
  });

  // Option A filter inputs
  [dom.savedSearchInput, dom.savedTypeFilter, dom.savedSortSelect].forEach(el => {
    el?.addEventListener('input', renderSavedGraphsUI);
    el?.addEventListener('change', renderSavedGraphsUI);
  });

  // Option C Modal triggers & filter inputs
  dom.topbarSavedBtn?.addEventListener('click', openSavedModal);
  dom.openSavedModalBtn?.addEventListener('click', openSavedModal);
  dom.closeSavedModalBtn?.addEventListener('click', closeSavedModal);
  dom.savedGraphsModal?.addEventListener('click', (e) => {
    if (e.target === dom.savedGraphsModal) closeSavedModal();
  });

  [dom.modalSavedSearch, dom.modalSavedTypeFilter, dom.modalSavedSort].forEach(el => {
    el?.addEventListener('input', renderSavedGraphsUI);
    el?.addEventListener('change', renderSavedGraphsUI);
  });

  // Library JSON Export / Import
  dom.exportSavedLibBtn?.addEventListener('click', exportLibraryJSON);
  dom.importSavedLibBtn?.addEventListener('click', () => dom.importSavedLibInput?.click());
  dom.importSavedLibInput?.addEventListener('change', (e) => {
    if (e.target.files?.[0]) {
      importLibraryJSON(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Global keyboard shortcut: Cmd/Ctrl + K opens Option C Spotlight Modal
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dom.savedGraphsModal?.classList.contains('open')) {
        closeSavedModal();
      } else {
        openSavedModal();
      }
    } else if (e.key === 'Escape' && dom.savedGraphsModal?.classList.contains('open')) {
      closeSavedModal();
    }
  });
}
