import { fmtK } from './utils';

/**
 * Chart.js plugin that draws value labels on bars.
 * - Vertical bars: label above the bar.
 * - Horizontal bars: label inside (white) if bar is wide enough, outside otherwise.
 */
export const barLabelPlugin = {
  id: 'barLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      meta.data.forEach((bar, i) => {
        const val = ds.data[i];
        if (!val) return;

        ctx.save();
        ctx.font = `500 11px "DM Sans", sans-serif`;

        if (chart.options.indexAxis === 'y') {
          // Horizontal bar
          const x = bar.x;
          const y = bar.y;
          const barWidth = x - chart.scales.x.getPixelForValue(0);
          const text = fmtK(val);
          const textW = ctx.measureText(text).width;

          if (barWidth > textW + 16) {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x - 8, y);
          } else {
            ctx.fillStyle = isDark ? '#cccccc' : '#555555';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x + 6, y);
          }
        } else {
          // Vertical bar
          ctx.fillStyle = isDark ? '#cccccc' : '#555555';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(fmtK(val), bar.x, bar.y - 4);
        }

        ctx.restore();
      });
    });
  },
};
