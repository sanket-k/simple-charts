import { CONFIG, EXTRA_COLORS } from './constants.js';
import { state } from './state.js';
import { dom, $, $$ } from './dom.js';
import { debounce, safeInt } from './utils.js';
import { renderChart } from './render.js';
import { parseJSONData, parseDataFromText, parseInputText, applyDownsampling, updateDataPreview, updateDataInfo, updateDataOptions, updateZoomSlider, updateZoomLabels, addManualRow, parseManualData, convertParsedDataToSegments } from './data.js';
import { renderGroupTabs, renderSegmentList, getDefaultSegments, ensureGroupStructure, getActiveGroupSegments } from './charts/segmented.js';
import { renderInnovatorTierNames } from './charts/innovator.js';
import { parseKanoData } from './charts/kano.js';
import { renderAxisAssignments } from './ui/dual-axis.js';
import { renderComboDatasetTypes } from './ui/combo-ui.js';
import { renderTimelineEvents } from './ui/timeline-ui.js';
import { showToast } from './utils.js';
import { setTheme, initTheme } from './ui/theme.js';
import { initColorPickers } from './ui/colors.js';
import { initChartTypeGrid, initSettingsListeners, updateSettingsVisibility } from './ui/settings.js';
import { initDualAxis } from './ui/dual-axis.js';
import { initBranding } from './ui/branding.js';
import { initTimelineUI } from './ui/timeline-ui.js';
import { initZoomUI } from './ui/zoom-ui.js';
import { initExport } from './ui/export.js';
import { initClipboard } from './ui/clipboard.js';

// Expose render functions globally for UI module callbacks
const debouncedRender = debounce(() => renderChart(), CONFIG.debounceMs);
window.__renderChart = renderChart;
window.__debouncedRender = debouncedRender;
window.__loadSampleForType = loadSampleData;

function updateAfterDataLoad() {
  if (state.currentChartType === 'segmented' && state.rawParsedData) {
    convertParsedDataToSegments(state.rawParsedData);
    renderGroupTabs();
    renderSegmentList();
  }
  if (state.currentChartType === 'kano') {
    state.kanoFeatures = parseKanoData(dom.dataTextarea.value);
  }
  applyDownsampling();
  updateSettingsVisibility();
  updateDataPreview();
  updateDataInfo();
  updateDataOptions();
  updateZoomSlider();
  renderAxisAssignments();
  if (state.currentChartType === 'combo') renderComboDatasetTypes();
  renderChart();
}
window.__updateAfterDataLoad = updateAfterDataLoad;

async function loadSampleData() {
  const prevType = state.previousChartType;
  const newType = state.currentChartType;

  if (prevType && prevType !== newType && state.rawParsedData) {
    state.chartDataStore[prevType] = {
      textareaValue: dom.dataTextarea.value,
      rawParsedData: state.rawParsedData,
      zoomRange: [...state.zoomRange],
    };
  }

  if (state.chartDataStore[newType]) {
    const saved = state.chartDataStore[newType];
    dom.dataTextarea.value = saved.textareaValue;
    state.rawParsedData = saved.rawParsedData;
    state.parsedData = state.rawParsedData;
    state.zoomRange = saved.zoomRange || [0, 100];
    state.previousChartType = newType;
    updateAfterDataLoad();
    return;
  }

  state.previousChartType = newType;

  const samplesByType = {
    line: "Month, Revenue, Costs\nJan, 4200, 3100\nFeb, 5100, 3400\nMar, 4800, 3200\nApr, 6200, 3800\nMay, 7100, 4100\nJun, 6800, 3900\nJul, 7800, 4300\nAug, 8200, 4500",
    timeline: "Month, Price\nJan 2024, 42000\nFeb 2024, 43500\nMar 2024, 51000\nApr 2024, 64000\nMay 2024, 61000\nJun 2024, 58000\nJul 2024, 63000\nAug 2024, 59000\nSep 2024, 55000\nOct 2024, 62000\nNov 2024, 72000\nDec 2024, 68000",
    bar: "Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100\nProduct D, 2900\nProduct E, 6300\nProduct F, 4700",
    vbar: "Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100\nProduct D, 2900\nProduct E, 6300\nProduct F, 4700",
    pie: "Segment, Share\nDeFi, 35\nNFTs, 22\nInfra, 18\nGaming, 15\nSocial, 10",
    donut: "Category, Percentage\nBitcoin, 42\nEthereum, 28\nSolana, 14\nOther L1s, 10\nStablecoins, 6",
    area: "Quarter, AI, Crypto, Fintech\nQ1 '24, 120, 80, 60\nQ2 '24, 180, 110, 75\nQ3 '24, 240, 150, 95\nQ4 '24, 310, 200, 120\nQ1 '25, 380, 260, 145",
    radar: "Metric, Us, Competitor\nSpeed, 90, 65\nCost, 75, 80\nAccuracy, 95, 70\nScale, 85, 60\nUX, 88, 72\nSupport, 92, 55",
    scatter: "X, Y\n10, 25\n22, 38\n35, 52\n18, 30\n42, 61\n28, 44\n55, 72\n15, 28\n48, 65\n33, 48\n60, 78\n25, 40\n38, 55\n45, 68\n12, 22",
    waterfall: "Category, Value\nRevenue, 5000\nCOGS, -2100\nGross Profit, 2900\nSalaries, -1200\nMarketing, -400\nR&D, -350\nNet Income, 950",
    kano: "Feature, Implementation, Satisfaction\nTouchscreen, 8, 9\nFast Charging, 6, 7\nUSB-C, 9, 3\nFaceID, 3, 8\nHeadphone Jack, 7, -2\nWireless Charging, 5, 8\nNFC Payments, 8, 2\n5G Connectivity, 6, 6\nIP68 Rating, 9, 4\nAlways-On Display, 4, 7"
  };

  if (state.currentChartType === 'segmented') {
    const sample = "Segment, Value\nDeFi, 35\nNFTs, 22\nInfra, 18\nGaming, 15\nSocial, 10";
    dom.dataTextarea.value = sample;
    state.rawParsedData = await parseDataFromText(sample);
    state.parsedData = state.rawParsedData;
    state.segmentedSegments = getDefaultSegments();
    state.segmentedGroups = [{ name: '', segments: [...state.segmentedSegments] }];
    state.activeGroupIndex = 0;
    renderGroupTabs();
    renderSegmentList();
  } else {
    const sample = samplesByType[state.currentChartType] || samplesByType.line;
    dom.dataTextarea.value = sample;
    state.rawParsedData = await parseDataFromText(sample);
    state.parsedData = state.rawParsedData;
  }

  if (state.currentChartType === 'timeline') {
    state.timelineEvents = [
      { label: 'ETF Approved', position: 'Mar 2024' },
      { label: 'Halving', position: 'Apr 2024' }
    ];
    renderTimelineEvents();
  }

  if (state.currentChartType === 'innovator') {
    state.timelineEvents = [
      { label: 'Disruption Begins', position: '3' },
      { label: 'Market Shift', position: '6' }
    ];
    renderTimelineEvents();
  }

  updateAfterDataLoad();
}

function initDataInputTabs() {
  $$('.data-input-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.panel-section');
      parent.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  $$('.timeline-input-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.timeline-input-tabs .tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      $$('.tl-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $(`#tltab-${btn.dataset.tltab}`).classList.add('active');
    });
  });
}

function initFormatToggle() {
  if (dom.formatToggle) {
    dom.formatToggle.querySelectorAll('.format-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        dom.formatToggle.querySelectorAll('.format-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dataFormat = btn.dataset.format;
      });
    });
  }
}

function initParseButton() {
  dom.parseDataBtn.addEventListener('click', async () => {
    const result = await parseInputText(dom.dataTextarea.value);
    if (result) {
      state.rawParsedData = result;
      state.parsedData = state.rawParsedData;
      state.zoomRange = [0, 100];
      updateAfterDataLoad();
      showToast('Data parsed successfully', 'success');
    } else {
      showToast('Could not parse data', 'error');
    }
  });
}

function initCSVUpload() {
  dom.fileDropZone.addEventListener('click', () => dom.csvFileInput.click());

  dom.fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.fileDropZone.classList.add('dragover');
  });

  dom.fileDropZone.addEventListener('dragleave', () => {
    dom.fileDropZone.classList.remove('dragover');
  });

  dom.fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.fileDropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.match(/\.(csv|tsv|txt|json)$/i)) {
      handleCSVFile(file);
    }
  });

  dom.csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCSVFile(file);
  });
}

async function handleCSVFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    dom.dataTextarea.value = text.substring(0, 50000);

    const isJson = file.name.endsWith('.json');
    const trimmed = text.trim();
    let result;
    if (isJson || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      result = parseJSONData(text) || await parseDataFromText(text);
    } else {
      result = await parseDataFromText(text);
    }

    state.rawParsedData = result;
    if (state.rawParsedData) {
      const parent = dom.dataTextarea.closest('.panel-section');
      parent.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const pasteTab = parent.querySelector('.tab-btn[data-tab="paste"]');
      pasteTab.classList.add('active');
      pasteTab.setAttribute('aria-selected', 'true');
      $('#tab-paste').classList.add('active');

      state.parsedData = state.rawParsedData;
      state.zoomRange = [0, 100];
      updateAfterDataLoad();
      showToast(`Loaded ${file.name} (${state.rawParsedData.labels.length.toLocaleString()} rows)`, 'success');
    }
  };
  reader.readAsText(file);
}

function initManualEntry() {
  dom.addRowBtn.addEventListener('click', () => addManualRow());

  dom.addSeriesBtn.addEventListener('click', () => {
    state.seriesCount++;
    const headerCell = document.createElement('input');
    headerCell.type = 'text';
    headerCell.className = 'manual-cell header-cell';
    headerCell.value = `Series ${state.seriesCount}`;
    dom.addSeriesBtn.parentElement.insertBefore(headerCell, dom.addSeriesBtn);

    dom.manualRows.querySelectorAll('.manual-row').forEach(row => {
      const cell = document.createElement('input');
      cell.type = 'number';
      cell.className = 'manual-cell';
      cell.placeholder = 'Value';
      row.appendChild(cell);
    });
  });

  const parseManualDataDebounced = debounce(() => {
    parseManualData();
    if (state.rawParsedData) updateAfterDataLoad();
  }, CONFIG.debounceMs);

  dom.manualRows.parentElement.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT') parseManualDataDebounced();
  });
}

function initDownsampleColumnListeners() {
  dom.downsampleSelect.addEventListener('change', () => {
    applyDownsampling();
    updateDataInfo();
    updateZoomSlider();
    renderChart();
  });

  dom.columnSelect.addEventListener('change', () => {
    renderChart();
  });
}

function initSegmentedGroupListeners() {
  dom.addSegmentBtn.addEventListener('click', () => {
    const activeSegs = getActiveGroupSegments();
    const colors = [...state.userColors, ...EXTRA_COLORS];
    activeSegs.push({
      label: `Segment ${activeSegs.length + 1}`,
      value: 10,
      color: colors[activeSegs.length % colors.length]
    });
    renderSegmentList();
    renderChart();
  });

  dom.addGroupBtn?.addEventListener('click', () => {
    ensureGroupStructure();
    const currentSegs = getActiveGroupSegments().map(s => ({ ...s, value: 0 }));
    state.segmentedGroups.push({
      name: '',
      segments: currentSegs
    });
    state.activeGroupIndex = state.segmentedGroups.length - 1;
    renderGroupTabs();
    renderSegmentList();
    renderChart();
  });

  dom.removeGroupBtn?.addEventListener('click', () => {
    ensureGroupStructure();
    if (state.segmentedGroups.length <= 1) return;
    state.segmentedGroups.splice(state.activeGroupIndex, 1);
    state.activeGroupIndex = Math.min(state.activeGroupIndex, state.segmentedGroups.length - 1);
    renderGroupTabs();
    renderSegmentList();
    renderChart();
  });

  dom.segmentedGroupName?.addEventListener('input', () => {
    ensureGroupStructure();
    if (state.segmentedGroups[state.activeGroupIndex]) {
      state.segmentedGroups[state.activeGroupIndex].name = dom.segmentedGroupName.value;
      renderGroupTabs();
      renderChart();
    }
  });

  const tipBtn = document.getElementById('segmentedFormatTipBtn');
  const tipPanel = document.getElementById('segmentedFormatTip');
  const tipClose = document.getElementById('segmentedFormatTipClose');
  if (tipBtn && tipPanel) {
    tipBtn.addEventListener('click', () => tipPanel.classList.toggle('visible'));
  }
  if (tipClose && tipPanel) {
    tipClose.addEventListener('click', () => tipPanel.classList.remove('visible'));
  }
}

function init() {
  Chart.register(ChartDataLabels);
  Chart.defaults.plugins.datalabels.display = false;

  // Sync UI value displays
  dom.maxTicksValue.textContent = dom.maxTicks.value;
  if (dom.barBorderRadiusValue) dom.barBorderRadiusValue.textContent = dom.barBorderRadius.value;
  if (dom.xAxisRotationValue) dom.xAxisRotationValue.textContent = dom.xAxisRotation.value + '\u00B0';
  if (dom.innovatorTiersValue) dom.innovatorTiersValue.textContent = dom.innovatorTiers.value;
  if (dom.innovatorSustainingPaceValue) dom.innovatorSustainingPaceValue.textContent = dom.innovatorSustainingPace.value;
  if (dom.innovatorDisruptionPaceValue) dom.innovatorDisruptionPaceValue.textContent = dom.innovatorDisruptionPace.value;
  if (dom.innovatorDisruptiveStartValue) dom.innovatorDisruptiveStartValue.textContent = dom.innovatorDisruptiveStart.value;
  if (dom.innovatorDisruptivePeakValue) dom.innovatorDisruptivePeakValue.textContent = dom.innovatorDisruptivePeak.value;
  if (dom.innovatorIncumbentBaseValue) dom.innovatorIncumbentBaseValue.textContent = dom.innovatorIncumbentBase.value;
  if (dom.innovatorIncumbentSlopeValue) dom.innovatorIncumbentSlopeValue.textContent = dom.innovatorIncumbentSlope.value;
  if (dom.innovatorMarketTopValue) dom.innovatorMarketTopValue.textContent = dom.innovatorMarketTop.value;
  if (dom.innovatorMarketBottomValue) dom.innovatorMarketBottomValue.textContent = dom.innovatorMarketBottom.value;
  if (dom.segmentedThicknessValue) dom.segmentedThicknessValue.textContent = dom.segmentedThickness.value;
  if (dom.segmentedBorderRadiusValue) dom.segmentedBorderRadiusValue.textContent = dom.segmentedBorderRadius.value;
  if (dom.segmentedGapValue) dom.segmentedGapValue.textContent = dom.segmentedGap.value;
  if (dom.segmentedMinLabelPctValue) dom.segmentedMinLabelPctValue.textContent = dom.segmentedMinLabelPct.value + '%';
  if (dom.kanoBubbleSizeValue) dom.kanoBubbleSizeValue.textContent = dom.kanoBubbleSize.value;
  if (dom.kanoAxisRangeValue) dom.kanoAxisRangeValue.textContent = dom.kanoAxisRange.value;

  renderInnovatorTierNames();

  if (dom.maxRowsInput) {
    CONFIG.hardRowLimit = parseInt(dom.maxRowsInput.value) || 50000;
  }

  // Initialize all UI modules
  initTheme();
  initColorPickers();
  initChartTypeGrid();
  initSettingsListeners();
  initDualAxis();
  initBranding();
  initTimelineUI();
  initZoomUI();
  initExport();
  initClipboard();
  initDataInputTabs();
  initFormatToggle();
  initParseButton();
  initCSVUpload();
  initManualEntry();
  initDownsampleColumnListeners();
  initSegmentedGroupListeners();

  loadSampleData();
}

init();
