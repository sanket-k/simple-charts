import { PALETTE, DEFAULT_COLORS, EXTRA_COLORS, CONFIG, SEMANTIC } from '../constants.js';
import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt, safeFloat, hexToRgba, showToast } from '../utils.js';
import { formatNumber } from '../format.js';
import { buildYTickCallback, buildDataLabelFormatter, buildTooltipCallback } from '../chart-format.js';

/** Returns the color palette object for the current theme */
export function getThemeColors() {
  return PALETTE[state.currentTheme];
}

/** Returns user colors + extra colors as a combined palette */
export function getMultiColors() {
  return [...state.userColors, ...EXTRA_COLORS];
}

/** Returns the Y-axis ID for a dataset when dual-axis mode is enabled */
export function getYAxisID(i) {
  if (!state.dualAxisEnabled) return undefined;
  const assign = state.axisAssignments[i] || 'left';
  if (assign === 'hidden') return undefined;
  return assign === 'right' ? 'y1' : 'y';
}

/** Returns true if the X-axis should use Chart.js 'time' scale type */
export function isTimeXAxis() {
  const v = dom.xAxisType?.value || 'auto';
  if (v === 'time') return true;
  if (v === 'auto' && state.parsedData && state.parsedData.isTimeSeries) return true;
  return false;
}

/** Chart.js plugin that fills the entire canvas background with the theme color */
export const bgPlugin = {
  id: 'customBg',
  beforeDraw(chart) {
    const ctx = chart.ctx;
    const c = getThemeColors();
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = state.userBgColor || c.bg;
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

/** Chart.js plugin that draws "Source: ..." text at the bottom-left */
export const sourceFooterPlugin = {
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

/** Chart.js plugin that draws the brand logo and/or name as a watermark overlay */
export const brandPlugin = {
  id: 'brandWatermark',
  afterDraw(chart) {
    const brandNameVal = dom.brandName?.value || '';
    const opacity = safeFloat(dom.brandOpacity?.value, 0.7);
    const position = dom.brandPosition?.value || 'bottom-right';
    const placement = dom.brandLogoPlacement?.value || 'left';
    if (!brandNameVal && !state.brandLogoImg) return;

    const ctx = chart.ctx;
    ctx.save();
    ctx.globalAlpha = opacity;

    const area = chart.chartArea;
    const margin = 12;
    let anchorX, anchorY, hAlign;

    switch (position) {
      case 'bottom-left':
        anchorX = area.left + margin;
        anchorY = area.bottom - margin;
        hAlign = 'left';
        break;
      case 'top-right':
        anchorX = area.right - margin;
        anchorY = area.top + margin + 4;
        hAlign = 'right';
        break;
      case 'top-left':
        anchorX = area.left + margin;
        anchorY = area.top + margin + 4;
        hAlign = 'left';
        break;
      default:
        anchorX = area.right - margin;
        anchorY = area.bottom - margin;
        hAlign = 'right';
    }

    const hasLogo = state.brandLogoImg && state.brandLogoImg.complete && state.brandLogoImg.naturalWidth;
    const gap = 4;

    ctx.font = `600 10px 'Inter', sans-serif`;
    const textW = brandNameVal ? ctx.measureText(brandNameVal).width : 0;
    const textH = 10;

    const logoDrawH = hasLogo ? 16 : 0;
    const logoDrawW = hasLogo ? (state.brandLogoImg.naturalWidth / state.brandLogoImg.naturalHeight) * logoDrawH : 0;

    let groupW, groupH;
    if (!hasLogo) {
      groupW = textW;
      groupH = textH;
    } else if (!brandNameVal) {
      groupW = logoDrawW;
      groupH = logoDrawH;
    } else if (placement === 'left' || placement === 'right') {
      groupW = logoDrawW + gap + textW;
      groupH = Math.max(logoDrawH, textH);
    } else {
      groupW = Math.max(logoDrawW, textW);
      groupH = logoDrawH + gap + textH;
    }

    let groupX = hAlign === 'right' ? anchorX - groupW : anchorX;
    let groupBottom = anchorY;

    if (!hasLogo) {
      const c = getThemeColors();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(brandNameVal, groupX, groupBottom);
    } else if (!brandNameVal) {
      const lx = hAlign === 'right' ? anchorX - logoDrawW : anchorX;
      ctx.drawImage(state.brandLogoImg, lx, groupBottom - logoDrawH, logoDrawW, logoDrawH);
    } else if (placement === 'left') {
      const logoX = groupX;
      const logoY = groupBottom - logoDrawH;
      const textX = groupX + logoDrawW + gap;
      const textY = groupBottom;
      const vOffset = (logoDrawH - textH) / 2;
      ctx.drawImage(state.brandLogoImg, logoX, logoY, logoDrawW, logoDrawH);
      const c = getThemeColors();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(brandNameVal, textX, textY - vOffset);
    } else if (placement === 'right') {
      const textX = groupX;
      const textY = groupBottom;
      const logoX = groupX + textW + gap;
      const logoY = groupBottom - logoDrawH;
      const vOffset = (logoDrawH - textH) / 2;
      const c = getThemeColors();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(brandNameVal, textX, textY - vOffset);
      ctx.drawImage(state.brandLogoImg, logoX, logoY, logoDrawW, logoDrawH);
    } else if (placement === 'top') {
      const logoX = groupX + (groupW - logoDrawW) / 2;
      const logoY = groupBottom - groupH;
      const textX = groupX + (groupW - textW) / 2;
      const textY = groupBottom;
      ctx.drawImage(state.brandLogoImg, logoX, logoY, logoDrawW, logoDrawH);
      const c = getThemeColors();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(brandNameVal, textX, textY);
    } else {
      const textX = groupX + (groupW - textW) / 2;
      const textY = groupBottom - logoDrawH - gap;
      const logoX = groupX + (groupW - logoDrawW) / 2;
      const logoY = groupBottom - logoDrawH;
      const c = getThemeColors();
      ctx.fillStyle = c.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(brandNameVal, textX, textY);
      ctx.drawImage(state.brandLogoImg, logoX, logoY, logoDrawW, logoDrawH);
    }

    ctx.restore();
  }
};

/**
 * Builds the base Chart.js options object shared by all chart types.
 */
export function getBaseChartOptions() {
  const c = getThemeColors();
  const showGrid = dom.showGrid.checked;
  const showLegend = dom.showLegend.checked;
  const showDataLabels = dom.showDataLabels.checked;
  const maxTicks = safeInt(dom.maxTicks.value, 12);
  const yScale = dom.yAxisScale.value;
  const animDuration = safeInt(dom.animationSpeed?.value, 600);
  const legendPos = dom.legendPosition?.value || 'top';
  const tooltipStyle = dom.tooltipStyle?.value || 'default';
  const gridStyleVal = dom.gridStyle?.value || 'solid';
  let yAxisMinVal = dom.yAxisMin?.value !== '' ? safeFloat(dom.yAxisMin.value, undefined) : undefined;
  let yAxisMaxVal = dom.yAxisMax?.value !== '' ? safeFloat(dom.yAxisMax.value, undefined) : undefined;
  const xRotation = safeInt(dom.xAxisRotation?.value, 45);

  // Add 10% buffer to Y-axis when high/low points are enabled and no explicit min/max is set
  const showHL = dom.showHighLowPoints?.checked;
  if (showHL && state.parsedData && yAxisMinVal == null && yAxisMaxVal == null) {
    let allMin = Infinity, allMax = -Infinity;
    state.parsedData.datasets.forEach((ds, i) => {
      if (state.dualAxisEnabled && state.axisAssignments[i] === 'hidden') return;
      ds.values.forEach(v => {
        if (v != null) {
          if (v < allMin) allMin = v;
          if (v > allMax) allMax = v;
        }
      });
    });
    if (allMin !== Infinity && allMax !== -Infinity) {
      const range = allMax - allMin || Math.abs(allMax) || 1;
      yAxisMinVal = allMin - range * 0.1;
      yAxisMaxVal = allMax + range * 0.1;
    }
  }
  const xAxisTypeVal = dom.xAxisType?.value || 'auto';
  const xAxisTitle = dom.xAxisLabel?.value || '';
  const yAxisTitle = dom.yAxisLabel?.value || '';

  const leftAxisTitle = state.dualAxisEnabled ? (state.axisNames.left || yAxisTitle) : yAxisTitle;
  const rightAxisTitle = state.dualAxisEnabled ? (state.axisNames.right || '') : '';

  if (yScale === 'logarithmic' && state.parsedData) {
    const hasNonPositive = state.parsedData.datasets.some(ds =>
      ds.values.some(v => v != null && v <= 0)
    );
    if (hasNonPositive) {
      showToast('Logarithmic scale requires all values > 0. Some values will be filtered.', 'warning');
    }
  }

  let gridDash = [];
  if (gridStyleVal === 'dashed') gridDash = [6, 4];
  else if (gridStyleVal === 'dotted') gridDash = [2, 4];
  const gridVisible = showGrid && gridStyleVal !== 'none';

  const chartBg = state.userBgColor || c.bg;
  const chartGrid = state.userGridColor || c.grid;

  const tickCallback = buildYTickCallback();
  const tooltipLabelCallback = buildTooltipCallback();
  const dlFormatter = buildDataLabelFormatter();

  let tooltipOpts = {
    backgroundColor: state.currentTheme === 'dark' ? '#1e293b' : '#fff',
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
    boxPadding: 4,
    callbacks: {
      label: tooltipLabelCallback
    }
  };

  if (tooltipStyle === 'compact') {
    tooltipOpts.padding = 6;
    tooltipOpts.cornerRadius = 4;
    tooltipOpts.titleFont.size = 10;
    tooltipOpts.bodyFont.size = 10;
    tooltipOpts.boxWidth = 6;
    tooltipOpts.boxHeight = 6;
  } else if (tooltipStyle === 'detailed') {
    tooltipOpts.padding = 14;
    tooltipOpts.cornerRadius = 10;
    tooltipOpts.titleFont.size = 13;
    tooltipOpts.bodyFont.size = 12;
    tooltipOpts.boxWidth = 10;
    tooltipOpts.boxHeight = 10;
    tooltipOpts.boxPadding = 6;
  }

  const annotations = {};

  const refY = dom.refLineY?.value !== '' ? safeFloat(dom.refLineY.value, null) : null;
  if (refY != null) {
    annotations.refLine = {
      type: 'line',
      yMin: refY,
      yMax: refY,
      borderColor: hexToRgba(c.hero, 0.6),
      borderWidth: 1.5,
      borderDash: [4, 4],
      label: {
        display: !!dom.refLineLabel?.value,
        content: dom.refLineLabel?.value || '',
        position: 'end',
        backgroundColor: hexToRgba(c.hero, 0.15),
        color: c.hero,
        font: { size: 10, weight: '600', family: "'Inter', sans-serif" },
        padding: { x: 6, y: 3 },
        borderRadius: 4
      }
    };
  }

  // High/Low point annotations
  if (dom.showHighLowPoints?.checked && state.parsedData && state.parsedData.datasets && !['pie', 'donut', 'radar', 'scatter', 'waterfall', 'segmented', 'innovator'].includes(state.currentChartType)) {
    const useTimeAxis = state.parsedData.isTimeSeries && dom.xAxisType?.value !== 'category';
    state.parsedData.datasets.forEach((ds, dsIdx) => {
      if (state.dualAxisEnabled && state.axisAssignments[dsIdx] === 'hidden') return;
      const rawValues = ds.values.filter(v => v != null);
      if (rawValues.length === 0) return;
      const maxVal = Math.max(...rawValues);
      const minVal = Math.min(...rawValues);
      ds.values.forEach((v, idx) => {
        if (v == null) return;
        const xVal = (useTimeAxis && state.parsedData.dateObjects?.[idx])
          ? state.parsedData.dateObjects[idx].getTime()
          : state.parsedData.labels?.[idx];
        if (xVal == null) return;
        const isFirst = idx === 0;
        const isLast = idx === ds.values.length - 1;
        const xAdj = isFirst ? 28 : isLast ? -28 : 0;
        if (v === maxVal) {
          annotations[`hl_high_${dsIdx}_${idx}`] = {
            type: 'label',
            xValue: xVal,
            yValue: v,
            content: formatNumber(v),
            color: '#34D399',
            backgroundColor: 'rgba(52, 211, 153, 0.12)',
            font: { size: 10, weight: '600', family: "'Inter', sans-serif" },
            padding: { x: 5, y: 3 },
            borderRadius: 4,
            yAdjust: -12,
            xAdjust: xAdj
          };
        }
        if (v === minVal && minVal !== maxVal) {
          annotations[`hl_low_${dsIdx}_${idx}`] = {
            type: 'label',
            xValue: xVal,
            yValue: v,
            content: formatNumber(v),
            color: '#F87171',
            backgroundColor: 'rgba(248, 113, 113, 0.12)',
            font: { size: 10, weight: '600', family: "'Inter', sans-serif" },
            padding: { x: 5, y: 3 },
            borderRadius: 4,
            yAdjust: 20,
            xAdjust: xAdj
          };
        }
      });
    });
  }

  const resolvedXType = (() => {
    if (xAxisTypeVal === 'auto') {
      if (state.parsedData && state.parsedData.isTimeSeries) return 'time';
      return 'category';
    }
    return xAxisTypeVal;
  })();

  const xAxisTitleOpts = {
    display: !!xAxisTitle,
    text: xAxisTitle,
    color: c.textSecondary,
    font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
    padding: { top: 6 }
  };

  const yAxisTitleOpts = {
    display: !!leftAxisTitle,
    text: leftAxisTitle,
    color: c.textSecondary,
    font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
    padding: { bottom: 4 }
  };

  const xScaleBase = {
    grid: {
      display: gridVisible,
      color: chartGrid,
      lineWidth: 0.5,
      borderDash: gridDash
    },
    ticks: {
      color: c.textSecondary,
      font: { size: 10, family: "'Inter', sans-serif" },
      padding: 6,
      maxTicksLimit: maxTicks,
      maxRotation: xRotation,
      autoSkip: true
    },
    title: xAxisTitleOpts,
    border: { display: false }
  };

  if (resolvedXType === 'time') {
    const dateFmt = dom.dateFormat?.value || 'auto';
    xScaleBase.type = 'time';
    xScaleBase.time = {
      unit: (() => {
        if (dateFmt !== 'auto') return undefined;
        if (!state.parsedData || !state.parsedData.dateRange) return undefined;
        const days = (state.parsedData.dateRange.max - state.parsedData.dateRange.min) / 86400000;
        if (days > 365 * 3) return 'year';
        if (days > 30) return 'month';
        if (days > 7) return 'day';
        return 'day';
      })(),
      displayFormats: {
        day: dateFmt === 'auto' ? 'dd MMM' : undefined,
        month: dateFmt === 'auto' ? 'MMM yyyy' : (dateFmt === 'MMM yy' ? 'MMM yy' : 'MMM yyyy'),
        year: 'yyyy'
      }
    };
    xScaleBase.adapters = { date: {} };
  } else if (resolvedXType === 'linear') {
    xScaleBase.type = 'linear';
  }

  const yScaleBase = {
    type: yScale,
    position: 'left',
    min: yAxisMinVal,
    max: yAxisMaxVal,
    title: yAxisTitleOpts,
    grid: {
      display: gridVisible,
      color: chartGrid,
      lineWidth: 0.5,
      borderDash: gridDash
    },
    ticks: {
      color: c.textSecondary,
      font: { size: 10, family: "'Inter', sans-serif" },
      padding: 8,
      callback: tickCallback
    },
    border: { display: false }
  };

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: animDuration,
      easing: 'easeOutQuart'
    },
    layout: {
      padding: {
        top: dom.chartTitle.value ? (dom.showHighLowPoints?.checked ? 28 : 8) : (dom.showHighLowPoints?.checked ? 24 : 4),
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
        position: legendPos,
        align: 'end',
        labels: {
          color: c.textSecondary,
          font: { size: 11, family: "'Inter', sans-serif" },
          boxWidth: 8,
          boxHeight: 8,
          borderRadius: 4,
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: (chart) => {
            const isPieOrDonut = chart.config.type === 'pie' || chart.config.type === 'doughnut';
            if (isPieOrDonut) {
              const ds = chart.data.datasets[0];
              return (chart.data.labels || []).map((label, i) => ({
                text: label,
                fillStyle: Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor,
                strokeStyle: Array.isArray(ds.borderColor) ? ds.borderColor[i] : ds.borderColor,
                fontColor: c.textSecondary,
                lineWidth: 2,
                hidden: !chart.getDataVisibility(i),
                datasetIndex: 0,
                index: i,
                pointStyle: 'circle'
              }));
            }
            return chart.data.datasets.map((dataset, i) => {
              const hidden = !chart.isDatasetVisible(i);
              const color = dataset.borderColor;
              return {
                text: dataset.label,
                fillStyle: color,
                strokeStyle: color,
                fontColor: c.textSecondary,
                lineWidth: 2,
                hidden,
                datasetIndex: i,
                index: i,
                pointStyle: 'circle'
              };
            });
          }
        },
        onClick: (e, legendItem, legend) => {
          const ci = legend.chart;
          const isPieOrDonut = ci.config.type === 'pie' || ci.config.type === 'doughnut';

          if (isPieOrDonut) {
            const index = legendItem.index;
            ci.toggleDataVisibility(index);
            ci.update();
            return;
          }

          const index = legendItem.datasetIndex;
          const meta = ci.getDatasetMeta(index);
          meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
          ci.update();
          const ann = ci.options.plugins.annotation?.annotations;
          if (ann) {
            const isHidden = meta.hidden;
            Object.keys(ann).forEach(key => {
              if (key.startsWith(`hl_high_${index}_`) || key.startsWith(`hl_low_${index}_`)) {
                ann[key].display = !isHidden;
              }
            });
            ci.update('none');
          }
        }
      },
      tooltip: tooltipOpts,
      datalabels: {
        display: showDataLabels,
        color: c.text,
        font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
        anchor: 'end',
        align: 'top',
        offset: 4,
        formatter: dlFormatter
      },
      annotation: { annotations }
    },
    scales: {
      x: xScaleBase,
      y: yScaleBase,
      y1: {
        type: yScale,
        position: 'right',
        min: yAxisMinVal,
        max: yAxisMaxVal,
        title: {
          display: !!rightAxisTitle,
          text: rightAxisTitle,
          color: c.textSecondary,
          font: { size: 10, weight: '500', family: "'Inter', sans-serif" },
          padding: { bottom: 4 }
        },
        grid: { display: false },
        ticks: {
          color: c.textSecondary,
          font: { size: 10, family: "'Inter', sans-serif" },
          padding: 8,
          callback: tickCallback
        },
        border: { display: false }
      }
    }
  };
}
