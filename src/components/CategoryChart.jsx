import { useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { aggregateByCategory, fmtAED, fmtMonth } from '../utils';
import { CATEGORIES } from '../constants';
import { barLabelPlugin } from '../barLabelPlugin';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, barLabelPlugin);

export default function CategoryChart({ data, selectedMonth, onSelect, activeCategory }) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const sorted = useMemo(() => aggregateByCategory(data), [data]);

  const chartData = useMemo(() => {
    const labels = sorted.map((s) => s[0]);
    const values = sorted.map((s) => Math.round(s[1]));
    const colors = labels.map(
      (l) => (CATEGORIES[l] || CATEGORIES['Miscellaneous']).color
    );
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: labels.map((l) => (l === activeCategory ? (isDark ? '#ffffff' : '#1a1a1a') : 'transparent')),
        borderWidth: labels.map((l) => (l === activeCategory ? 2 : 0)),
        borderSkipped: false,
        borderRadius: 4,
        barPercentage: 0.75,
        categoryPercentage: 0.85,
      }],
    };
  }, [sorted, activeCategory, isDark]);

  // Index of the clicked bar, or of the category label left of the plot.
  function hitIndex(evt, elements, chart) {
    if (elements.length) return elements[0].index;
    const { x, y } = evt;
    if (x < chart.chartArea.left && y >= chart.chartArea.top && y <= chart.chartArea.bottom) {
      const i = Math.round(chart.scales.y.getValueForPixel(y));
      return i >= 0 && i < sorted.length ? i : -1;
    }
    return -1;
  }

  const total = sorted.reduce((s, e) => s + e[1], 0);
  const chartHeight = Math.max(200, sorted.length * 36 + 40);

  const title =
    'Category breakdown' +
    (selectedMonth !== 'all' ? ` — ${fmtMonth(selectedMonth)}` : '') +
    ' (AED)';

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 50 } },
    onHover: (evt, elements, chart) => {
      const target = evt.native?.target;
      if (target) target.style.cursor = onSelect && hitIndex(evt, elements, chart) !== -1 ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${fmtAED(ctx.raw)} (${Math.round((ctx.raw / total) * 100)}%)`,
          footer: () => (onSelect ? 'Click for details' : ''),
        },
        footerColor: isDark ? '#aaa' : '#ddd',
        footerFont: { size: 10, weight: 'normal' },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
        ticks: {
          callback: (v) => Math.round(v / 1000) + 'k',
          color: isDark ? '#aaa' : '#888',
          font: { size: 11 },
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: isDark ? '#ccc' : '#555', font: { size: 12 } },
      },
    },
  };

  // Chart.js only fires options.onClick inside the plot area, so handle clicks
  // (bars and the category labels to their left) in a plugin instead.
  // react-chartjs-2 registers plugins once, so the plugin reads a ref that
  // always holds the latest handler.
  const clickRef = useRef(null);
  clickRef.current = (e, chart) => {
    if (!onSelect) return;
    const elements = chart.getElementsAtEventForMode(e.native, 'nearest', { intersect: true }, false);
    const i = hitIndex(e, elements, chart);
    if (i !== -1) onSelect(sorted[i][0]);
  };
  const clickPlugin = useMemo(() => ({
    id: 'categoryClick',
    afterEvent(chart, args) {
      if (args.event.type === 'click') clickRef.current?.(args.event, chart);
    },
  }), []);

  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: chartHeight }}>
        <Bar data={chartData} options={options} plugins={[clickPlugin]} />
      </div>
    </>
  );
}
