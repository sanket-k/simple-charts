import { state } from '../state.js';

export function renderComboDatasetTypes() {
  const container = document.getElementById('comboDatasetList');
  if (!container || !state.rawParsedData) return;

  if (state.datasetChartTypes.length !== state.rawParsedData.datasets.length) {
    state.datasetChartTypes = state.rawParsedData.datasets.map((_, i) => i === 0 ? 'bar' : 'line');
  }

  container.innerHTML = '';
  state.rawParsedData.datasets.forEach((ds, i) => {
    const currentType = state.datasetChartTypes[i] || (i === 0 ? 'bar' : 'line');
    const row = document.createElement('div');
    row.className = 'axis-assign-row';
    row.style.marginBottom = '6px';

    const label = document.createElement('span');
    label.className = 'axis-assign-label';
    label.textContent = ds.name;
    row.appendChild(label);

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '0';

    ['line', 'bar'].forEach(type => {
      const btn = document.createElement('button');
      btn.textContent = type === 'line' ? 'Line' : 'Bar';
      btn.dataset.dsIndex = i;
      btn.dataset.dsType = type;
      btn.style.cssText = `
        padding: 4px 10px;
        font-size: 12px;
        border: 1px solid var(--border);
        background: ${currentType === type ? 'var(--accent)' : 'var(--card)'};
        color: ${currentType === type ? '#fff' : 'var(--text-muted)'};
        cursor: pointer;
        border-radius: ${type === 'line' ? '6px 0 0 6px' : '0 6px 6px 0'};
        font-family: inherit;
      `;
      btn.addEventListener('click', () => {
        state.datasetChartTypes[i] = type;
        renderComboDatasetTypes();
        if (window.__renderChart) window.__renderChart();
      });
      btnGroup.appendChild(btn);
    });

    row.appendChild(btnGroup);
    container.appendChild(row);
  });
}
