import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba } from '../utils.js';
import { formatNumber } from '../format.js';
import { getThemeColors, getMultiColors, FONTS, getTooltipBase, getLegendBase } from './base-options.js';
import { bgPlugin, sourceFooterPlugin, brandPlugin } from './base-options.js';

export function getDefaultSegments() {
  return [
    { label: 'DeFi', value: 35, color: '#F7931A' },
    { label: 'NFTs', value: 22, color: '#60A5FA' },
    { label: 'Infra', value: 18, color: '#34D399' },
    { label: 'Gaming', value: 15, color: '#F472B6' },
    { label: 'Social', value: 10, color: '#A78BFA' },
  ];
}

export function ensureGroupStructure() {
  if (state.segmentedGroups.length === 0) {
    const segs = state.segmentedSegments.length > 0 ? [...state.segmentedSegments] : getDefaultSegments();
    state.segmentedGroups = [{ name: '', segments: segs }];
    state.activeGroupIndex = 0;
  }
}

export function getActiveGroupSegments() {
  ensureGroupStructure();
  return state.segmentedGroups[state.activeGroupIndex]?.segments || [];
}

export function renderGroupTabs() {
  if (!dom.segmentedGroupTabs) return;
  ensureGroupStructure();
  dom.segmentedGroupTabs.innerHTML = '';

  state.segmentedGroups.forEach((group, i) => {
    const tab = document.createElement('button');
    tab.className = 'segmented-group-tab' + (i === state.activeGroupIndex ? ' active' : '');
    tab.textContent = group.name || `Group ${i + 1}`;
    tab.addEventListener('click', () => {
      state.activeGroupIndex = i;
      renderGroupTabs();
      renderSegmentList();
    });
    dom.segmentedGroupTabs.appendChild(tab);
  });

  if (dom.segmentedGroupName) {
    const g = state.segmentedGroups[state.activeGroupIndex];
    dom.segmentedGroupName.value = g ? g.name : '';
  }
}

export function isPercentMode() {
  return (dom.segmentedMode?.value || 'percent') === 'percent';
}

function getGroupTotal(segs) {
  return segs.reduce((sum, s) => sum + (s.value || 0), 0);
}

function segToPercent(seg, total) {
  return total > 0 ? parseFloat(((seg.value / total) * 100).toFixed(1)) : 0;
}

function percentToSegValue(pct, seg, total) {
  return total > 0 ? (pct / 100) * total : 0;
}

export function renderSegmentList() {
  if (!dom.segmentedList) return;
  dom.segmentedList.innerHTML = '';

  const segs = getActiveGroupSegments();
  const percentMode = isPercentMode();
  const groupTotal = getGroupTotal(segs);

  segs.forEach((seg, i) => {
    const displayValue = percentMode ? segToPercent(seg, groupTotal) : seg.value;

    const container = document.createElement('div');
    container.className = 'segment-item';
    container.dataset.segIndex = i;

    const topRow = document.createElement('div');
    topRow.className = 'segment-row segment-row--top';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input';
    colorInput.value = seg.color;
    colorInput.dataset.field = 'color';
    colorInput.dataset.index = i;
    topRow.appendChild(colorInput);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Label';
    labelInput.value = seg.label;
    labelInput.dataset.field = 'label';
    labelInput.dataset.index = i;
    labelInput.style.flex = '1';
    topRow.appendChild(labelInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.dataset.index = i;
    removeBtn.setAttribute('aria-label', 'Remove segment');
    removeBtn.textContent = '\u00D7';
    topRow.appendChild(removeBtn);

    container.appendChild(topRow);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'segment-row segment-row--bottom';

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.placeholder = percentMode ? '%' : 'Value';
    valueInput.value = displayValue;
    valueInput.dataset.field = 'value';
    valueInput.dataset.index = i;
    valueInput.min = '0';
    valueInput.step = percentMode ? '0.1' : 'any';
    bottomRow.appendChild(valueInput);

    const valueSlider = document.createElement('input');
    valueSlider.type = 'range';
    valueSlider.min = '0';
    valueSlider.max = '100';
    valueSlider.step = percentMode ? '0.1' : '1';
    valueSlider.value = displayValue;
    valueSlider.dataset.field = 'value';
    valueSlider.dataset.sliderIndex = i;
    bottomRow.appendChild(valueSlider);

    container.appendChild(bottomRow);
    dom.segmentedList.appendChild(container);
  });

  dom.segmentedList.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index ?? e.target.dataset.sliderIndex);
      const field = e.target.dataset.field;
      if (isNaN(idx) || !field) return;
      const activeSegs = getActiveGroupSegments();
      if (field === 'value') {
        const displayVal = parseFloat(e.target.value) || 0;
        if (percentMode) {
          const currentTotal = getGroupTotal(activeSegs);
          activeSegs[idx].value = percentToSegValue(displayVal, activeSegs[idx], currentTotal);
        } else {
          activeSegs[idx].value = displayVal;
        }
        const container = e.target.closest('[data-seg-index]');
        if (container) {
          const numInput = container.querySelector('input[type="number"]');
          const sliderInput = container.querySelector('input[type="range"]');
          if (e.target.type === 'number' && sliderInput) sliderInput.value = displayVal;
          if (e.target.type === 'range' && numInput) numInput.value = displayVal;
        }
      } else if (field === 'color') {
        activeSegs[idx].color = e.target.value;
      } else {
        activeSegs[idx][field] = e.target.value;
      }
      // debouncedRender will be set up in main.js
      if (window.__debouncedRender) window.__debouncedRender();
    });
  });

  dom.segmentedList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      getActiveGroupSegments().splice(idx, 1);
      renderSegmentList();
      if (window.__renderChart) window.__renderChart();
    });
  });
}

function getSegmentPercent(ctx) {
  const segLabel = ctx.dataset.label;
  const groupIdx = ctx.dataIndex;
  const group = state.segmentedGroups[groupIdx];
  if (!group) return 0;
  const seg = group.segments.find(s => s.label === segLabel);
  const val = seg?.value || 0;
  const total = group.segments.reduce((sum, s) => sum + (s.value || 0), 0);
  return total > 0 ? (val / total) * 100 : 0;
}

export function buildSegmentedBarChart(c) {
  const mode = dom.segmentedMode?.value || 'percent';
  const orientation = dom.segmentedOrientation?.value || 'horizontal';
  const thickness = safeFloat(dom.segmentedThickness?.value, 0.5);
  const borderRadius = safeInt(dom.segmentedBorderRadius?.value, 6);
  const gap = safeInt(dom.segmentedGap?.value, 0);
  const showLabels = dom.segmentedShowLabels?.checked ?? false;
  const showPercent = dom.segmentedShowPercent?.checked ?? true;
  const showNumbers = dom.segmentedShowNumbers?.checked ?? false;
  const minInsidePct = safeInt(dom.segmentedMinLabelPct?.value, 8);

  const indexAxis = orientation === 'horizontal' ? 'y' : 'x';

  ensureGroupStructure();

  const isSingleGroup = state.segmentedGroups.length === 1;
  const labels = isSingleGroup
    ? ['']
    : state.segmentedGroups.map((g, i) => g.name || `Group ${i + 1}`);

  const hasData = state.segmentedGroups.some(g => g.segments.some(s => (s.value || 0) > 0));
  if (!hasData) {
    return { type: 'bar', data: { labels: [''], datasets: [] }, options: { responsive: true, maintainAspectRatio: false }, plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels] };
  }

  const allSegmentLabels = [];
  const seenLabels = new Set();
  state.segmentedGroups.forEach(g => {
    g.segments.forEach(s => {
      if (!seenLabels.has(s.label)) {
        seenLabels.add(s.label);
        allSegmentLabels.push(s.label);
      }
    });
  });

  const segmentColorMap = {};
  state.segmentedGroups.forEach(g => {
    g.segments.forEach(s => {
      if (!segmentColorMap[s.label]) {
        segmentColorMap[s.label] = s.color;
      }
    });
  });

  const chartBg = state.userBgColor || c.bg;

  const datasets = allSegmentLabels.map((segLabel, segIdx) => {
    const data = state.segmentedGroups.map(g => {
      const seg = g.segments.find(s => s.label === segLabel);
      if (!seg) return 0;
      if (mode === 'percent') {
        const groupTotal = g.segments.reduce((sum, s) => sum + (s.value || 0), 0);
        return groupTotal > 0 ? (seg.value / groupTotal) * 100 : 0;
      }
      return seg.value || 0;
    });

    const segColor = segmentColorMap[segLabel];

    return {
      label: segLabel,
      data,
      backgroundColor: hexToRgba(segColor, 0.9),
      borderColor: gap > 0 ? chartBg : segColor,
      borderWidth: gap,
      borderRadius: (ctx) => {
        const groupIdx = ctx.dataIndex;
        const group = state.segmentedGroups[groupIdx];
        if (!group) return 0;
        const visibleLabels = group.segments.filter(s => (s.value || 0) > 0).map(s => s.label);
        if (visibleLabels.length === 0) return 0;
        const isFirst = segLabel === visibleLabels[0];
        const isLast = segLabel === visibleLabels[visibleLabels.length - 1];
        if (orientation === 'horizontal') {
          return {
            topLeft: isFirst ? borderRadius : 0,
            bottomLeft: isFirst ? borderRadius : 0,
            topRight: isLast ? borderRadius : 0,
            bottomRight: isLast ? borderRadius : 0,
          };
        }
        return {
          bottomLeft: isFirst ? borderRadius : 0,
          bottomRight: isFirst ? borderRadius : 0,
          topLeft: isLast ? borderRadius : 0,
          topRight: isLast ? borderRadius : 0,
        };
      },
      borderSkipped: false,
      barPercentage: thickness,
      categoryPercentage: isSingleGroup ? 1.0 : 0.8,
      stack: 'segStack',
    };
  });

  const animSpeed = safeInt(dom.animationSpeed?.value, 600);
  const animDurations = { none: 0, fast: 300, normal: 600, slow: 1000 };
  const animDuration = animDurations[animSpeed] ?? 600;

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis,
    animation: { duration: animDuration, easing: 'easeOutQuart' },
    layout: {
      padding: {
        top: dom.chartTitle?.value ? 8 : 4,
        bottom: dom.chartSource?.value ? 24 : (showNumbers && orientation === 'horizontal' ? 20 : 8),
        left: 4,
        right: (showNumbers && orientation === 'vertical') ? 48 : 4
      }
    },
    plugins: {
      title: {
        display: !!dom.chartTitle?.value,
        text: dom.chartTitle?.value || '',
        color: c.text,
        font: FONTS.title,
        padding: { bottom: dom.chartSubtitle?.value ? 2 : 12 }
      },
      subtitle: {
        display: !!dom.chartSubtitle?.value,
        text: dom.chartSubtitle?.value || '',
        color: c.textSecondary,
        font: FONTS.subtitle,
        padding: { bottom: 16 }
      },
      legend: {
        ...getLegendBase(),
        position: dom.legendPosition?.value || 'top',
        align: 'end',
        labels: {
          ...getLegendBase().labels,
          borderRadius: 4,
        }
      },
      tooltip: {
        ...getTooltipBase(),
        callbacks: {
          label: (ctx) => {
            const segLabel = ctx.dataset.label;
            const groupIdx = ctx.dataIndex;
            const group = state.segmentedGroups[groupIdx];
            const seg = group?.segments.find(s => s.label === segLabel);
            const val = seg?.value || 0;
            const groupTotal = group?.segments.reduce((sum, s) => sum + (s.value || 0), 0) || 0;
            const pct = groupTotal > 0 ? ((val / groupTotal) * 100).toFixed(1) : 0;
            if (mode === 'percent') {
              return `${segLabel}: ${pct}%`;
            }
            return `${segLabel}: ${formatNumber(val)} (${pct}%)`;
          }
        }
      },
      datalabels: {
        display: showLabels || showPercent || showNumbers,
        anchor: (ctx) => {
          if (!showNumbers) return 'center';
          const pct = getSegmentPercent(ctx);
          return pct < minInsidePct ? 'center' : 'center';
        },
        align: (ctx) => {
          if (!showNumbers) return 'center';
          const pct = getSegmentPercent(ctx);
          if (pct < minInsidePct) {
            return orientation === 'horizontal' ? 'bottom' : 'right';
          }
          return 'center';
        },
        offset: (ctx) => {
          if (!showNumbers) return 0;
          const pct = getSegmentPercent(ctx);
          return pct < minInsidePct ? 2 : 0;
        },
        color: (ctx) => {
          if (!showNumbers) return '#fff';
          const pct = getSegmentPercent(ctx);
          return pct < minInsidePct ? c.text : '#fff';
        },
        font: (ctx) => {
          const pct = getSegmentPercent(ctx);
          if (pct >= 15) return FONTS.datalabelsBold;
          if (pct >= 8) return FONTS.datalabels;
          if (pct >= 3) return FONTS.datalabelsSm;
          return FONTS.datalabelsXs;
        },
        formatter: (value, ctx) => {
          if (!value || value === 0) return '';
          const segLabel = ctx.dataset.label;
          const groupIdx = ctx.dataIndex;
          const group = state.segmentedGroups[groupIdx];
          const seg = group?.segments.find(s => s.label === segLabel);
          const val = seg?.value || 0;
          const groupTotal = group?.segments.reduce((sum, s) => sum + (s.value || 0), 0) || 0;
          const pct = groupTotal > 0 ? ((val / groupTotal) * 100).toFixed(1) : 0;
          const pctNum = parseFloat(pct);
          if (pctNum < 2) return '';
          const parts = [];
          if (showLabels) parts.push(segLabel);
          if (showNumbers) {
            if (pctNum >= 15) {
              parts.push(formatNumber(val));
            } else {
              parts.push(formatNumber(val, 'auto'));
            }
          }
          if (showPercent) parts.push(`${pct}%`);
          if (parts.length === 0) return segLabel;
          return parts.join('\n');
        }
      },
      annotation: { annotations: {} }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { display: false },
        border: { display: false },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { display: false },
        border: { display: false },
      }
    }
  };

  if (orientation === 'horizontal') {
    opts.scales.x.max = mode === 'percent' ? 100 : undefined;
    opts.scales.x.ticks = {
      display: true,
      color: c.textSecondary,
      font: FONTS.tick,
      callback: (val) => mode === 'percent' ? val + '%' : formatNumber(val)
    };
    opts.scales.x.grid = { display: dom.showGrid?.checked ?? false, color: state.userGridColor || c.grid, lineWidth: 0.5 };
    if (!isSingleGroup) {
      opts.scales.y.ticks = {
        display: true,
        color: c.text,
        font: FONTS.axisTitleLg,
      };
    }
  } else {
    opts.scales.y.max = mode === 'percent' ? 100 : undefined;
    opts.scales.y.ticks = {
      display: true,
      color: c.textSecondary,
      font: FONTS.tick,
      callback: (val) => mode === 'percent' ? val + '%' : formatNumber(val)
    };
    opts.scales.y.grid = { display: dom.showGrid?.checked ?? false, color: state.userGridColor || c.grid, lineWidth: 0.5 };
    if (!isSingleGroup) {
      opts.scales.x.ticks = {
        display: true,
        color: c.text,
        font: FONTS.axisTitleLg,
      };
    }
  }

  return {
    type: 'bar',
    data: { labels, datasets },
    options: opts,
    plugins: [bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels]
  };
}

export function renderSegmentedChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }
  ensureGroupStructure();
  const hasData = state.segmentedGroups.some(g => g.segments && g.segments.length > 0);
  if (!hasData) return;

  const c = getThemeColors();
  const config = buildSegmentedBarChart(c);
  state.chartInstance = new Chart(dom.chartCanvas, config);
}
