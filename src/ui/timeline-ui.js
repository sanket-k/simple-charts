import { state } from '../state.js';
import { dom } from '../dom.js';
import { showToast } from '../utils.js';

export function renderTimelineEvents() {
  dom.timelineEventsList.innerHTML = '';
  state.timelineEvents.forEach((evt, i) => {
    const row = document.createElement('div');
    row.className = 'timeline-event-row';

    const dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.placeholder = 'Date (e.g. 2024-03-15)';
    dateInput.value = evt.position;
    dateInput.dataset.field = 'position';
    dateInput.dataset.index = i;
    row.appendChild(dateInput);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Event name';
    labelInput.value = evt.label;
    labelInput.dataset.field = 'label';
    labelInput.dataset.index = i;
    row.appendChild(labelInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.dataset.index = i;
    removeBtn.setAttribute('aria-label', 'Remove event');
    removeBtn.textContent = '\u00D7';
    row.appendChild(removeBtn);

    dom.timelineEventsList.appendChild(row);
  });

  dom.timelineEventsList.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      state.timelineEvents[idx][field] = e.target.value;
      if (window.__debouncedRender) window.__debouncedRender();
    });
  });

  dom.timelineEventsList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      state.timelineEvents.splice(idx, 1);
      renderTimelineEvents();
      if (window.__renderChart) window.__renderChart();
    });
  });
}

export function initTimelineUI() {
  dom.addTimelineEvent.addEventListener('click', () => {
    state.timelineEvents.push({ label: '', position: '' });
    renderTimelineEvents();
  });

  dom.parseBulkEventsBtn.addEventListener('click', () => {
    const text = dom.bulkEventsTextarea.value.trim();
    if (!text) return;
    const lines = text.split('\n').filter(l => l.trim());
    const newEvents = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        newEvents.push({ position: parts[0], label: parts.slice(1).join(', ') });
      }
    }
    if (newEvents.length > 0) {
      state.timelineEvents = [...state.timelineEvents, ...newEvents];
      renderTimelineEvents();
      if (window.__renderChart) window.__renderChart();
      showToast(`Added ${newEvents.length} events`, 'success');
    }
  });
}
