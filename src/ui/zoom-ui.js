/** Zoom UI — stepped range slider inputs, story playhead, and reset control. */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { getZoomLabels, zoomRangeToIndices, indicesToZoomRange, updateZoomLabels } from '../data.js';
import { showToast } from '../utils.js';

const PLAY_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
const PAUSE_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';

let playTimerId = null;

/** Stops the story replay animation if active and restores the play button state. */
function stopZoomPlayback() {
  if (playTimerId) {
    clearInterval(playTimerId);
    playTimerId = null;
  }
  state.isZoomPlaying = false;
  if (dom.zoomPlayBtn) {
    dom.zoomPlayBtn.setAttribute('aria-pressed', 'false');
    dom.zoomPlayBtn.setAttribute('aria-label', 'Play range reveal animation');
    dom.zoomPlayBtn.innerHTML = PLAY_ICON;
  }
}

/** Wires stepped zoom min/max range inputs, story replay button, and reset button. */
export function initZoomUI() {
  dom.zoomMin.addEventListener('input', () => {
    stopZoomPlayback();
    const len = getZoomLabels().length;
    if (len < 2) return;
    let lo = parseInt(dom.zoomMin.value, 10);
    const hi = parseInt(dom.zoomMax.value, 10);
    if (lo >= hi) lo = hi - 1;
    state.zoomRange = indicesToZoomRange(lo, hi, len);
    updateZoomLabels();
    if (window.__debouncedRender) window.__debouncedRender();
  });

  dom.zoomMax.addEventListener('input', () => {
    stopZoomPlayback();
    const len = getZoomLabels().length;
    if (len < 2) return;
    const lo = parseInt(dom.zoomMin.value, 10);
    let hi = parseInt(dom.zoomMax.value, 10);
    if (hi <= lo) hi = lo + 1;
    state.zoomRange = indicesToZoomRange(lo, hi, len);
    updateZoomLabels();
    if (window.__debouncedRender) window.__debouncedRender();
  });

  dom.zoomResetBtn.addEventListener('click', () => {
    stopZoomPlayback();
    state.zoomRange = [0, 100];
    updateZoomLabels();
    if (window.__renderChart) window.__renderChart();
    showToast('Zoom reset', 'success');
  });

  if (dom.zoomPlayBtn) {
    dom.zoomPlayBtn.addEventListener('click', () => {
      if (playTimerId) {
        stopZoomPlayback();
        return;
      }

      const len = getZoomLabels().length;
      if (len < 2) return;

      const [lo, hi] = zoomRangeToIndices(len);
      const targetHi = hi > lo + 1 ? hi : len - 1;
      let cursor = lo + 1;

      state.isZoomPlaying = true;
      dom.zoomPlayBtn.setAttribute('aria-pressed', 'true');
      dom.zoomPlayBtn.setAttribute('aria-label', 'Pause range reveal animation');
      dom.zoomPlayBtn.innerHTML = PAUSE_ICON;

      state.zoomRange = indicesToZoomRange(lo, cursor, len);
      updateZoomLabels();
      if (window.__renderChart) window.__renderChart();

      const steps = Math.max(targetHi - lo, 1);
      const stepDelayMs = Math.max(90, Math.min(340, Math.round(2400 / steps)));

      playTimerId = setInterval(() => {
        if (cursor >= targetHi) {
          stopZoomPlayback();
          return;
        }
        cursor += 1;
        state.zoomRange = indicesToZoomRange(lo, cursor, len);
        updateZoomLabels();
        if (window.__renderChart) window.__renderChart();
      }, stepDelayMs);
    });
  }

  dom.zoomSliderContainer?.addEventListener('zoom:dataset-changed', () => {
    stopZoomPlayback();
  });
}
