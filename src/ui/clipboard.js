import { state } from '../state.js';
import { dom } from '../dom.js';
import { showToast } from '../utils.js';
import { parseJSONData, parseDataFromText } from '../data.js';

export function initClipboard() {
  document.addEventListener('paste', async (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const text = e.clipboardData?.getData('text');
    if (!text) return;

    dom.dataTextarea.value = text;

    const trimmed = text.trim();
    let result;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      result = parseJSONData(text) || await parseDataFromText(text);
    } else {
      result = await parseDataFromText(text);
    }

    if (result) {
      state.rawParsedData = result;
      state.parsedData = state.rawParsedData;
      state.zoomRange = [0, 100];
      if (window.__updateAfterDataLoad) window.__updateAfterDataLoad();
      const fmt = (trimmed.startsWith('{') || trimmed.startsWith('[')) && parseJSONData(text) ? 'JSON' : 'CSV';
      showToast(`Data pasted and parsed (${fmt})!`, 'success');
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      dom.exportBtn.click();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      document.getElementById('themeToggle').click();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          e.preventDefault();
          dom.copyClipboardBtn.click();
        }
      }
    }
  });
}
