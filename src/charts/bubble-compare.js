import { state } from '../state.js';
import { dom } from '../dom.js';
import { safeInt } from '../utils.js';
import { getThemeColors, bgPlugin, sourceFooterPlugin, brandPlugin, FONTS, getTooltipBase, getLegendBase, ASPECT_RATIOS } from './base-options.js';
import { validateCompareData, calcRatios, getCompareColors, getCategoryYAxis, drawRatioPill, sortCompareData, swapSeries, formatCompareNumber } from './compare-utils.js';
import { registerChart } from './registry.js';

export function renderBubbleCompareChart() {
  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  let data = validateCompareData(state.parsedData);
  if (!data) return;

  // Shared settings
  const sortBy = dom.bubbleSortBy?.value || 'original';
  const shouldSwap = dom.bubbleSwapSeries?.checked;
  const numFmt = dom.bubbleNumberFormat?.value || 'raw';
  const ratioDecimals = parseInt(dom.bubbleRatioDecimals?.value) ?? 1;

  if (shouldSwap) {
    const swapped = swapSeries(data.ds1, data.ds2);
    data = { ...data, ...swapped };
  }
  const sorted = sortCompareData(data.labels, data.ds1, data.ds2, sortBy);
  const { labels, ds1, ds2 } = sorted;

  const c = getThemeColors();
  const colors = getCompareColors();
  const ratios = calcRatios(ds1.values, ds2.values, ratioDecimals);

  // Chart-specific settings
  const maxR = parseInt(dom.bubbleMaxRadius?.value) || 32;
  const gapPx = parseInt(dom.bubbleGapSize?.value) || 0;
  const showRatio = dom.bubbleShowRatio?.checked !== false;
  const showValues = dom.bubbleShowValues?.checked !== false;
  const minR = parseInt(dom.bubbleMinRadius?.value) || 4;
  const bubbleOpacity = parseFloat(dom.bubbleOpacity?.value) || 0.75;
  const arrowStyle = dom.bubbleArrowStyle?.value || 'arrow';
  const showCategoryLabels = dom.bubbleShowCategoryLabels?.checked !== false;

  const bubbleOpacityHex = Math.round(bubbleOpacity * 255).toString(16).padStart(2, '0');

  const allValues = [...ds1.values, ...ds2.values].filter(v => v > 0);
  const maxVal = Math.max(...allValues);
  const bScale = maxR / Math.sqrt(maxVal);

  const earlyRadii = ds1.values.map(v => Math.max(minR, Math.sqrt(Math.max(0, v)) * bScale));
  const modernRadii = ds2.values.map(v => Math.max(minR, Math.sqrt(Math.max(0, v)) * bScale));

  // Fixed x-axis range — gapPx directly controls pixel distance
  const xMin = -0.3;
  const xMax = 1.5;

  const bubbleGapPlugin = {
    id: 'bubbleGap',
    beforeDatasetsDraw(chart) {
      const xScale = chart.scales.x;
      const plotWidth = xScale.right - xScale.left;
      const pxPerUnit = plotWidth / (xScale.max - xScale.min);

      const ds0 = chart.data.datasets[0].data;
      const ds1Data = chart.data.datasets[1].data;

      // Base positions: early bubbles at 30% of plot, modern at 70% of plot
      const baseEarlyPx = xScale.left + plotWidth * 0.25;
      const baseModernPx = xScale.left + plotWidth * 0.75;

      for (let i = 0; i < ds0.length; i++) {
        const r0 = ds0[i].r;
        const r1 = ds1Data[i].r;

        // Shift early bubble left by half the gap, modern bubble right by half
        const halfGap = gapPx / 2;
        const earlyPx = baseEarlyPx - halfGap;
        const modernPx = baseModernPx + halfGap;

        // Clamp to plot bounds
        const clampedEarlyPx = Math.max(xScale.left + r0 + 2, earlyPx);
        const clampedModernPx = Math.min(xScale.right - r1 - 2, modernPx);

        ds0[i].x = xScale.getValueForPixel(clampedEarlyPx);
        ds1Data[i].x = xScale.getValueForPixel(clampedModernPx);
      }
    },
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta0 = chart.getDatasetMeta(0);
      const meta1 = chart.getDatasetMeta(1);
      if (!meta0.data.length || !meta1.data.length) return;

      for (let i = 0; i < meta0.data.length; i++) {
        const p0 = meta0.data[i];
        const p1 = meta1.data[i];
        const r0 = chart.data.datasets[0].data[i].r;
        const r1 = chart.data.datasets[1].data[i].r;

        const startX = p0.x + r0 + 4;
        const endX = p1.x - r1 - 4;
        const y = p0.y;

        if (endX - startX < 16) continue;

        if (arrowStyle !== 'none') {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.strokeStyle = `${c.textMuted}99`;
          ctx.lineWidth = 2;
          ctx.stroke();

          if (arrowStyle === 'arrow') {
            ctx.beginPath();
            ctx.moveTo(endX, y);
            ctx.lineTo(endX - 6, y - 4);
            ctx.lineTo(endX - 6, y + 4);
            ctx.closePath();
            ctx.fillStyle = c.textSecondary;
            ctx.fill();
          }
          ctx.restore();
        }

        if (showRatio) {
          const midX = (startX + endX) / 2;
          drawRatioPill(ctx, midX, y, `\u00D7${ratios[i]}`, c, { paddingWidth: 14, height: 20, cornerRadius: 5, yOffset: 4 });
        }
      }

      // Draw category labels directly on the chart if enabled (hides Y-axis tick labels to avoid duplication)
      if (showCategoryLabels) {
        const yScale = chart.scales.y;
        ctx.save();
        ctx.font = FONTS.tick;
        ctx.fillStyle = c.textSecondary;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < labels.length; i++) {
          const yPx = yScale.getPixelForValue(i);
          ctx.fillText(labels[i], 12, yPx);
        }
        ctx.restore();
      }
    }
  };

  const config = {
    type: 'bubble',
    plugins: [bubbleGapPlugin, bgPlugin, sourceFooterPlugin, brandPlugin, ChartDataLabels],
    data: {
      datasets: [
        {
          label: ds1.name || 'Series 1',
          data: ds1.values.map((v, i) => ({
            x: 0.2,
            y: i,
            r: earlyRadii[i],
            _value: v
          })),
          backgroundColor: `${colors.secondary}${bubbleOpacityHex}`,
          borderColor: colors.secondary,
          borderWidth: 2,
        },
        {
          label: ds2.name || 'Series 2',
          data: ds2.values.map((v, i) => ({
            x: 0.8,
            y: i,
            r: modernRadii[i],
            _value: v
          })),
          backgroundColor: `${colors.primary}${bubbleOpacityHex}`,
          borderColor: colors.primary,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: ASPECT_RATIOS.square,
      animation: { duration: safeInt(dom.animationSpeed?.value, 600), easing: 'easeOutQuart' },
      layout: {
        padding: {
          top: dom.chartTitle?.value ? 8 : 4,
          bottom: dom.chartSource?.value ? 24 : 8,
          left: 10,
          right: 50,
        },
      },
      scales: {
        x: { display: false, min: xMin, max: xMax },
        y: {
          ...getCategoryYAxis(labels),
          ticks: {
            ...getCategoryYAxis(labels).ticks,
            callback: showCategoryLabels ? () => '' : undefined,
          },
        },
      },
      plugins: {
        legend: { ...getLegendBase(), display: dom.showLegend?.checked ?? true },
        tooltip: {
          ...getTooltipBase(),
          callbacks: {
            label(ctx) {
              const val = ctx.raw._value;
              return `${ctx.dataset.label}: ${formatCompareNumber(val, numFmt)}`;
            }
          }
        },
        datalabels: {
          display(ctx) {
            if (!showValues) return false;
            const r = ctx.dataset.data[ctx.dataIndex].r;
            return r > 10;
          },
          color: c.text,
          font: FONTS.datalabels,
          anchor: 'center',
          align: 'center',
          formatter(v, ctx) {
            return formatCompareNumber(ctx.dataset.data[ctx.dataIndex]._value, numFmt);
          },
        },
        title: {
          display: !!dom.chartTitle?.value,
          text: dom.chartTitle?.value || '',
          color: c.text,
          font: FONTS.title,
          padding: { bottom: 8 },
        },
        subtitle: {
          display: !!dom.chartSubtitle?.value,
          text: dom.chartSubtitle?.value || '',
          color: c.textSecondary,
          font: FONTS.subtitle,
          padding: { bottom: 4 },
        },
      },
    }
  };

  state.chartInstance = new Chart(dom.chartCanvas, config);
}

registerChart({
  id: 'bubble-compare',
  label: 'Bubble',
  icon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="14" r="5" fill="currentColor" opacity="0.3"/><circle cx="28" cy="14" r="9" fill="currentColor" opacity="0.2"/><circle cx="12" cy="28" r="3" fill="currentColor" opacity="0.3"/><circle cx="28" cy="28" r="8" fill="currentColor" opacity="0.2"/></svg>',
  isSelfManaged: true,
  builder: () => renderBubbleCompareChart(),
  capabilities: { legend: true },
});
