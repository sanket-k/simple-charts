/** Creates a debounced version of a function */
export function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/** Safely converts a value to an integer, returning fallback if NaN or Infinity */
export function safeInt(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Safely converts a value to a float, returning fallback if NaN or Infinity */
export function safeFloat(val, fallback) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Escapes HTML special characters in a string */
export function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

/** Converts a hex color string to an rgba() string with the given opacity */
export function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Wraps a text string into multiple lines, each no longer than maxChars (max 3 lines) */
export function wrapText(text, maxChars) {
  if (!text) return [''];
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length + word.length + 1 > maxChars && line.length > 0) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Displays a brief toast notification at the bottom of the screen */
export function showToast(message, type = 'success') {
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
