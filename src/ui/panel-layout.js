/** Adjustable Panel Layout — independent drag resizing, collapsing, and DOM-synced panel reordering. */
import { state } from '../state.js';
import { dom, $$ } from '../dom.js';
import { showToast } from '../utils.js';

const STORAGE_KEY = 'simple_charts_panel_layout_v1';

const PANEL_BOUNDS = {
  left: { min: 190, max: 640, defaultWidth: 240 },
  right: { min: 220, max: 680, defaultWidth: 280 },
};

const MIN_STAGE_WIDTH = 320;
const SPLITTER_WIDTH = 7;

const DEFAULT_LAYOUT = {
  leftWidth: PANEL_BOUNDS.left.defaultWidth,
  rightWidth: PANEL_BOUNDS.right.defaultWidth,
  leftCollapsed: false,
  rightCollapsed: false,
  order: ['left', 'stage', 'right'],
};

let layout = cloneDefaultLayout();
let tabletRightOpen = false;

function cloneDefaultLayout() {
  return {
    leftWidth: DEFAULT_LAYOUT.leftWidth,
    rightWidth: DEFAULT_LAYOUT.rightWidth,
    leftCollapsed: false,
    rightCollapsed: false,
    order: [...DEFAULT_LAYOUT.order],
  };
}

function getPanelEl(id) {
  return id === 'left' ? dom.panelLeft : dom.panelRight;
}

function getSplitterEl(id) {
  return id === 'left' ? dom.leftSplitter : dom.rightSplitter;
}

function getWidthKey(id) {
  return id === 'left' ? 'leftWidth' : 'rightWidth';
}

function getCollapsedKey(id) {
  return id === 'left' ? 'leftCollapsed' : 'rightCollapsed';
}

function isTabletViewport() {
  return window.innerWidth <= 1024 && window.innerWidth > 768;
}

function isMobileViewport() {
  return window.innerWidth <= 768;
}

function isDefaultLayout() {
  return (
    layout.leftWidth === DEFAULT_LAYOUT.leftWidth &&
    layout.rightWidth === DEFAULT_LAYOUT.rightWidth &&
    !layout.leftCollapsed &&
    !layout.rightCollapsed &&
    layout.order.join(',') === DEFAULT_LAYOUT.order.join(',')
  );
}

/** Clamps a panel's width against its min/max bounds and remaining stage space. */
function clampPanelWidth(id, desired) {
  const bounds = PANEL_BOUNDS[id];
  const containerW = dom.appLayout?.getBoundingClientRect().width || window.innerWidth;
  const otherId = id === 'left' ? 'right' : 'left';
  const otherCollapsed = layout[getCollapsedKey(otherId)] || (isTabletViewport() && otherId === 'right');
  const otherWidth = otherCollapsed ? 0 : layout[getWidthKey(otherId)];
  const activeSplitters = (layout.leftCollapsed ? 0 : 1) + (layout.rightCollapsed || isTabletViewport() ? 0 : 1);
  const maxByViewport = containerW - otherWidth - MIN_STAGE_WIDTH - activeSplitters * SPLITTER_WIDTH;
  const maxAllowed = Math.max(bounds.min, Math.min(bounds.max, maxByViewport));
  return Math.round(Math.max(bounds.min, Math.min(maxAllowed, desired)));
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultLayout();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return cloneDefaultLayout();

    const validOrder =
      Array.isArray(parsed.order) &&
      parsed.order.length === 3 &&
      ['left', 'stage', 'right'].every((k) => parsed.order.includes(k));

    return {
      leftWidth: Number.isFinite(parsed.leftWidth) ? parsed.leftWidth : DEFAULT_LAYOUT.leftWidth,
      rightWidth: Number.isFinite(parsed.rightWidth) ? parsed.rightWidth : DEFAULT_LAYOUT.rightWidth,
      leftCollapsed: Boolean(parsed.leftCollapsed),
      rightCollapsed: Boolean(parsed.rightCollapsed),
      order: validOrder ? [...parsed.order] : [...DEFAULT_LAYOUT.order],
    };
  } catch {
    return cloneDefaultLayout();
  }
}

function saveLayout() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage quota errors
  }
}

/** Reorders DOM children in #appLayout so keyboard focus matches visual order. */
function rebuildDomOrder() {
  if (!dom.appLayout || !dom.panelLeft || !dom.panelRight || !dom.chartStage) return;

  const stageIdx = layout.order.indexOf('stage');
  const frag = document.createDocumentFragment();

  layout.order.forEach((slot, idx) => {
    if (slot === 'stage') {
      frag.appendChild(dom.chartStage);
      return;
    }

    const panel = getPanelEl(slot);
    const splitter = getSplitterEl(slot);
    const side = idx < stageIdx ? 'left' : 'right';
    panel.dataset.side = side;

    if (side === 'left') {
      frag.appendChild(panel);
      if (splitter) frag.appendChild(splitter);
    } else {
      if (splitter) frag.appendChild(splitter);
      frag.appendChild(panel);
    }
  });

  dom.appLayout.appendChild(frag);
}

/** Syncs CSS variables, collapsed states, ARIA attributes, badges, and button states. */
function syncLayoutUI() {
  if (!dom.panelLeft || !dom.panelRight) return;

  if (!isMobileViewport()) {
    layout.leftWidth = clampPanelWidth('left', layout.leftWidth);
    if (!isTabletViewport()) {
      layout.rightWidth = clampPanelWidth('right', layout.rightWidth);
    }
  }

  const tablet = isTabletViewport();
  const stageIdx = layout.order.indexOf('stage');

  ['left', 'right'].forEach((id) => {
    const panel = getPanelEl(id);
    const splitter = getSplitterEl(id);
    const width = layout[getWidthKey(id)];
    const collapsed = layout[getCollapsedKey(id)];
    const slotIdx = layout.order.indexOf(id);

    panel.style.setProperty('--panel-w', `${width}px`);
    panel.classList.toggle('is-collapsed', id === 'right' && tablet ? false : collapsed);
    if (id === 'right') {
      panel.classList.toggle('tablet-open', tablet && tabletRightOpen);
    }

    if (splitter) {
      splitter.classList.toggle('is-hidden', collapsed || (id === 'right' && tablet));
      splitter.setAttribute('aria-valuenow', String(width));
      splitter.setAttribute('aria-valuemin', String(PANEL_BOUNDS[id].min));
      splitter.setAttribute('aria-valuemax', String(PANEL_BOUNDS[id].max));
    }

    const badge = id === 'left' ? dom.leftPanelWidthBadge : dom.rightPanelWidthBadge;
    if (badge) badge.textContent = `${width}px`;

    const moveLeftBtn = panel.querySelector(`[data-panel-target="${id}"][data-panel-action="move-left"]`);
    const moveRightBtn = panel.querySelector(`[data-panel-target="${id}"][data-panel-action="move-right"]`);
    if (moveLeftBtn) moveLeftBtn.disabled = slotIdx === 0;
    if (moveRightBtn) moveRightBtn.disabled = slotIdx === 2;

    panel.dataset.side = slotIdx < stageIdx ? 'left' : 'right';
  });

  if (dom.restoreLeftPanelBtn) {
    const leftSide = dom.panelLeft.dataset.side || 'left';
    dom.restoreLeftPanelBtn.dataset.side = leftSide;
    dom.restoreLeftPanelBtn.hidden = !layout.leftCollapsed;
    dom.restoreLeftPanelBtn.classList.remove('is-stacked');
  }
  if (dom.restoreRightPanelBtn) {
    const rightSide = tablet ? 'right' : (dom.panelRight.dataset.side || 'right');
    const showRightRestore = tablet ? !tabletRightOpen : layout.rightCollapsed;
    dom.restoreRightPanelBtn.dataset.side = rightSide;
    dom.restoreRightPanelBtn.hidden = !showRightRestore;
    const sameSideBothCollapsed =
      !tablet &&
      layout.leftCollapsed &&
      layout.rightCollapsed &&
      dom.restoreLeftPanelBtn?.dataset.side === rightSide;
    dom.restoreRightPanelBtn.classList.toggle('is-stacked', sameSideBothCollapsed);
  }
  if (dom.resetLayoutBtn) {
    dom.resetLayoutBtn.hidden = isDefaultLayout();
  }

  if (window.__repositionCatalogPopover) {
    window.__repositionCatalogPopover();
  }
}

function resizeChartSmoothly() {
  if (state.chartInstance) {
    state.chartInstance.resize();
  }
  if (window.__repositionCatalogPopover) {
    window.__repositionCatalogPopover();
  }
}

/** Moves a panel one slot left (-1) or right (+1) within the workspace order. */
function movePanel(id, delta) {
  const idx = layout.order.indexOf(id);
  const nextIdx = idx + delta;
  if (idx === -1 || nextIdx < 0 || nextIdx >= layout.order.length) return;

  const updated = [...layout.order];
  [updated[idx], updated[nextIdx]] = [updated[nextIdx], updated[idx]];
  layout.order = updated;

  rebuildDomOrder();
  syncLayoutUI();
  saveLayout();
  requestAnimationFrame(resizeChartSmoothly);
}

function setPanelCollapsed(id, collapsed) {
  if (id === 'right' && isTabletViewport()) {
    tabletRightOpen = !collapsed;
    syncLayoutUI();
    return;
  }
  layout[getCollapsedKey(id)] = Boolean(collapsed);
  syncLayoutUI();
  saveLayout();
  setTimeout(resizeChartSmoothly, 200);
}

/** Resets widths, collapsed flags, and dock order back to defaults. */
export function resetPanelLayout() {
  layout = cloneDefaultLayout();
  tabletRightOpen = false;
  localStorage.removeItem(STORAGE_KEY);
  rebuildDomOrder();
  syncLayoutUI();
  setTimeout(resizeChartSmoothly, 200);
  showToast('Panel layout reset to default', 'success');
}

function wireSplitter(splitter, id) {
  if (!splitter) return;
  const panel = getPanelEl(id);

  splitter.addEventListener('pointerdown', (e) => {
    if (isMobileViewport()) return;
    e.preventDefault();
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('active');
    panel.classList.add('is-dragging');
    document.body.classList.add('is-resizing-panels');

    const chart = state.chartInstance;
    const prevAnimDuration = chart?.options?.animation?.duration;
    if (chart?.options?.animation && typeof chart.options.animation === 'object') {
      chart.options.animation.duration = 0;
    }

    const startX = e.clientX;
    const startW = layout[getWidthKey(id)];
    const isLeftOfStage = panel.dataset.side === 'left';

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const desired = isLeftOfStage ? startW + dx : startW - dx;
      const next = clampPanelWidth(id, desired);
      layout[getWidthKey(id)] = next;
      panel.style.setProperty('--panel-w', `${next}px`);

      const badge = id === 'left' ? dom.leftPanelWidthBadge : dom.rightPanelWidthBadge;
      if (badge) badge.textContent = `${next}px`;
      splitter.setAttribute('aria-valuenow', String(next));

      if (dom.panelDragTooltip) {
        dom.panelDragTooltip.textContent = `${next}px`;
        dom.panelDragTooltip.style.left = `${Math.min(window.innerWidth - 64, ev.clientX + 12)}px`;
        dom.panelDragTooltip.style.top = `${Math.max(58, ev.clientY - 14)}px`;
        dom.panelDragTooltip.classList.add('show');
      }
      if (dom.resetLayoutBtn) {
        dom.resetLayoutBtn.hidden = isDefaultLayout();
      }
      if (window.__repositionCatalogPopover) {
        window.__repositionCatalogPopover();
      }
    };

    const onEnd = () => {
      splitter.classList.remove('active');
      panel.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-panels');
      dom.panelDragTooltip?.classList.remove('show');

      if (chart?.options?.animation && typeof chart.options.animation === 'object' && prevAnimDuration !== undefined) {
        chart.options.animation.duration = prevAnimDuration;
      }

      saveLayout();
      syncLayoutUI();
      resizeChartSmoothly();

      splitter.removeEventListener('pointermove', onMove);
      splitter.removeEventListener('pointerup', onEnd);
      splitter.removeEventListener('pointercancel', onEnd);
    };

    splitter.addEventListener('pointermove', onMove);
    splitter.addEventListener('pointerup', onEnd);
    splitter.addEventListener('pointercancel', onEnd);
  });

  splitter.addEventListener('dblclick', () => {
    layout[getWidthKey(id)] = PANEL_BOUNDS[id].defaultWidth;
    syncLayoutUI();
    saveLayout();
    setTimeout(resizeChartSmoothly, 200);
  });

  splitter.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 40 : 12;
    const dir = panel.dataset.side === 'left' ? 1 : -1;
    let handled = true;

    if (e.key === 'ArrowRight') {
      layout[getWidthKey(id)] = clampPanelWidth(id, layout[getWidthKey(id)] + step * dir);
    } else if (e.key === 'ArrowLeft') {
      layout[getWidthKey(id)] = clampPanelWidth(id, layout[getWidthKey(id)] - step * dir);
    } else if (e.key === 'Home') {
      layout[getWidthKey(id)] = clampPanelWidth(id, PANEL_BOUNDS[id].min);
    } else if (e.key === 'End') {
      layout[getWidthKey(id)] = clampPanelWidth(id, PANEL_BOUNDS[id].max);
    } else if (e.key === 'Enter') {
      layout[getWidthKey(id)] = PANEL_BOUNDS[id].defaultWidth;
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      syncLayoutUI();
      saveLayout();
      resizeChartSmoothly();
    }
  });
}

/** Initializes adjustable panels, splitters, collapse/restore pills, and persisted layout. */
export function initPanelLayout() {
  layout = loadLayout();
  tabletRightOpen = false;

  rebuildDomOrder();
  syncLayoutUI();

  wireSplitter(dom.leftSplitter, 'left');
  wireSplitter(dom.rightSplitter, 'right');

  $$('.panel-chrome-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.panelTarget;
      const action = btn.dataset.panelAction;
      if (!target || !action) return;

      if (action === 'move-left') movePanel(target, -1);
      else if (action === 'move-right') movePanel(target, 1);
      else if (action === 'collapse') setPanelCollapsed(target, true);
    });
  });

  dom.restoreLeftPanelBtn?.addEventListener('click', () => setPanelCollapsed('left', false));
  dom.restoreRightPanelBtn?.addEventListener('click', () => setPanelCollapsed('right', false));
  dom.resetLayoutBtn?.addEventListener('click', resetPanelLayout);

  window.addEventListener('resize', () => {
    syncLayoutUI();
  });
}
