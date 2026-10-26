/** User Profile & Brand Kit Persistence — auto-saves branding, theme, colors,
 *  export presets, formatting, and style preferences to browser localStorage. */
import { DEFAULT_COLORS } from '../constants.js';
import { state } from '../state.js';
import { dom, colorPairs } from '../dom.js';
import { debounce, showToast } from '../utils.js';

const STORAGE_KEY = 'simple_charts_brand_kit_v1';
const DEFAULT_BRAND_LOGO_SVG = `<svg width="16" height="16" viewBox="-2 -4 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M10 1L18.66 15H1.34L10 1z"/></svg>`;

let isRestoring = false;
let isSuppressed = false;

/** Controls whether profile auto-save is temporarily suppressed (e.g., during saved graph loading). */
export function setSuppressProfileAutoSave(val) {
  isSuppressed = Boolean(val);
}

/** Updates the visual badge in the Branding panel header to confirm save state. */
function flashSavedStatus() {
  if (!dom.brandKitStatus) return;
  dom.brandKitStatus.classList.add('flash');
  setTimeout(() => {
    if (dom.brandKitStatus) dom.brandKitStatus.classList.remove('flash');
  }, 1000);
}

/** Captures current branding, colors, theme, export presets, formatting, and style defaults into a profile object. */
export function captureUserProfile() {
  return {
    version: 1,
    updatedAt: Date.now(),
    theme: state.currentTheme || 'light',
    branding: {
      brandName: dom.brandName?.value ?? 'Simple Charts',
      brandPosition: dom.brandPosition?.value ?? 'bottom-right',
      brandLogoPlacement: dom.brandLogoPlacement?.value ?? 'left',
      brandOpacity: dom.brandOpacity?.value ?? '0.7',
      brandLogoSvgCode: dom.brandLogoSvgInput?.value ?? '',
      brandLogoDataUrl: (state.brandLogoUrl && state.brandLogoUrl.startsWith('data:')) ? state.brandLogoUrl : null,
    },
    palette: {
      userColors: Array.isArray(state.userColors) && state.userColors.length > 0
        ? [...state.userColors]
        : [...DEFAULT_COLORS],
      userBgColor: state.userBgColor ?? null,
      userGridColor: state.userGridColor ?? null,
      activePreset: document.querySelector('.palette-swatch.active')?.dataset.palette || null,
    },
    export: {
      exportSize: dom.exportSize?.value ?? '1200x675',
      exportFormat: dom.exportFormat?.value ?? 'png',
      exportQuality: dom.exportQuality?.value ?? '1',
    },
    formatting: {
      currencyPrefix: dom.currencyPrefix?.value ?? '$',
      numberFormat: dom.numberFormat?.value ?? 'auto',
      decimalPlaces: dom.decimalPlaces?.value ?? 'auto',
      dateFormat: dom.dateFormat?.value ?? 'auto',
      maxTicks: dom.maxTicks?.value ?? '12',
      xAxisRotation: dom.xAxisRotation?.value ?? '45',
    },
    style: {
      chartCurve: dom.chartCurve?.value ?? '0.35',
      pointSize: dom.pointSize?.value ?? '3',
      lineWidth: dom.lineWidth?.value ?? '2.5',
      showLegend: dom.showLegend ? dom.showLegend.checked : true,
      showGrid: dom.showGrid ? dom.showGrid.checked : true,
      showDataLabels: dom.showDataLabels ? dom.showDataLabels.checked : false,
      fillArea: dom.fillArea ? dom.fillArea.checked : false,
      spanGaps: dom.spanGaps ? dom.spanGaps.checked : true,
      showHighLowPoints: dom.showHighLowPoints ? dom.showHighLowPoints.checked : false,
      gridStyle: dom.gridStyle?.value ?? 'solid',
      barBorderRadius: dom.barBorderRadius?.value ?? '4',
      legendPosition: dom.legendPosition?.value ?? 'top',
      tooltipStyle: dom.tooltipStyle?.value ?? 'default',
      animationSpeed: dom.animationSpeed?.value ?? '600',
    },
    data: {
      dataFormat: state.dataFormat ?? 'csv',
      downsample: dom.downsampleSelect?.value ?? 'auto',
      maxRows: dom.maxRowsInput?.value ?? '50000',
    },
  };
}

/** Immediately persists the user's Brand Kit & defaults to localStorage. */
export function saveUserProfile() {
  if (isRestoring || isSuppressed) return;
  try {
    const profile = captureUserProfile();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    flashSavedStatus();
  } catch (err) {
    console.warn('Unable to persist brand kit to localStorage:', err);
  }
}

/** 300ms debounced auto-save function called on user input events. */
export const debouncedSaveUserProfile = debounce(() => saveUserProfile(), 300);

/** Restores all saved Brand Kit and default settings from localStorage.
 *  @returns {boolean} True if profile was found and hydrated, false otherwise. */
export function loadUserProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return false;

    isRestoring = true;

    // 1. Theme
    if (p.theme && (p.theme === 'dark' || p.theme === 'light')) {
      state.currentTheme = p.theme;
      document.documentElement.setAttribute('data-theme', p.theme);
    }

    // 2. Branding
    if (p.branding) {
      const b = p.branding;
      if (dom.brandName && b.brandName !== undefined) dom.brandName.value = b.brandName;
      if (dom.brandPosition && b.brandPosition) dom.brandPosition.value = b.brandPosition;
      if (dom.brandLogoPlacement && b.brandLogoPlacement) dom.brandLogoPlacement.value = b.brandLogoPlacement;
      if (dom.brandOpacity && b.brandOpacity !== undefined) {
        dom.brandOpacity.value = b.brandOpacity;
        if (dom.brandOpacityValue) dom.brandOpacityValue.textContent = b.brandOpacity;
      }

      // Restore Brand Logo (SVG or Data URL)
      if (b.brandLogoSvgCode && /<svg[\s>]/i.test(b.brandLogoSvgCode)) {
        if (dom.brandLogoSvgInput) dom.brandLogoSvgInput.value = b.brandLogoSvgCode;
        const sanitized = b.brandLogoSvgCode
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
        const blob = new Blob([sanitized], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          state.brandLogoUrl = url;
          state.brandLogoImg = img;
          if (dom.brandLogoPreview) dom.brandLogoPreview.innerHTML = `<img src="${url}" alt="Logo">`;
          if (window.__debouncedRender) window.__debouncedRender();
        };
        img.src = url;

        if (dom.logoTabFile && dom.logoTabSvg) {
          dom.logoTabFile.classList.remove('active');
          dom.logoTabSvg.classList.add('active');
          if (dom.logoPanelFile) dom.logoPanelFile.style.display = 'none';
          if (dom.logoPanelSvg) dom.logoPanelSvg.style.display = '';
        }
      } else if (b.brandLogoDataUrl && b.brandLogoDataUrl.startsWith('data:')) {
        state.brandLogoUrl = b.brandLogoDataUrl;
        const img = new Image();
        img.onload = () => {
          state.brandLogoImg = img;
          if (dom.brandLogoPreview) dom.brandLogoPreview.innerHTML = `<img src="${b.brandLogoDataUrl}" alt="Logo">`;
          if (window.__debouncedRender) window.__debouncedRender();
        };
        img.src = b.brandLogoDataUrl;

        if (dom.logoTabFile && dom.logoTabSvg) {
          dom.logoTabFile.classList.add('active');
          dom.logoTabSvg.classList.remove('active');
          if (dom.logoPanelFile) dom.logoPanelFile.style.display = '';
          if (dom.logoPanelSvg) dom.logoPanelSvg.style.display = 'none';
        }
      }
    }

    // 3. Colors & Palette
    if (p.palette) {
      if (Array.isArray(p.palette.userColors) && p.palette.userColors.length > 0) {
        state.userColors = [...p.palette.userColors];
        colorPairs.forEach(({ picker, hex, idx }) => {
          if (state.userColors[idx]) {
            if (picker) picker.value = state.userColors[idx];
            if (hex) hex.value = state.userColors[idx].toUpperCase();
          }
        });
      }
      if (p.palette.userBgColor !== undefined) {
        state.userBgColor = p.palette.userBgColor;
        if (dom.chartBgColor && state.userBgColor) dom.chartBgColor.value = state.userBgColor;
      }
      if (p.palette.userGridColor !== undefined) {
        state.userGridColor = p.palette.userGridColor;
        if (dom.chartGridColor && state.userGridColor) dom.chartGridColor.value = state.userGridColor;
      }
      if (p.palette.activePreset) {
        document.querySelectorAll('.palette-swatch').forEach(s => {
          s.classList.toggle('active', s.dataset.palette === p.palette.activePreset);
        });
      }
    }

    // 4. Export Presets
    if (p.export) {
      if (dom.exportSize && p.export.exportSize) dom.exportSize.value = p.export.exportSize;
      if (dom.exportFormat && p.export.exportFormat) dom.exportFormat.value = p.export.exportFormat;
      if (dom.exportQuality && p.export.exportQuality) dom.exportQuality.value = p.export.exportQuality;
    }

    // 5. Formatting
    if (p.formatting) {
      const f = p.formatting;
      if (dom.currencyPrefix && f.currencyPrefix !== undefined) dom.currencyPrefix.value = f.currencyPrefix;
      if (dom.numberFormat && f.numberFormat) dom.numberFormat.value = f.numberFormat;
      if (dom.decimalPlaces && f.decimalPlaces) dom.decimalPlaces.value = f.decimalPlaces;
      if (dom.dateFormat && f.dateFormat) dom.dateFormat.value = f.dateFormat;
      if (dom.maxTicks && f.maxTicks) {
        dom.maxTicks.value = f.maxTicks;
        if (dom.maxTicksValue) dom.maxTicksValue.textContent = f.maxTicks;
      }
      if (dom.xAxisRotation && f.xAxisRotation !== undefined) {
        dom.xAxisRotation.value = f.xAxisRotation;
        if (dom.xAxisRotationValue) dom.xAxisRotationValue.textContent = `${f.xAxisRotation}\u00B0`;
      }
    }

    // 6. Style
    if (p.style) {
      const s = p.style;
      if (dom.chartCurve && s.chartCurve !== undefined) dom.chartCurve.value = s.chartCurve;
      if (dom.pointSize && s.pointSize !== undefined) dom.pointSize.value = s.pointSize;
      if (dom.lineWidth && s.lineWidth !== undefined) dom.lineWidth.value = s.lineWidth;
      if (dom.showLegend && typeof s.showLegend === 'boolean') dom.showLegend.checked = s.showLegend;
      if (dom.showGrid && typeof s.showGrid === 'boolean') dom.showGrid.checked = s.showGrid;
      if (dom.showDataLabels && typeof s.showDataLabels === 'boolean') dom.showDataLabels.checked = s.showDataLabels;
      if (dom.fillArea && typeof s.fillArea === 'boolean') dom.fillArea.checked = s.fillArea;
      if (dom.spanGaps && typeof s.spanGaps === 'boolean') dom.spanGaps.checked = s.spanGaps;
      if (dom.showHighLowPoints && typeof s.showHighLowPoints === 'boolean') dom.showHighLowPoints.checked = s.showHighLowPoints;
      if (dom.gridStyle && s.gridStyle) dom.gridStyle.value = s.gridStyle;
      if (dom.barBorderRadius && s.barBorderRadius !== undefined) {
        dom.barBorderRadius.value = s.barBorderRadius;
        if (dom.barBorderRadiusValue) dom.barBorderRadiusValue.textContent = s.barBorderRadius;
      }
      if (dom.legendPosition && s.legendPosition) dom.legendPosition.value = s.legendPosition;
      if (dom.tooltipStyle && s.tooltipStyle) dom.tooltipStyle.value = s.tooltipStyle;
      if (dom.animationSpeed && s.animationSpeed) dom.animationSpeed.value = s.animationSpeed;
    }

    // 7. Data Options
    if (p.data) {
      const d = p.data;
      if (d.dataFormat) {
        state.dataFormat = d.dataFormat;
        dom.formatToggle?.querySelectorAll('.format-opt').forEach(b => {
          b.classList.toggle('active', b.dataset.format === d.dataFormat);
        });
      }
      if (dom.downsampleSelect && d.downsample) dom.downsampleSelect.value = d.downsample;
      if (dom.maxRowsInput && d.maxRows) dom.maxRowsInput.value = d.maxRows;
    }

    isRestoring = false;
    return true;
  } catch (err) {
    console.warn('Failed to restore user profile from localStorage:', err);
    isRestoring = false;
    return false;
  }
}

/** Resets all Brand Kit and default preferences back to factory defaults. */
export function resetUserProfile() {
  localStorage.removeItem(STORAGE_KEY);
  isRestoring = true;

  // 1. Reset theme to light
  state.currentTheme = 'light';
  document.documentElement.setAttribute('data-theme', 'light');

  // 2. Reset branding
  if (dom.brandName) dom.brandName.value = 'Simple Charts';
  if (dom.brandPosition) dom.brandPosition.value = 'bottom-right';
  if (dom.brandLogoPlacement) dom.brandLogoPlacement.value = 'left';
  if (dom.brandOpacity) {
    dom.brandOpacity.value = '0.7';
    if (dom.brandOpacityValue) dom.brandOpacityValue.textContent = '0.7';
  }
  state.brandLogoUrl = null;
  state.brandLogoImg = null;
  if (dom.brandLogoFile) dom.brandLogoFile.value = '';
  if (dom.brandLogoSvgInput) dom.brandLogoSvgInput.value = '';
  if (dom.brandLogoPreview) dom.brandLogoPreview.innerHTML = DEFAULT_BRAND_LOGO_SVG;

  // 3. Reset colors
  DEFAULT_COLORS.forEach((color, i) => {
    state.userColors[i] = color;
    if (colorPairs[i]) {
      if (colorPairs[i].picker) colorPairs[i].picker.value = color;
      if (colorPairs[i].hex) colorPairs[i].hex.value = color;
    }
  });
  state.userBgColor = null;
  state.userGridColor = null;
  if (dom.chartBgColor) dom.chartBgColor.value = '#FFFBF6';
  if (dom.chartGridColor) dom.chartGridColor.value = '#E8DDD0';
  document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
  document.querySelector('.palette-swatch[data-palette="default"]')?.classList.add('active');

  // 4. Reset export presets
  if (dom.exportSize) dom.exportSize.value = '1200x675';
  if (dom.exportFormat) dom.exportFormat.value = 'png';
  if (dom.exportQuality) dom.exportQuality.value = '1';

  // 5. Reset formatting
  if (dom.currencyPrefix) dom.currencyPrefix.value = '$';
  if (dom.numberFormat) dom.numberFormat.value = 'auto';
  if (dom.decimalPlaces) dom.decimalPlaces.value = 'auto';
  if (dom.dateFormat) dom.dateFormat.value = 'auto';
  if (dom.maxTicks) {
    dom.maxTicks.value = '12';
    if (dom.maxTicksValue) dom.maxTicksValue.textContent = '12';
  }
  if (dom.xAxisRotation) {
    dom.xAxisRotation.value = '45';
    if (dom.xAxisRotationValue) dom.xAxisRotationValue.textContent = '45\u00B0';
  }

  // 6. Reset style
  if (dom.chartCurve) dom.chartCurve.value = '0.35';
  if (dom.pointSize) dom.pointSize.value = '3';
  if (dom.lineWidth) dom.lineWidth.value = '2.5';
  if (dom.showLegend) dom.showLegend.checked = true;
  if (dom.showGrid) dom.showGrid.checked = true;
  if (dom.showDataLabels) dom.showDataLabels.checked = false;
  if (dom.fillArea) dom.fillArea.checked = false;
  if (dom.spanGaps) dom.spanGaps.checked = true;
  if (dom.showHighLowPoints) dom.showHighLowPoints.checked = false;
  if (dom.gridStyle) dom.gridStyle.value = 'solid';
  if (dom.barBorderRadius) {
    dom.barBorderRadius.value = '4';
    if (dom.barBorderRadiusValue) dom.barBorderRadiusValue.textContent = '4';
  }
  if (dom.legendPosition) dom.legendPosition.value = 'top';
  if (dom.tooltipStyle) dom.tooltipStyle.value = 'default';
  if (dom.animationSpeed) dom.animationSpeed.value = '600';

  // 7. Reset data settings
  state.dataFormat = 'csv';
  dom.formatToggle?.querySelectorAll('.format-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.format === 'csv');
  });
  if (dom.downsampleSelect) dom.downsampleSelect.value = 'auto';
  if (dom.maxRowsInput) dom.maxRowsInput.value = '50000';

  isRestoring = false;
  if (window.__renderChart) window.__renderChart();
  showToast('Brand Kit & preferences reset to defaults', 'success');
}

/** Exports the saved profile as a downloadable JSON file. */
export function exportBrandKit() {
  saveUserProfile();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    showToast('No Brand Kit found to export', 'warning');
    return;
  }
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const brandSlug = (dom.brandName?.value || 'simple-charts')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-');
  a.download = `${brandSlug}-brand-kit-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Brand Kit exported as JSON', 'success');
}

/** Imports and hydrates a Brand Kit JSON file. */
export function importBrandKit(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      showToast('Invalid Brand Kit file format', 'error');
      return false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    loadUserProfile();
    if (window.__renderChart) window.__renderChart();
    showToast('Brand Kit imported and applied!', 'success');
    return true;
  } catch (err) {
    showToast('Failed to parse Brand Kit JSON', 'error');
    return false;
  }
}

/** Initializes all Brand Kit toolbar buttons and input change listeners for seamless auto-save. */
export function initUserProfile() {
  // Export button
  dom.exportBrandKitBtn?.addEventListener('click', () => {
    exportBrandKit();
  });

  // Import button & file picker
  dom.importBrandKitBtn?.addEventListener('click', () => {
    dom.importBrandKitFile?.click();
  });

  dom.importBrandKitFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      importBrandKit(ev.target.result);
      if (dom.importBrandKitFile) dom.importBrandKitFile.value = '';
    };
    reader.readAsText(file);
  });

  // Reset button
  dom.resetBrandKitBtn?.addEventListener('click', () => {
    const confirmReset = window.confirm('Reset your saved Brand Kit and default preferences back to factory defaults?');
    if (confirmReset) {
      resetUserProfile();
    }
  });

  // Attach auto-save event listeners to all preference inputs
  const autoSaveInputs = [
    dom.brandName, dom.brandPosition, dom.brandLogoPlacement, dom.brandOpacity,
    dom.exportSize, dom.exportFormat, dom.exportQuality,
    dom.currencyPrefix, dom.numberFormat, dom.decimalPlaces, dom.dateFormat,
    dom.maxTicks, dom.xAxisRotation,
    dom.chartCurve, dom.pointSize, dom.lineWidth,
    dom.showLegend, dom.showGrid, dom.showDataLabels, dom.fillArea, dom.spanGaps, dom.showHighLowPoints,
    dom.gridStyle, dom.barBorderRadius, dom.legendPosition, dom.tooltipStyle, dom.animationSpeed,
    dom.downsampleSelect, dom.maxRowsInput, dom.chartBgColor, dom.chartGridColor,
  ];

  autoSaveInputs.forEach(el => {
    if (!el) return;
    const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(eventType, () => {
      if (!isRestoring && !isSuppressed) {
        debouncedSaveUserProfile();
      }
    });
  });
}
