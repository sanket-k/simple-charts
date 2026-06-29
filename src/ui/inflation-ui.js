/** Inflation chart UI — bidirectional slider ↔ number-input sync for each value
 *  control (amount, rate, base year, target year), plus the cosmetic controls.
 *  Any change triggers a debounced re-render. Pattern mirrors dual-axis.js /
 *  timeline-ui.js, which wire their own listeners rather than the shared
 *  settingsInputs array. */
import { dom } from '../dom.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Keeps a number input and its companion range slider in sync.
 *  The number input is canonical (may exceed the slider's range); the slider
 *  pegs at its bounds purely for visual feedback. Either input re-renders. */
function wirePair(numEl, rangeEl) {
  if (!numEl || !rangeEl) return;
  const lo = parseFloat(rangeEl.min);
  const hi = parseFloat(rangeEl.max);
  rangeEl.addEventListener('input', () => {
    numEl.value = rangeEl.value;
    if (window.__debouncedRender) window.__debouncedRender();
  });
  numEl.addEventListener('input', () => {
    const v = parseFloat(numEl.value);
    if (isFinite(v)) rangeEl.value = clamp(v, lo, hi);
    if (window.__debouncedRender) window.__debouncedRender();
  });
}

/** Initialize all inflation-panel controls. */
export function initInflationUI() {
  wirePair(dom.inflationAmount, dom.inflationAmountRange);
  wirePair(dom.inflationRate, dom.inflationRateRange);
  wirePair(dom.inflationBaseYear, dom.inflationBaseYearRange);
  wirePair(dom.inflationTargetYear, dom.inflationTargetYearRange);

  if (dom.inflationTension) {
    if (dom.inflationTensionValue) dom.inflationTensionValue.textContent = parseFloat(dom.inflationTension.value).toFixed(2);
    dom.inflationTension.addEventListener('input', () => {
      if (dom.inflationTensionValue) dom.inflationTensionValue.textContent = parseFloat(dom.inflationTension.value).toFixed(2);
      if (window.__debouncedRender) window.__debouncedRender();
    });
  }
  if (dom.inflationMarkers) {
    dom.inflationMarkers.addEventListener('change', () => {
      if (window.__renderChart) window.__renderChart();
    });
  }
}
