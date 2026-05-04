import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, showToast } from '../utils.js';
import { getThemeColors, bgPlugin, brandPlugin, sourceFooterPlugin } from '../charts/base-options.js';
import { buildYTickCallback, buildDataLabelFormatter, buildTooltipCallback } from '../chart-format.js';

function getExportFilename(ext) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const legendNames = state.parsedData ? state.parsedData.datasets.map(ds => ds.name).filter(Boolean) : [];
  const subtitle = dom.chartSubtitle?.value.trim() || '';
  const title = dom.chartTitle?.value.trim() || '';

  let base = '';
  if (legendNames.length > 0 && legendNames.length <= 3) {
    base = legendNames.join(' vs ');
  } else if (legendNames.length > 3) {
    base = legendNames[0] + ' et al';
  }
  if (!base) base = subtitle;
  if (!base) base = title;
  if (!base) base = state.currentChartType + '-chart';

  base = base.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
  return `${base}-${dateStr}.${ext}`;
}

function showExportModal(suggestedName, onConfirm) {
  document.querySelectorAll('.export-modal-overlay').forEach(m => m.remove());

  const overlay = document.createElement('div');
  overlay.className = 'export-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'export-modal';

  const title = document.createElement('h3');
  title.className = 'export-modal-title';
  title.textContent = 'Export Chart';
  modal.appendChild(title);

  const label = document.createElement('label');
  label.className = 'export-modal-label';
  label.textContent = 'Filename';
  modal.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'export-modal-input';
  input.value = suggestedName;
  modal.appendChild(input);

  const actions = document.createElement('div');
  actions.className = 'export-modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';
  actions.appendChild(cancelBtn);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn-primary';
  confirmBtn.textContent = 'Export';
  actions.appendChild(confirmBtn);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  input.focus();
  const dotIdx = input.value.lastIndexOf('.');
  if (dotIdx > 0) input.setSelectionRange(0, dotIdx);

  cancelBtn.addEventListener('click', () => overlay.remove());
  confirmBtn.addEventListener('click', () => {
    const name = input.value.trim() || suggestedName;
    overlay.remove();
    onConfirm(name);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = input.value.trim() || suggestedName;
      overlay.remove();
      onConfirm(name);
    } else if (e.key === 'Escape') {
      overlay.remove();
    }
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function exportAsSVG(w, h, filename) {
  const dataUrl = dom.chartCanvas.toDataURL('image/png', 1.0);
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" xlink:href="${dataUrl}"/>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Chart exported as SVG!', 'success');
}

function doExport(filename, format, ext) {
  const sizeStr = dom.exportSize.value;
  const [w, h] = sizeStr.split('x').map(Number);
  const quality = safeInt(dom.exportQuality?.value, 1);

  if (format === 'svg') {
    exportAsSVG(w, h, filename);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'export-canvas-wrapper';
  wrapper.style.width = w + 'px';
  wrapper.style.height = h + 'px';
  const offCanvas = document.createElement('canvas');
  offCanvas.width = w * quality;
  offCanvas.height = h * quality;
  offCanvas.style.width = w + 'px';
  offCanvas.style.height = h + 'px';
  wrapper.appendChild(offCanvas);
  document.body.appendChild(wrapper);

  const tickCallback = buildYTickCallback();
  const dlFormatter = buildDataLabelFormatter();

  const exportConfig = JSON.parse(JSON.stringify(state.chartInstance.config._config));

  if (!exportConfig.options) exportConfig.options = {};
  if (!exportConfig.options.layout) exportConfig.options.layout = { padding: { top: 4, bottom: 8, left: 4, right: 4 } };

  const scaleFonts = (obj) => {
    if (!obj) return;
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key === 'size' && typeof obj[key] === 'number') {
          obj[key] = Math.round(obj[key] * (1 + quality * 0.25));
        } else {
          scaleFonts(obj[key]);
        }
      }
    }
  };
  scaleFonts(exportConfig.options);

  if (exportConfig.options.layout?.padding) {
    const pad = exportConfig.options.layout.padding;
    if (typeof pad === 'object') {
      Object.keys(pad).forEach(k => { pad[k] = Math.round(pad[k] * (1 + quality * 0.5)); });
    }
  }

  exportConfig.options.animation = false;
  exportConfig.options.responsive = false;
  exportConfig.options.maintainAspectRatio = false;

  if (exportConfig.options.scales?.y?.ticks) {
    exportConfig.options.scales.y.ticks.callback = tickCallback;
  }
  if (exportConfig.options.scales?.y1?.ticks) {
    exportConfig.options.scales.y1.ticks.callback = tickCallback;
  }
  if (exportConfig.options.plugins?.datalabels) {
    exportConfig.options.plugins.datalabels.formatter = dlFormatter;
  }

  const exportChartInstance = new Chart(offCanvas, {
    ...exportConfig,
    plugins: [bgPlugin, {
      id: 'sourceFooterExport',
      afterDraw(chart) {
        const source = dom.chartSource.value;
        if (!source) return;
        const ctx = chart.ctx;
        const c = getThemeColors();
        ctx.save();
        ctx.font = `400 14px 'Inter', sans-serif`;
        ctx.fillStyle = c.textMuted;
        ctx.textAlign = 'left';
        ctx.fillText(`Source: ${source}`, chart.chartArea.left, chart.height - 12);
        ctx.restore();
      }
    }, brandPlugin, ChartDataLabels]
  });

  requestAnimationFrame(() => {
    setTimeout(() => {
      const mimeType = { jpg: 'image/jpeg', webp: 'image/webp' }[format] || 'image/png';

      const link = document.createElement('a');
      link.download = filename;
      link.href = offCanvas.toDataURL(mimeType, 0.95);
      link.click();

      exportChartInstance.destroy();
      document.body.removeChild(wrapper);
      showToast(`Chart exported as ${ext.toUpperCase()}!`, 'success');
    }, 200);
  });
}

function exportChart() {
  if (!state.chartInstance) {
    showToast('No chart to export', 'error');
    return;
  }

  const format = dom.exportFormat.value;
  const ext = { jpg: 'jpg', webp: 'webp', svg: 'svg' }[format] || 'png';
  const suggested = getExportFilename(ext);

  showExportModal(suggested, (confirmedName) => {
    doExport(confirmedName, format, ext);
  });
}

export function initExport() {
  dom.exportBtn.addEventListener('click', exportChart);
  dom.copyClipboardBtn.addEventListener('click', copyToClipboard);
  dom.copyJsonBtn.addEventListener('click', copyAsJSON);
}

async function copyAsJSON() {
  if (!state.parsedData) {
    showToast('No data to copy', 'error');
    return;
  }

  try {
    const jsonData = {
      chartType: state.currentChartType,
      title: dom.chartTitle.value || '',
      subtitle: dom.chartSubtitle.value || '',
      source: dom.chartSource.value || '',
      labels: state.parsedData.labels,
      datasets: state.parsedData.datasets.map(ds => ({
        name: ds.name,
        values: ds.values
      })),
      isTimeSeries: state.parsedData.isTimeSeries,
      colors: state.userColors,
      theme: state.currentTheme
    };

    await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    showToast('Chart data copied as JSON!', 'success');
  } catch (err) {
    showToast('Copy failed', 'error');
  }
}

async function copyToClipboard() {
  if (!state.chartInstance) {
    showToast('No chart to copy', 'error');
    return;
  }

  try {
    const canvas = dom.chartCanvas;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    if (navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('Chart copied to clipboard!', 'success');
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = getExportFilename('png');
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Clipboard not supported \u2014 downloaded instead', 'warning');
    }
  } catch (err) {
    showToast('Copy failed \u2014 try downloading instead', 'error');
  }
}
