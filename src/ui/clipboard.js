/** Clipboard and keyboard shortcuts — paste-to-parse, Cmd+E export, Cmd+Shift+D theme, Cmd+C copy. */
import { state } from '../state.js';
import { dom } from '../dom.js';
import { showToast } from '../utils.js';
import { parseJSONData, parseDataFromText } from '../data.js';

/** Wires global paste handler (auto-parses data) and keyboard shortcuts. */
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
      const fmt = (trimmed.startsWith('{') || trimmed.startsWith('[')) && parseJSONData(text) ? 'JSON'
        : trimmed.includes('\t') && !trimmed.includes(',') ? 'TSV' : 'CSV';
      showToast(`Data pasted and parsed (${fmt})!`, 'success');
    }
  });

  /** Toggles the Keyboard Shortcuts modal cheatsheet and adapts modifier keys to platform. */
  function toggleShortcutsModal(show) {
    if (!dom.shortcutsModal) return;
    const shouldOpen = typeof show === 'boolean' ? show : !dom.shortcutsModal.classList.contains('open');
    dom.shortcutsModal.classList.toggle('open', shouldOpen);
    if (shouldOpen) {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
      document.querySelectorAll('.kbd-mod').forEach(k => {
        k.textContent = isMac ? '⌘' : 'Ctrl';
      });
    }
  }

  dom.shortcutsBtn?.addEventListener('click', () => toggleShortcutsModal(true));
  dom.closeShortcutsModalBtn?.addEventListener('click', () => toggleShortcutsModal(false));
  dom.shortcutsModal?.addEventListener('click', (e) => {
    if (e.target === dom.shortcutsModal) toggleShortcutsModal(false);
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea';

    // Show / dismiss shortcuts modal via ? (Shift + /)
    if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
      e.preventDefault();
      toggleShortcutsModal();
      return;
    }

    // Dismiss shortcuts modal via Escape
    if (e.key === 'Escape' && dom.shortcutsModal?.classList.contains('open')) {
      e.preventDefault();
      toggleShortcutsModal(false);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      dom.exportBtn.click();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      dom.themeToggle.click();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      if (!isInput) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          e.preventDefault();
          dom.copyClipboardBtn.click();
        }
      }
    }
  });
}
