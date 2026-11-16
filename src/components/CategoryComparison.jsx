import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { aggregateByCategoryMonth, getWindowMonths, fmtMonth, fmtAED } from '../utils';
import { getCatStyle } from '../constants';
import { barLabelPlugin } from '../barLabelPlugin';
import styles from './CategoryComparison.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, barLabelPlugin);

const WINDOW_SIZE = 4;    // matches the trend chart
const MAX_ALL_MONTHS = 12; // cap for "All months" so the grid stays readable

/**
 * Small-multiple bar charts: one per category, one bar per month in the
 * window, with the selected month highlighted. Expects amortized rows.
 */
export default function CategoryComparison({ data, selectedMonth, onSelect, active }) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isAll = selectedMonth === 'all';

  const { months, cards } = useMemo(() => {
    const allMonths = [...new Set(data.map((t) => t.date.slice(0, 7)))].sort();
    const months = getWindowMonths(allMonths, selectedMonth, WINDOW_SIZE, MAX_ALL_MONTHS);
    const byCat = aggregateByCategoryMonth(data);

    const cards = Object.entries(byCat)
      .map(([category, perMonth]) => {
        const values = months.map((m) => perMonth[m] || 0);
        const windowTotal = values.reduce((s, v) => s + v, 0);
        const current = isAll ? 0 : perMonth[selectedMonth] || 0;
        const others = isAll ? values : months.filter((m) => m !== selectedMonth).map((m) => perMonth[m] || 0);
        const avg = others.length ? others.reduce((s, v) => s + v, 0) / others.length : 0;
        return { category, values, windowTotal, current, avg };
      })
      .filter((c) => c.windowTotal > 0)
      .sort((a, b) => (isAll ? b.windowTotal - a.windowTotal : b.current - a.current || b.windowTotal - a.windowTotal));

    return { months, cards };
  }, [data, selectedMonth, isAll]);

  if (cards.length === 0) return null;

  const range = months.length > 1
    ? `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}`
    : fmtMonth(months[0]);

  return (
    <div className={styles.section}>
      <div className={styles.heading}>
        <span className={styles.label}>Category comparison</span>
        <span className={styles.range}>
          {range}{isAll && months.length === MAX_ALL_MONTHS ? ' · latest 12 months' : ''}
        </span>
      </div>
      <div className={styles.grid}>
        {cards.map((c) => (
          <CategoryCard
            key={c.category}
            card={c}
            months={months}
            selectedMonth={selectedMonth}
            isAll={isAll}
            isDark={isDark}
            onSelect={onSelect}
            activeMonth={active?.category === c.category ? active.month : null}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ card, months, selectedMonth, isAll, isDark, onSelect, activeMonth }) {
  const { category, values, current, avg } = card;
  const color = getCatStyle(category).color;
  const muted = `${color}${isDark ? '66' : '40'}`; // ~25-40% alpha tint

  const chartData = {
    labels: months.map(fmtMonth),
    datasets: [{
      data: values.map(Math.round),
      backgroundColor: months.map((m) => (isAll || m === selectedMonth ? color : muted)),
      borderColor: months.map((m) => (m === activeMonth ? (isDark ? '#ffffff' : '#1a1a1a') : 'transparent')),
      borderWidth: months.map((m) => (m === activeMonth ? 2 : 0)),
      borderSkipped: false,
      borderRadius: 3,
      barPercentage: 0.7,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 18 } },
    onClick: (evt, elements) => {
      if (!onSelect || !elements.length) return;
      const i = elements[0].index;
      if (values[i] > 0) onSelect(category, months[i]);
    },
    onHover: (evt, elements) => {
      const target = evt.native?.target;
      if (target) target.style.cursor = onSelect && elements.length && values[elements[0].index] > 0 ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => `${category} · ${items[0].label}`,
          label: (ctx) => fmtAED(ctx.raw),
          footer: (items) => (onSelect && items[0]?.raw > 0 ? 'Click for details' : ''),
        },
        footerColor: isDark ? '#aaa' : '#ddd',
        footerFont: { size: 10, weight: 'normal' },
      },
    },
    scales: {
      y: { display: false, beginAtZero: true },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: isDark ? '#aaa' : '#888',
          font: { size: 10 },
          autoSkip: true,
          maxRotation: 0,
        },
      },
    },
  };

  let delta = null;
  if (isAll) {
    delta = <span className={styles.neutral}>avg {fmtAED(avg)}/mo</span>;
  } else if (avg === 0) {
    delta = current > 0 ? <span className={styles.neutral}>new this window</span> : null;
  } else {
    const pct = Math.round(((current - avg) / avg) * 100);
    const cls = pct > 0 ? styles.up : pct < 0 ? styles.down : styles.neutral;
    const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '';
    delta = <span className={cls}>{arrow} {Math.abs(pct)}% vs avg</span>;
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <button
          type="button"
          className={styles.catName}
          onClick={() => onSelect?.(category, selectedMonth)}
          title={`${category} details`}
        >
          <span className={styles.dot} style={{ background: color }} />
          {category}
        </button>
        {!isAll && <span className={styles.amount}>{fmtAED(current)}</span>}
      </div>
      <div className={styles.delta}>{delta}</div>
      <div className={styles.chart}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
