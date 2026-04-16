/* ═══════════════════════════════════════════
   ChartForge — Application Logic
   ═══════════════════════════════════════════ */

(() => {
  'use strict';

  // ── Brand Palette ──
  const PALETTE = {
    dark: {
      hero: '#F7931A',
      secondary: '#60A5FA',
      bg: '#111622',
      grid: '#334155',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      border: '#2a3345',
    },
    light: {
      hero: '#F7931A',
      secondary: '#3B82F6',
      bg: '#FFFBF6',
      grid: '#F1F5F9',
      text: '#1E293B',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      border: '#E8DDD0',
    }
  };

  const MULTI_COLORS = [
    '#F7931A', '#60A5FA', '#34D399', '#F472B6',
    '#A78BFA', '#FBBF24', '#FB923C', '#2DD4BF',
    '#818CF8', '#F87171'
  ];

  const MULTI_COLORS_LIGHT = [
    '#F7931A', '#3B82F6', '#10B981', '#EC4899',
    '#8B5CF6', '#F59E0B', '#F97316', '#14B8A6',
    '#6366F1', '#EF4444'
  ];

  // ── State ──
  let currentTheme = 'dark';
  let currentChartType = 'line';
  let chartInstance = null;
  let parsedData = null;
  let timelineEvents = [];

  // ── DOM Refs ──
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const dom = {
    themeToggle: $('#themeToggle'),
    exportBtn: $('#exportBtn'),
    exportSize: $('#exportSize'),
    chartCanvas: $('#chartCanvas'),
    chartContainer: $('#chartContainer'),
    chartTypeGrid: $('#chartTypeGrid'),
    dataTextarea: $('#dataTextarea'),
    parseDataBtn: $('#parseDataBtn'),
    chartTitle: $('#chartTitle'),
    chartSubtitle: $('#chartSubtitle'),
    chartSource: $('#chartSource'),
    chartCurve: $('#chartCurve'),
    showLegend: $('#showLegend'),
    showGrid: $('#showGrid'),
    showDataLabels: $('#showDataLabels'),
    dataPreview: $('#dataPreview'),
    timelineSettings: $('#timelineSettings'),
    timelineEventsList: $('#timelineEventsList'),
    addTimelineEvent: $('#addTimelineEvent'),
    fileDropZone: $('#fileDropZone'),
    csvFileInput: $('#csvFileInput'),
    addRowBtn: $('#addRowBtn'),
    addSeriesBtn: $('#addSeriesBtn'),
    manualRows: $('#manualRows'),
    series1Name: $('#series1Name'),
    secondarySwatch: $('#secondarySwatch'),
    secondaryHex: $('#secondaryHex'),
  };

  // ═══════════════════════════════════════════
  //  Theme
  // ═══════════════════════════════════════════

  function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const p = PALETTE[theme];
    dom.secondarySwatch.style.background = p.secondary;
    dom.secondaryHex.textContent = p.secondary;
    renderChart();
  }

  dom.themeToggle.addEventListener('click', () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // ═══════════════════════════════════════════
  //  Chart Type Selection
  // ═══════════════════════════════════════════

  dom.chartTypeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.chart-type-btn');
    if (!btn) return;
    $$('.chart-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentChartType = btn.dataset.type;

    // Show/hide timeline settings
    dom.timelineSettings.style.display =
      currentChartType === 'timeline' ? 'block' : 'none';

    renderChart();
  });

  // ═══════════════════════════════════════════
  //  Data Input Tabs
  // ═══════════════════════════════════════════

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ═══════════════════════════════════════════
  //  Data Parsing
  // ═══════════════════════════════════════════

  function parseDataFromText(text) {
    if (!text.trim()) return null;

    // Try PapaParse first
    const result = Papa.parse(text.trim(), {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (!result.data || result.data.length === 0) return null;

    const rows = result.data;

    // Detect if first row is header
    const firstRow = rows[0];
    let hasHeader = false;
    if (firstRow.length > 1 && typeof firstRow[0] === 'string') {
      // Check if second column of first row is non-numeric
      hasHeader = typeof firstRow[1] === 'string' && isNaN(parseFloat(firstRow[1]));
    }

    let labels, seriesNames, dataRows;

    if (hasHeader) {
      seriesNames = firstRow.slice(1);
      dataRows = rows.slice(1);
    } else {
      dataRows = rows;
      seriesNames = dataRows[0].length > 2
        ? Array.from({ length: dataRows[0].length - 1 }, (_, i) => `Series ${i + 1}`)
        : ['Value'];
    }

    labels = dataRows.map(r => r[0]);
    const datasets = [];

    for (let i = 1; i < (dataRows[0] || []).length; i++) {
      datasets.push({
        name: seriesNames[i - 1] || `Series ${i}`,
        values: dataRows.map(r => {
          const v = r[i];
          return typeof v === 'number' ? v : parseFloat(v) || 0;
        })
      });
    }

    return { labels, datasets };
  }

  function loadSampleData() {
    const samplesByType = {
      line: "Month, Revenue, Costs\nJan, 4200, 3100\nFeb, 5100, 3400\nMar, 4800, 3200\nApr, 6200, 3800\nMay, 7100, 4100\nJun, 6800, 3900\nJul, 7800, 4300\nAug, 8200, 4500",
      timeline: "Month, Price\nJan 2024, 42000\nFeb 2024, 43500\nMar 2024, 51000\nApr 2024, 64000\nMay 2024, 61000\nJun 2024, 58000\nJul 2024, 63000\nAug 2024, 59000\nSep 2024, 55000\nOct 2024, 62000\nNov 2024, 72000\nDec 2024, 68000",
      bar: "Category, Value\nProduct A, 4200\nProduct B, 3800\nProduct C, 5100\nProduct D, 2900\nProduct E, 6300\nProduct F, 4700",
      pie: "Segment, Share\nDeFi, 35\nNFTs, 22\nInfra, 18\nGaming, 15\nSocial, 10",
      donut: "Category, Percentage\nBitcoin, 42\nEthereum, 28\nSolana, 14\nOther L1s, 10\nStablecoins, 6",
      area: "Quarter, AI, Crypto, Fintech\nQ1 '24, 120, 80, 60\nQ2 '24, 180, 110, 75\nQ3 '24, 240, 150, 95\nQ4 '24, 310, 200, 120\nQ1 '25, 380, 260, 145",
      radar: "Metric, Us, Competitor\nSpeed, 90, 65\nCost, 75, 80\nAccuracy, 95, 70\nScale, 85, 60\nUX, 88, 72\nSupport, 92, 55",
      scatter: "X, Y\n10, 25\n22, 38\n35, 52\n18, 30\n42, 61\n28, 44\n55, 72\n15, 28\n48, 65\n33, 48\n60, 78\n25, 40\n38, 55\n45, 68\n12, 22",
      waterfall: "Category, Value\nRevenue, 5000\nCOGS, -2100\nGross Profit, 2900\nSalaries, -1200\nMarketing, -400\nR&D, -350\nNet Income, 950"
    };

    const sample = samplesByType[currentChartType] || samplesByType.line;
    dom.dataTextarea.value = sample;
    parsedData = parseDataFromText(sample);

    // Set default timeline events for timeline chart
    if (currentChartType === 'timeline') {
      timelineEvents = [
        { label: 'ETF Approved', position: 'Mar 2024' },
        { label: 'Halving', position: 'Apr 2024' }
      ];
      renderTimelineEvents();
    }

    updateDataPreview();
    renderChart();
  }

  dom.parseDataBtn.addEventListener('click', () => {
    parsedData = parseDataFromText(dom.dataTextarea.value);
    if (parsedData) {
      updateDataPreview();
      renderChart();
      showToast('Data parsed successfully', 'success');
    } else {
      showToast('Could not parse data', 'error');
    }
  });

  // ═══════════════════════════════════════════
  //  CSV File Upload
  // ═══════════════════════════════════════════

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
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  });

  dom.csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCSVFile(file);
  });

  function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      dom.dataTextarea.value = text;
      parsedData = parseDataFromText(text);
      if (parsedData) {
        // Switch to paste tab to show data
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        $$('.tab-btn')[0].classList.add('active');
        $('#tab-paste').classList.add('active');

        updateDataPreview();
        renderChart();
        showToast(`Loaded ${file.name}`, 'success');
      }
    };
    reader.readAsText(file);
  }

  // ═══════════════════════════════════════════
  //  Manual Data Entry
  // ═══════════════════════════════════════════

  let seriesCount = 1;

  dom.addRowBtn.addEventListener('click', () => {
    addManualRow();
  });

  dom.addSeriesBtn.addEventListener('click', () => {
    seriesCount++;
    // Add header
    const headerCell = document.createElement('input');
    headerCell.type = 'text';
    headerCell.className = 'manual-cell header-cell';
    headerCell.value = `Series ${seriesCount}`;
    dom.addSeriesBtn.parentElement.insertBefore(headerCell, dom.addSeriesBtn);

    // Add cells to existing rows
    dom.manualRows.querySelectorAll('.manual-row').forEach(row => {
      const cell = document.createElement('input');
      cell.type = 'number';
      cell.className = 'manual-cell';
      cell.placeholder = 'Value';
      row.appendChild(cell);
    });
  });

  function addManualRow() {
    const row = document.createElement('div');
    row.className = 'manual-row';
    row.innerHTML = `<input type="text" class="manual-cell" placeholder="Label">`;
    for (let i = 0; i < seriesCount; i++) {
      row.innerHTML += `<input type="number" class="manual-cell" placeholder="Value">`;
    }
    dom.manualRows.appendChild(row);
  }

  // Parse manual data when fields change
  dom.manualRows.addEventListener('input', () => {
    parseManualData();
  });

  function parseManualData() {
    const rows = dom.manualRows.querySelectorAll('.manual-row');
    const labels = [];
    const datasets = [];

    for (let i = 0; i < seriesCount; i++) {
      datasets.push({ name: `Series ${i + 1}`, values: [] });
    }

    rows.forEach(row => {
      const cells = row.querySelectorAll('.manual-cell');
      const label = cells[0]?.value;
      if (!label) return;
      labels.push(label);
      for (let i = 1; i < cells.length; i++) {
        if (datasets[i - 1]) {
          datasets[i - 1].values.push(parseFloat(cells[i].value) || 0);
        }
      }
    });

    if (labels.length > 0) {
      parsedData = { labels, datasets };
      updateDataPreview();
      renderChart();
    }
  }

  // ═══════════════════════════════════════════
  //  Timeline Events
  // ═══════════════════════════════════════════

  dom.addTimelineEvent.addEventListener('click', () => {
    timelineEvents.push({ label: '', position: '' });
    renderTimelineEvents();
  });

  function renderTimelineEvents() {
    dom.timelineEventsList.innerHTML = '';
    timelineEvents.forEach((evt, i) => {
      const row = document.createElement('div');
      row.className = 'timeline-event-row';
      row.innerHTML = `
        <input type="text" placeholder="Label index (e.g. Mar 2024)" value="${evt.position}" data-field="position" data-index="${i}">
        <input type="text" placeholder="Event name" value="${evt.label}" data-field="label" data-index="${i}">
        <button class="btn-remove" data-index="${i}">&times;</button>
      `;
      dom.timelineEventsList.appendChild(row);
    });

    // Bind events
    dom.timelineEventsList.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        timelineEvents[idx][field] = e.target.value;
        renderChart();
      });
    });

    dom.timelineEventsList.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        timelineEvents.splice(idx, 1);
        renderTimelineEvents();
        renderChart();
      });
    });
  }

  // ═══════════════════════════════════════════
  //  Data Preview
  // ═══════════════════════════════════════════

  function updateDataPreview() {
    if (!parsedData) {
      dom.dataPreview.innerHTML = '<p class="placeholder-text">No data loaded yet</p>';
      return;
    }

    const { labels, datasets } = parsedData;
    let html = '<table><thead><tr><th>Label</th>';
    datasets.forEach(ds => { html += `<th>${ds.name}</th>`; });
    html += '</tr></thead><tbody>';

    labels.forEach((label, i) => {
      html += `<tr><td>${label}</td>`;
      datasets.forEach(ds => {
        html += `<td>${ds.values[i] != null ? ds.values[i] : '—'}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    dom.dataPreview.innerHTML = html;
  }

  // ═══════════════════════════════════════════
  //  Chart Settings Listeners
  // ═══════════════════════════════════════════

  [dom.chartTitle, dom.chartSubtitle, dom.chartSource, dom.chartCurve,
   dom.showLegend, dom.showGrid, dom.showDataLabels]
    .forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => renderChart());
      el.addEventListener('change', () => renderChart());
    });

  // ═══════════════════════════════════════════
  //  Chart Rendering
  // ═══════════════════════════════════════════

  function getThemeColors() {
    return PALETTE[currentTheme];
  }

  function getMultiColors() {
    return currentTheme === 'dark' ? MULTI_COLORS : MULTI_COLORS_LIGHT;
  }

  function getBaseChartOptions() {
    const c = getThemeColors();
    const showGrid = dom.showGrid.checked;
    const showLegend = dom.showLegend.checked;
    const showDataLabels = dom.showDataLabels.checked;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      layout: {
        padding: {
          top: dom.chartTitle.value ? 8 : 4,
          bottom: dom.chartSource.value ? 24 : 8,
          left: 4,
          right: 4
        }
      },
      plugins: {
        title: {
          display: !!dom.chartTitle.value,
          text: dom.chartTitle.value,
          color: c.text,
          font: { size: 16, weight: '600', family: "'Inter', sans-serif" },
          padding: { bottom: dom.chartSubtitle.value ? 2 : 12 }
        },
        subtitle: {
          display: !!dom.chartSubtitle.value,
          text: dom.chartSubtitle.value,
          color: c.textSecondary,
          font: { size: 11, weight: '400', family: "'Inter', sans-serif" },
          padding: { bottom: 16 }
        },
        legend: {
          display: showLegend,
          position: 'top',
          align: 'end',
          labels: {
            color: c.textSecondary,
            font: { size: 11, family: "'Inter', sans-serif" },
            boxWidth: 12,
            boxHeight: 3,
            borderRadius: 2,
            padding: 16,
            usePointStyle: false
          }
        },
        tooltip: {
          backgroundColor: currentTheme === 'dark' ? '#1e293b' : '#fff',
          titleColor: c.text,
          bodyColor: c.textSecondary,
          borderColor: c.border,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          titleFont: { size: 12, weight: '600', family: "'Inter', sans-serif" },
          bodyFont: { size: 11, family: "'Inter', sans-serif" },
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4
        },
        datalabels: {
          display: showDataLabels,
          color: c.text,
          font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
          anchor: 'end',
          align: 'top',
          offset: 4
        }
      },
      scales: {
        x: {
          grid: {
            display: showGrid,
            color: c.grid,
            lineWidth: 0.5
          },
          ticks: {
            color: c.textSecondary,
            font: { size: 10, family: "'Inter', sans-serif" },
            padding: 6
          },
          border: {
            display: false
          }
        },
        y: {
          grid: {
            display: showGrid,
            color: c.grid,
            lineWidth: 0.5
          },
          ticks: {
            color: c.textSecondary,
            font: { size: 10, family: "'Inter', sans-serif" },
            padding: 8
          },
          border: {
            display: false
          }
        }
      }
    };
  }

  // ── Source Footer Plugin ──
  const sourceFooterPlugin = {
    id: 'sourceFooter',
    afterDraw(chart) {
      const source = dom.chartSource.value;
      if (!source) return;
      const ctx = chart.ctx;
      const c = getThemeColors();
      ctx.save();
      ctx.font = `400 9px 'Inter', sans-serif`;
      ctx.fillStyle = c.textMuted;
      ctx.textAlign = 'left';
      ctx.fillText(`Source: ${source}`, chart.chartArea.left, chart.height - 6);
      ctx.restore();
    }
  };

  // ── BG Plugin ──
  const bgPlugin = {
    id: 'customBg',
    beforeDraw(chart) {
      const ctx = chart.ctx;
      const c = getThemeColors();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  function renderChart() {
    if (!parsedData) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const c = getThemeColors();
    const colors = getMultiColors();
    const { labels, datasets } = parsedData;
    const tension = parseFloat(dom.chartCurve.value);

    let config;

    switch (currentChartType) {
      case 'line':
        config = buildLineChart(labels, datasets, c, colors, tension);
        break;
      case 'timeline':
        config = buildTimelineChart(labels, datasets, c, colors, tension);
        break;
      case 'bar':
        config = buildBarChart(labels, datasets, c, colors);
        break;
      case 'pie':
        config = buildPieChart(labels, datasets, c, colors);
        break;
      case 'donut':
        config = buildDonutChart(labels, datasets, c, colors);
        break;
      case 'area':
        config = buildAreaChart(labels, datasets, c, colors, tension);
        break;
      case 'radar':
        config = buildRadarChart(labels, datasets, c, colors);
        break;
      case 'scatter':
        config = buildScatterChart(labels, datasets, c, colors);
        break;
      case 'waterfall':
        config = buildWaterfallChart(labels, datasets, c, colors);
        break;
      default:
        config = buildLineChart(labels, datasets, c, colors, tension);
    }

    // Register plugins
    config.plugins = [bgPlugin, sourceFooterPlugin, ChartDataLabels];

    chartInstance = new Chart(dom.chartCanvas, config);
  }

  // ═══════════════════════════════════════════
  //  Chart Builders
  // ═══════════════════════════════════════════

  function buildLineChart(labels, datasets, c, colors, tension) {
    const opts = getBaseChartOptions();
    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          borderColor: colors[i % colors.length],
          backgroundColor: hexToRgba(colors[i % colors.length], 0.08),
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: c.bg,
          pointBorderWidth: 2,
          tension,
          fill: false
        }))
      },
      options: opts
    };
  }

  function buildTimelineChart(labels, datasets, c, colors, tension) {
    const opts = getBaseChartOptions();

    // Build annotation objects for timeline events
    const annotations = {};
    timelineEvents.forEach((evt, i) => {
      if (!evt.position) return;
      // Find label index
      const labelIndex = labels.findIndex(l =>
        String(l).toLowerCase().trim() === evt.position.toLowerCase().trim()
      );
      if (labelIndex === -1) return;

      annotations[`line_${i}`] = {
        type: 'line',
        xMin: labelIndex,
        xMax: labelIndex,
        borderColor: hexToRgba(c.hero, 0.5),
        borderWidth: 1.5,
        borderDash: [4, 4],
        label: {
          display: true,
          content: evt.label,
          position: 'start',
          backgroundColor: hexToRgba(c.hero, 0.12),
          color: c.hero,
          font: { size: 9, weight: '600', family: "'Inter', sans-serif" },
          padding: { x: 6, y: 3 },
          borderRadius: 4
        }
      };
    });

    opts.plugins.annotation = { annotations };

    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          borderColor: colors[i % colors.length],
          backgroundColor: hexToRgba(colors[i % colors.length], 0.06),
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: c.bg,
          pointBorderWidth: 2,
          tension,
          fill: true
        }))
      },
      options: opts
    };
  }

  function buildBarChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    opts.indexAxis = 'y';
    opts.scales.x.grid.display = dom.showGrid.checked;
    opts.scales.y.grid.display = false;
    opts.plugins.datalabels.anchor = 'end';
    opts.plugins.datalabels.align = 'right';

    return {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          backgroundColor: datasets.length === 1
            ? ds.values.map((_, j) => hexToRgba(colors[j % colors.length], 0.85))
            : hexToRgba(colors[i % colors.length], 0.85),
          borderColor: datasets.length === 1
            ? ds.values.map((_, j) => colors[j % colors.length])
            : colors[i % colors.length],
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.85
        }))
      },
      options: opts
    };
  }

  function buildPieChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    delete opts.scales;
    opts.plugins.datalabels.color = '#fff';
    opts.plugins.datalabels.font = { size: 11, weight: '600', family: "'Inter', sans-serif" };
    opts.plugins.datalabels.anchor = 'center';
    opts.plugins.datalabels.align = 'center';
    opts.plugins.datalabels.formatter = (value, ctx) => {
      const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
      const pct = ((value / total) * 100).toFixed(0);
      return pct > 5 ? `${pct}%` : '';
    };

    return {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: datasets[0].values,
          backgroundColor: labels.map((_, i) => hexToRgba(colors[i % colors.length], 0.85)),
          borderColor: c.bg,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: opts
    };
  }

  function buildDonutChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    delete opts.scales;
    opts.cutout = '62%';
    opts.plugins.datalabels.color = c.text;
    opts.plugins.datalabels.font = { size: 10, weight: '600', family: "'Inter', sans-serif" };
    opts.plugins.datalabels.anchor = 'end';
    opts.plugins.datalabels.align = 'end';
    opts.plugins.datalabels.offset = 6;
    opts.plugins.datalabels.formatter = (value, ctx) => {
      const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
      const pct = ((value / total) * 100).toFixed(0);
      return pct > 4 ? `${ctx.chart.data.labels[ctx.dataIndex]}\n${pct}%` : '';
    };

    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: datasets[0].values,
          backgroundColor: labels.map((_, i) => hexToRgba(colors[i % colors.length], 0.85)),
          borderColor: c.bg,
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: opts
    };
  }

  function buildAreaChart(labels, datasets, c, colors, tension) {
    const opts = getBaseChartOptions();
    opts.scales.y.stacked = true;
    opts.scales.x.stacked = true;

    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          borderColor: colors[i % colors.length],
          backgroundColor: hexToRgba(colors[i % colors.length], 0.2),
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: c.bg,
          pointBorderWidth: 2,
          tension,
          fill: true
        }))
      },
      options: opts
    };
  }

  function buildRadarChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    delete opts.scales;
    opts.scales = {
      r: {
        angleLines: {
          color: c.grid,
          lineWidth: 0.5
        },
        grid: {
          color: c.grid,
          lineWidth: 0.5
        },
        pointLabels: {
          color: c.textSecondary,
          font: { size: 10, weight: '500', family: "'Inter', sans-serif" }
        },
        ticks: {
          display: false,
          backdropColor: 'transparent'
        },
        suggestedMin: 0,
        suggestedMax: 100
      }
    };
    opts.plugins.datalabels.display = false; // Too cluttered for radar

    return {
      type: 'radar',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.name,
          data: ds.values,
          borderColor: colors[i % colors.length],
          backgroundColor: hexToRgba(colors[i % colors.length], 0.15),
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors[i % colors.length],
          pointBorderColor: c.bg,
          pointBorderWidth: 2
        }))
      },
      options: opts
    };
  }

  function buildScatterChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();

    // Convert labels (X) and first dataset (Y) into scatter points
    const points = labels.map((label, i) => ({
      x: typeof label === 'number' ? label : parseFloat(label) || i,
      y: datasets[0].values[i]
    }));

    opts.plugins.datalabels.display = false;

    return {
      type: 'scatter',
      data: {
        datasets: [{
          label: datasets[0].name || 'Data',
          data: points,
          backgroundColor: hexToRgba(c.hero, 0.7),
          borderColor: c.hero,
          borderWidth: 1.5,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: c.bg
        }]
      },
      options: opts
    };
  }

  function buildWaterfallChart(labels, datasets, c, colors) {
    const opts = getBaseChartOptions();
    const values = datasets[0].values;

    // Build waterfall bars
    let cumulative = 0;
    const bases = [];
    const positives = [];
    const negatives = [];
    const isTotal = [];

    values.forEach((val, i) => {
      // If it's the last value, or value equals cumulative, treat as total
      const isTotalBar = i === values.length - 1 ||
        (i > 0 && Math.abs(val - cumulative) < 0.01);

      if (i === 0 || isTotalBar) {
        // Starting bar or total
        if (i === 0) {
          bases.push(0);
          positives.push(val);
          negatives.push(0);
          cumulative = val;
        } else {
          bases.push(0);
          positives.push(cumulative);
          negatives.push(0);
        }
        isTotal.push(true);
      } else if (val >= 0) {
        bases.push(cumulative);
        positives.push(val);
        negatives.push(0);
        cumulative += val;
        isTotal.push(false);
      } else {
        bases.push(cumulative + val);
        positives.push(0);
        negatives.push(Math.abs(val));
        cumulative += val;
        isTotal.push(false);
      }
    });

    opts.scales.x.stacked = true;
    opts.scales.y.stacked = true;
    opts.plugins.datalabels.display = dom.showDataLabels.checked;
    opts.plugins.datalabels.formatter = (value, ctx) => {
      if (ctx.datasetIndex === 0) return '';
      return value || '';
    };

    // Determine bar colors
    const barColorsBg = values.map((v, i) => {
      if (isTotal[i]) return hexToRgba(c.hero, 0.85);
      return v >= 0 ? hexToRgba('#34D399', 0.85) : hexToRgba('#F87171', 0.85);
    });
    const barColorsBorder = values.map((v, i) => {
      if (isTotal[i]) return c.hero;
      return v >= 0 ? '#34D399' : '#F87171';
    });

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Base',
            data: bases,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Increase',
            data: positives,
            backgroundColor: barColorsBg,
            borderColor: barColorsBorder,
            borderWidth: 1,
            borderRadius: { topLeft: 3, topRight: 3 },
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Decrease',
            data: negatives,
            backgroundColor: barColorsBg,
            borderColor: barColorsBorder,
            borderWidth: 1,
            borderRadius: { topLeft: 3, topRight: 3 },
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        ...opts,
        plugins: {
          ...opts.plugins,
          legend: { display: false }
        }
      }
    };
  }

  // ═══════════════════════════════════════════
  //  Export
  // ═══════════════════════════════════════════

  dom.exportBtn.addEventListener('click', exportChart);

  function exportChart() {
    if (!chartInstance) {
      showToast('No chart to export', 'error');
      return;
    }

    const sizeStr = dom.exportSize.value;
    const [w, h] = sizeStr.split('x').map(Number);

    // Create offscreen canvas
    const wrapper = document.createElement('div');
    wrapper.className = 'export-canvas-wrapper';
    wrapper.style.width = w + 'px';
    wrapper.style.height = h + 'px';
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w * 2;  // 2x for retina
    offCanvas.height = h * 2;
    offCanvas.style.width = w + 'px';
    offCanvas.style.height = h + 'px';
    wrapper.appendChild(offCanvas);
    document.body.appendChild(wrapper);

    // Rebuild chart on offscreen canvas
    const currentConfig = chartInstance.config;
    const exportConfig = JSON.parse(JSON.stringify(currentConfig));

    // Scale up fonts for export
    const scaleFonts = (obj) => {
      if (!obj) return;
      if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          if (key === 'size' && typeof obj[key] === 'number') {
            obj[key] = Math.round(obj[key] * 1.5);
          } else {
            scaleFonts(obj[key]);
          }
        }
      }
    };
    scaleFonts(exportConfig.options);

    // Increase padding
    if (exportConfig.options.layout) {
      const pad = exportConfig.options.layout.padding;
      if (typeof pad === 'object') {
        Object.keys(pad).forEach(k => { pad[k] = Math.round(pad[k] * 2.5); });
      }
    }

    exportConfig.options.animation = false;
    exportConfig.options.responsive = false;
    exportConfig.options.maintainAspectRatio = false;

    const exportChart = new Chart(offCanvas, {
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
      }, ChartDataLabels]
    });

    // Wait for render, then export
    requestAnimationFrame(() => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `chart-${currentChartType}-${Date.now()}.png`;
        link.href = offCanvas.toDataURL('image/png', 1.0);
        link.click();

        exportChart.destroy();
        document.body.removeChild(wrapper);
        showToast('Chart exported!', 'success');
      }, 200);
    });
  }

  // ═══════════════════════════════════════════
  //  Utilities
  // ═══════════════════════════════════════════

  function hexToRgba(hex, alpha = 1) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function showToast(message, type = 'success') {
    // Remove existing toasts
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

  // ═══════════════════════════════════════════
  //  Clipboard Paste
  // ═══════════════════════════════════════════

  document.addEventListener('paste', (e) => {
    // Only handle if not focused on input/textarea
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const text = e.clipboardData?.getData('text');
    if (!text) return;

    dom.dataTextarea.value = text;
    parsedData = parseDataFromText(text);
    if (parsedData) {
      updateDataPreview();
      renderChart();
      showToast('Data pasted and parsed!', 'success');
    }
  });

  // ═══════════════════════════════════════════
  //  Keyboard Shortcuts
  // ═══════════════════════════════════════════

  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + E = Export
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      exportChart();
    }
    // Cmd/Ctrl + D = Toggle theme
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }
  });

  // ═══════════════════════════════════════════
  //  Init
  // ═══════════════════════════════════════════

  function init() {
    Chart.register(ChartDataLabels);
    // Disable datalabels globally by default
    Chart.defaults.plugins.datalabels.display = false;

    loadSampleData();
  }

  init();

})();
