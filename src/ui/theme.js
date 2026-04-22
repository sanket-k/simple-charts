import { PALETTE } from '../constants.js';
import { state } from '../state.js';
import { dom } from '../dom.js';

export function initTheme() {
  dom.themeToggle.addEventListener('click', () => {
    setTheme(state.currentTheme === 'dark' ? 'light' : 'dark');
  });
}

export function setTheme(theme) {
  state.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  if (!state.userBgColor && dom.chartBgColor) {
    dom.chartBgColor.value = PALETTE[theme].bg;
  }
  if (!state.userGridColor && dom.chartGridColor) {
    dom.chartGridColor.value = PALETTE[theme].grid;
  }
  if (window.__renderChart) window.__renderChart();
}
