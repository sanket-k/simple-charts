import { DEFAULT_COLORS, PRESET_PALETTES } from '../constants.js';
import { state } from '../state.js';
import { dom, colorPairs } from '../dom.js';
import { showToast } from '../utils.js';

export function initColorPickers() {
  colorPairs.forEach(({ picker, hex, idx }) => {
    if (!picker || !hex) return;

    picker.addEventListener('input', () => {
      hex.value = picker.value.toUpperCase();
      state.userColors[idx] = picker.value.toUpperCase();
      if (window.__debouncedRender) window.__debouncedRender();
    });

    hex.addEventListener('input', () => {
      let val = hex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        picker.value = val;
        state.userColors[idx] = val.toUpperCase();
        if (window.__debouncedRender) window.__debouncedRender();
      }
    });

    hex.addEventListener('blur', () => {
      hex.value = state.userColors[idx];
    });
  });

  dom.resetColorsBtn.addEventListener('click', () => {
    DEFAULT_COLORS.forEach((color, i) => {
      state.userColors[i] = color;
      if (colorPairs[i]) {
        colorPairs[i].picker.value = color;
        colorPairs[i].hex.value = color;
      }
    });
    state.userBgColor = null;
    state.userGridColor = null;
    if (dom.chartBgColor) dom.chartBgColor.value = state.currentTheme === 'dark' ? '#111622' : '#FFFBF6';
    if (dom.chartGridColor) dom.chartGridColor.value = state.currentTheme === 'dark' ? '#334155' : '#E8DDD0';
    document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
    document.querySelector('.palette-swatch[data-palette="default"]')?.classList.add('active');
    if (window.__renderChart) window.__renderChart();
    showToast('Colors reset to defaults', 'success');
  });

  dom.presetPalettes.addEventListener('click', (e) => {
    const swatch = e.target.closest('.palette-swatch');
    if (!swatch) return;
    const paletteName = swatch.dataset.palette;
    const palette = PRESET_PALETTES[paletteName];
    if (!palette) return;

    document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');

    palette.forEach((color, i) => {
      state.userColors[i] = color;
      if (colorPairs[i]) {
        colorPairs[i].picker.value = color;
        colorPairs[i].hex.value = color;
      }
    });
    if (window.__renderChart) window.__renderChart();
  });
}
