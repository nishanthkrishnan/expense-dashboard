import { useMemo } from 'react';
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

export default function CategoryChart({ data, selectedMonth }) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const sorted = useMemo(() => aggregateByCategory(data), [data]);

  const chartData = useMemo(() => {
    const labels = sorted.map((s) => s[0]);
    const values = sorted.map((s) => Math.round(s[1]));
    const colors = labels.map(
      (l) => (CATEGORIES[l] || CATEGORIES['Miscellaneous']).color
    );
    return { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, barPercentage: 0.75, categoryPercentage: 0.85 }] };
  }, [sorted]);

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
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${fmtAED(ctx.raw)} (${Math.round((ctx.raw / total) * 100)}%)`,
        },
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

  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: chartHeight }}>
        <Bar data={chartData} options={options} />
      </div>
    </>
  );
}
