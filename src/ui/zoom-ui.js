import { state } from '../state.js';
import { dom } from '../dom.js';
import { updateZoomLabels } from '../data.js';
import { showToast } from '../utils.js';

export function initZoomUI() {
  dom.zoomMin.addEventListener('input', () => {
    let min = parseFloat(dom.zoomMin.value);
    const max = parseFloat(dom.zoomMax.value);
    if (min >= max - 2) min = max - 2;
    dom.zoomMin.value = min;
    state.zoomRange = [min, max];
    updateZoomLabels();
    if (window.__debouncedRender) window.__debouncedRender();
  });

  dom.zoomMax.addEventListener('input', () => {
    const min = parseFloat(dom.zoomMin.value);
    let max = parseFloat(dom.zoomMax.value);
    if (max <= min + 2) max = min + 2;
    dom.zoomMax.value = max;
    state.zoomRange = [min, max];
    updateZoomLabels();
    if (window.__debouncedRender) window.__debouncedRender();
  });

  dom.zoomResetBtn.addEventListener('click', () => {
    state.zoomRange = [0, 100];
    dom.zoomMin.value = 0;
    dom.zoomMax.value = 100;
    updateZoomLabels();
    if (window.__renderChart) window.__renderChart();
    showToast('Zoom reset', 'success');
  });
}
