import { state } from '../state.js';
import { dom } from '../dom.js';
import { showToast } from '../utils.js';

export function initBranding() {
  dom.brandLogoBtn.addEventListener('click', () => dom.brandLogoFile.click());

  dom.brandLogoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.brandLogoUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        state.brandLogoImg = img;
        dom.brandLogoPreview.innerHTML = `<img src="${state.brandLogoUrl}" alt="Logo">`;
        if (window.__renderChart) window.__renderChart();
      };
      img.src = state.brandLogoUrl;
    };
    reader.readAsDataURL(file);
  });

  dom.brandLogoClearBtn.addEventListener('click', () => {
    state.brandLogoUrl = null;
    state.brandLogoImg = null;
    dom.brandLogoFile.value = '';
    dom.brandLogoPreview.innerHTML = `<svg width="16" height="16" viewBox="-2 -4 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M10 1L18.66 15H1.34L10 1z"/></svg>`;
    if (window.__renderChart) window.__renderChart();
  });

  [dom.logoTabFile, dom.logoTabSvg].forEach(tab => {
    tab.addEventListener('click', () => {
      const isSvg = tab.dataset.tab === 'svg';
      dom.logoTabFile.classList.toggle('active', !isSvg);
      dom.logoTabSvg.classList.toggle('active', isSvg);
      dom.logoPanelFile.style.display = isSvg ? 'none' : '';
      dom.logoPanelSvg.style.display = isSvg ? '' : 'none';
    });
  });

  dom.brandLogoSvgApply.addEventListener('click', () => {
    const raw = dom.brandLogoSvgInput.value.trim();
    if (!raw) return;
    if (!/<svg[\s>]/i.test(raw)) {
      showToast('Please paste valid SVG code starting with <svg>', 'error');
      return;
    }
    const sanitized = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    const blob = new Blob([sanitized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      state.brandLogoUrl = url;
      state.brandLogoImg = img;
      dom.brandLogoPreview.innerHTML = `<img src="${url}" alt="Logo">`;
      if (window.__renderChart) window.__renderChart();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Could not render the SVG. Please check the code and try again.', 'error');
    };
    img.src = url;
  });

  dom.brandLogoSvgClear.addEventListener('click', () => {
    dom.brandLogoSvgInput.value = '';
    state.brandLogoUrl = null;
    state.brandLogoImg = null;
    dom.brandLogoPreview.innerHTML = `<svg width="16" height="16" viewBox="-2 -4 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M10 1L18.66 15H1.34L10 1z"/></svg>`;
    if (window.__renderChart) window.__renderChart();
  });

  [dom.brandName, dom.brandPosition, dom.brandLogoPlacement, dom.brandOpacity].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (el === dom.brandOpacity && dom.brandOpacityValue) {
        dom.brandOpacityValue.textContent = dom.brandOpacity.value;
      }
      if (window.__debouncedRender) window.__debouncedRender();
    });
  });
}
