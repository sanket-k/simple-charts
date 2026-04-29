import { state } from '../state.js';
import { dom } from '../dom.js';

const LINE_STYLES = [
  { value: 'solid', label: 'Solid', dash: [] },
  { value: 'dashed', label: 'Dashed', dash: [8, 4] },
  { value: 'dotted', label: 'Dotted', dash: [2, 4] },
  { value: 'dash-dot', label: 'Dash-Dot', dash: [8, 4, 2, 4] },
];

export function getLineDash(style) {
  const found = LINE_STYLES.find(s => s.value === style);
  return found ? found.dash : [];
}

export function renderLineStyleControls() {
  const container = dom.lineStyleList;
  if (!container || !state.rawParsedData) return;

  const datasets = state.rawParsedData.datasets;
  if (state.datasetLineStyles.length !== datasets.length) {
    state.datasetLineStyles = datasets.map(() => 'solid');
  }

  container.innerHTML = '';

  datasets.forEach((ds, i) => {
    const current = state.datasetLineStyles[i] || 'solid';

    const row = document.createElement('div');
    row.className = 'axis-assign-row';
    row.style.marginBottom = '6px';

    const label = document.createElement('span');
    label.className = 'axis-assign-label';
    label.textContent = ds.name;
    row.appendChild(label);

    const select = document.createElement('select');
    select.className = 'axis-assign-select';
    select.dataset.dsIndex = i;

    LINE_STYLES.forEach(style => {
      const opt = document.createElement('option');
      opt.value = style.value;
      opt.textContent = style.label;
      if (current === style.value) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      state.datasetLineStyles[i] = e.target.value;
      if (window.__renderChart) window.__renderChart();
    });

    row.appendChild(select);
    container.appendChild(row);
  });
}
