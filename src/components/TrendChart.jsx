import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { aggregateByMonth, fmtMonth, fmtAED, getWindowMonths } from '../utils';
import { barLabelPlugin } from '../barLabelPlugin';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, barLabelPlugin);

export default function TrendChart({ data, selectedMonth }) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const chartData = useMemo(() => {
    const monthly = aggregateByMonth(data);
    const labels = getWindowMonths(Object.keys(monthly).sort(), selectedMonth);

    const values = labels.map((l) => Math.round(monthly[l] ?? 0));
    const active = isDark ? '#5DCAA5' : '#1D9E75';
    const muted = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

    return {
      labels: labels.map(fmtMonth),
      datasets: [
        {
          data: values,
          backgroundColor:
            selectedMonth === 'all'
              ? labels.map(() => active)
              : labels.map((l) => (l === selectedMonth ? active : muted)),
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
      _rawLabels: labels,
    };
  }, [data, selectedMonth, isDark]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => fmtAED(ctx.raw) } },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
        ticks: {
          callback: (v) => Math.round(v / 1000) + 'k',
          color: isDark ? '#aaa' : '#888',
          font: { size: 11 },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: isDark ? '#aaa' : '#888',
          font: { size: 11 },
          autoSkip: false,
        },
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: 280 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
