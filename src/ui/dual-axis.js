import { state } from '../state.js';
import { dom } from '../dom.js';

export function renderAxisAssignments() {
  if (!dom.axisAssignmentList || !state.rawParsedData) return;
  if (!state.dualAxisEnabled) {
    dom.axisAssignmentList.innerHTML = '';
    return;
  }

  const frag = document.createDocumentFragment();
  const container = document.createElement('div');

  const nameRowLeft = document.createElement('div');
  nameRowLeft.className = 'axis-assign-row';
  nameRowLeft.innerHTML = `<span class="axis-assign-label" style="font-weight:600;">Left Axis Name</span>`;
  const leftInput = document.createElement('input');
  leftInput.type = 'text';
  leftInput.className = 'axis-name-input';
  leftInput.dataset.axis = 'left';
  leftInput.value = state.axisNames.left || '';
  leftInput.placeholder = 'e.g. Revenue';
  nameRowLeft.appendChild(leftInput);
  container.appendChild(nameRowLeft);

  const nameRowRight = document.createElement('div');
  nameRowRight.className = 'axis-assign-row';
  nameRowRight.innerHTML = `<span class="axis-assign-label" style="font-weight:600;">Right Axis Name</span>`;
  const rightInput = document.createElement('input');
  rightInput.type = 'text';
  rightInput.className = 'axis-name-input';
  rightInput.dataset.axis = 'right';
  rightInput.value = state.axisNames.right || '';
  rightInput.placeholder = 'e.g. Volume';
  nameRowRight.appendChild(rightInput);
  container.appendChild(nameRowRight);

  const spacer = document.createElement('div');
  spacer.className = 'input-group-separator';
  container.appendChild(spacer);

  state.rawParsedData.datasets.forEach((ds, i) => {
    const val = state.axisAssignments[i] || 'left';
    const row = document.createElement('div');
    row.className = 'axis-assign-row';

    const label = document.createElement('span');
    label.className = 'axis-assign-label';
    label.textContent = ds.name;
    row.appendChild(label);

    const select = document.createElement('select');
    select.className = 'axis-assign-select';
    select.dataset.dsIndex = i;
    ['left', 'right', 'hidden'].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt === 'left' ? 'Left Y' : opt === 'right' ? 'Right Y' : 'Hidden';
      if (val === opt) o.selected = true;
      select.appendChild(o);
    });
    row.appendChild(select);
    container.appendChild(row);
  });

  dom.axisAssignmentList.innerHTML = '';
  dom.axisAssignmentList.appendChild(container);

  dom.axisAssignmentList.querySelectorAll('.axis-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      state.axisNames[e.target.dataset.axis] = e.target.value;
      if (window.__debouncedRender) window.__debouncedRender();
    });
  });

  dom.axisAssignmentList.querySelectorAll('.axis-assign-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.dsIndex);
      state.axisAssignments[idx] = e.target.value;
      if (window.__renderChart) window.__renderChart();
    });
  });
}

export function initDualAxis() {
  if (dom.dualAxisToggle) {
    dom.dualAxisToggle.addEventListener('change', () => {
      state.dualAxisEnabled = dom.dualAxisToggle.checked;
      renderAxisAssignments();
      if (window.__renderChart) window.__renderChart();
    });
  }
}
