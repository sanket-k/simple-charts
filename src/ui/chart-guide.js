/** Chart Guide Popover (Pattern A) — opt-in hover/focus usage guides (On / Off). */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { escapeHtml, showToast } from '../utils.js';
import { CHART_CATEGORIES, getChartDescriptor } from '../charts/registry.js';

const INITIAL_DELAY_MS = 180;
const CLOSE_GRACE_MS = 130;

let openTimer = null;
let closeTimer = null;
let activeTrigger = null;
let initialized = false;

function isChartEligible(desc) {
  return Boolean(state.chartGuideEnabled && desc?.guide);
}

function isPopoverOpen(pop) {
  if (!pop) return false;
  try {
    return pop.matches(':popover-open') || pop.classList.contains('open');
  } catch {
    return pop.classList.contains('open');
  }
}

function restoreTriggerTitle(trigger) {
  if (trigger?.dataset.savedTitle !== undefined) {
    trigger.title = trigger.dataset.savedTitle;
    delete trigger.dataset.savedTitle;
  }
}

/** Hides the chart guide popover if open and clears pending timers. */
export function hideChartGuidePopover() {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  openTimer = null;
  closeTimer = null;

  if (activeTrigger) {
    activeTrigger.removeAttribute('aria-describedby');
    restoreTriggerTitle(activeTrigger);
    activeTrigger = null;
  }

  const pop = dom.chartGuidePopover;
  if (!pop) return;
  pop.classList.remove('open');
  try {
    if (pop.matches(':popover-open')) pop.hidePopover();
  } catch {
    // Popover API unavailable; class removal already hides fallback
  }
}

function positionGuidePopover(trigger, pop) {
  const rect = trigger.getBoundingClientRect();
  const margin = 12;
  const popW = Math.min(320, window.innerWidth - margin * 2);
  const popH = Math.min(pop.offsetHeight || 300, window.innerHeight - margin * 2);

  let left;
  if (rect.right + 10 + popW <= window.innerWidth - margin) {
    left = rect.right + 10;
  } else if (rect.left - 10 - popW >= margin) {
    left = rect.left - 10 - popW;
  } else {
    left = Math.max(margin, Math.min(window.innerWidth - popW - margin, rect.left));
  }

  const top = Math.max(58, Math.min(window.innerHeight - popH - margin, rect.top - 10));
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

function renderGuideContent(desc) {
  const g = desc.guide;
  const catLabel = CHART_CATEGORIES.find(c => c.id === desc.category)?.label || '';
  const bestList = (g.bestFor || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const colsHtml = (g.columns || []).map(c => (
    `<span class="chart-guide-col-pill"><em>${escapeHtml(c.col)}:</em> ${escapeHtml(c.role)}</span>`
  )).join('');

  return `
    <div class="chart-guide-head">
      <div class="chart-guide-head-left">
        ${desc.icon}
        <strong class="chart-guide-name">${escapeHtml(desc.label)}</strong>
      </div>
      ${catLabel ? `<span class="chart-guide-cat">${escapeHtml(catLabel)}</span>` : ''}
    </div>
    <div class="chart-guide-body">
      ${desc.summary ? `<div class="chart-guide-summary">${escapeHtml(desc.summary)}</div>` : ''}
      ${bestList ? `
        <div>
          <div class="chart-guide-section-label">Best used for</div>
          <ul class="chart-guide-list">${bestList}</ul>
        </div>
      ` : ''}
      ${colsHtml ? `
        <div>
          <div class="chart-guide-section-label">How to structure data</div>
          <div class="chart-guide-cols">${colsHtml}</div>
        </div>
      ` : ''}
      ${g.avoid ? `<div class="chart-guide-avoid"><strong>Skip if:</strong> ${escapeHtml(g.avoid)}</div>` : ''}
    </div>
    <div class="chart-guide-foot">
      <span>Click to select</span>
      <button type="button" class="chart-guide-off-link" id="chartGuideDisableBtn">Turn off guides</button>
    </div>
  `;
}

function showGuideForTrigger(trigger) {
  const pop = dom.chartGuidePopover;
  const chartId = trigger?.dataset?.type;
  const desc = chartId ? getChartDescriptor(chartId) : null;
  if (!pop || !desc || !isChartEligible(desc)) return;

  if (activeTrigger && activeTrigger !== trigger) {
    activeTrigger.removeAttribute('aria-describedby');
    restoreTriggerTitle(activeTrigger);
  }

  // Suppress native browser title tooltip while rich popover is visible
  if (trigger.title && trigger.dataset.savedTitle === undefined) {
    trigger.dataset.savedTitle = trigger.title;
    trigger.removeAttribute('title');
  }

  activeTrigger = trigger;
  trigger.setAttribute('aria-describedby', pop.id);
  pop.innerHTML = renderGuideContent(desc);

  pop.querySelector('#chartGuideDisableBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setChartGuideEnabled(false);
  });

  // Ensure measurable layout before positioning
  pop.classList.add('open');
  try {
    if (!pop.matches(':popover-open')) pop.showPopover();
  } catch {
    // Fallback uses .open fixed positioning
  }
  positionGuidePopover(trigger, pop);
}

function scheduleOpen(trigger) {
  clearTimeout(closeTimer);
  clearTimeout(openTimer);
  const chartId = trigger?.dataset?.type;
  const desc = chartId ? getChartDescriptor(chartId) : null;
  if (!desc || !isChartEligible(desc)) {
    hideChartGuidePopover();
    return;
  }

  const delay = isPopoverOpen(dom.chartGuidePopover) ? 0 : INITIAL_DELAY_MS;
  openTimer = setTimeout(() => {
    showGuideForTrigger(trigger);
  }, delay);
}

function scheduleClose() {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (dom.chartGuidePopover?.matches(':hover')) return;
    hideChartGuidePopover();
  }, CLOSE_GRACE_MS);
}

/** Updates the Guide On/Off toggle button state. */
export function syncChartGuideUI() {
  const enabled = Boolean(state.chartGuideEnabled);
  state.chartGuideEnabled = enabled;

  if (dom.chartGuideToggleBtn) {
    dom.chartGuideToggleBtn.textContent = enabled ? 'Guide: On' : 'Guide: Off';
    dom.chartGuideToggleBtn.classList.toggle('active', enabled);
    dom.chartGuideToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    dom.chartGuideToggleBtn.title = enabled
      ? 'Hover usage guides: On (click to turn off)'
      : 'Show chart usage guides on hover (click to turn on)';
  }

  if (!enabled) hideChartGuidePopover();
}

/** Sets whether hover chart guides are enabled, updates UI, and persists profile. */
export function setChartGuideEnabled(enabled, showFeedback = true) {
  state.chartGuideEnabled = Boolean(enabled);
  syncChartGuideUI();
  if (window.__debouncedSaveProfile) window.__debouncedSaveProfile();
  if (showFeedback) {
    showToast(state.chartGuideEnabled ? 'Chart guides enabled' : 'Chart guides turned off', 'success');
  }
}

/** Toggles hover chart guides On / Off. */
export function toggleChartGuide() {
  setChartGuideEnabled(!state.chartGuideEnabled);
}

/** Wires delegated hover/focus/dismiss listeners for the Pattern A chart guide popover. */
export function initChartGuide() {
  if (initialized) {
    syncChartGuideUI();
    return;
  }
  initialized = true;

  dom.chartGuideToggleBtn?.addEventListener('click', toggleChartGuide);

  const wireContainer = (container, selector) => {
    if (!container) return;
    container.addEventListener('pointerenter', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const target = e.target.closest(selector);
      if (target) scheduleOpen(target);
    }, true);

    container.addEventListener('pointerleave', (e) => {
      const target = e.target.closest(selector);
      if (target && !target.contains(e.relatedTarget)) scheduleClose();
    }, true);

    container.addEventListener('focusin', (e) => {
      const target = e.target.closest(selector);
      if (target) scheduleOpen(target);
    });

    container.addEventListener('focusout', (e) => {
      const target = e.target.closest(selector);
      if (target && !dom.chartGuidePopover?.contains(e.relatedTarget)) scheduleClose();
    });
  };

  wireContainer(dom.chartTypeGrid, '.chart-type-btn');
  wireContainer(dom.mostUsedGrid, '.chart-type-btn');
  wireContainer(dom.chartCatalogGrid, '.chart-catalog-card');

  dom.chartGuidePopover?.addEventListener('pointerenter', () => {
    clearTimeout(closeTimer);
  });

  dom.chartGuidePopover?.addEventListener('pointerleave', () => {
    scheduleClose();
  });

  dom.panelLeft?.querySelector('.panel-scroll')?.addEventListener('scroll', hideChartGuidePopover, { passive: true });
  dom.chartCatalogGrid?.addEventListener('scroll', hideChartGuidePopover, { passive: true });
  window.addEventListener('resize', hideChartGuidePopover);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPopoverOpen(dom.chartGuidePopover)) {
      hideChartGuidePopover();
    }
  });

  syncChartGuideUI();
}
