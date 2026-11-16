/**
 * Format a YYYY-MM string to "Jan 26" style.
 */
export function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${y.slice(2)}`;
}

/**
 * Format a number as "AED 1,234".
 */
export function fmtAED(n) {
  return `AED ${Math.round(n).toLocaleString()}`;
}

/**
 * Format a number as compact: 1234 → "1,234", 12500 → "12.5k".
 */
export function fmtK(n) {
  if (n >= 1000) {
    const v = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return v + 'k';
  }
  return Math.round(n).toLocaleString();
}

/**
 * Extract unique YYYY-MM month strings from transactions, sorted desc.
 */
export function getMonths(data) {
  const set = new Set(data.map((t) => t.date.slice(0, 7)));
  return [...set].sort().reverse();
}

/**
 * Filter transactions by month (or return all if month is 'all').
 */
export function filterByMonth(data, month) {
  if (month === 'all') return data;
  return data.filter((t) => t.date.startsWith(month));
}

/**
 * Aggregate transactions by category. Returns sorted array of [category, total].
 */
export function aggregateByCategory(data) {
  const cats = {};
  data.forEach((t) => {
    cats[t.category] = (cats[t.category] || 0) + t.amount_aed;
  });
  return Object.entries(cats).sort((a, b) => b[1] - a[1]);
}

/**
 * Expand amortized transactions into monthly virtual rows.
 * Transactions with amortize_months > 1 are replaced by N equal virtual rows
 * spread across N consecutive months starting from amortize_start (or the
 * transaction's own date if amortize_start is blank).
 */
export function expandAmortized(transactions) {
  const currentYM = new Date().toISOString().slice(0, 7);
  const result = [];
  for (const t of transactions) {
    if (t.amortize_months <= 1) {
      result.push(t);
      continue;
    }
    const n = t.amortize_months;
    const startStr = t.amortize_start || t.date;
    const [sy, sm] = startStr.slice(0, 7).split('-').map(Number);
    for (let i = 0; i < n; i++) {
      const totalMonths = sm - 1 + i;
      const year = sy + Math.floor(totalMonths / 12);
      const month = (totalMonths % 12) + 1;
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      if (ym > currentYM) break;
      result.push({
        ...t,
        row_id: `${t.row_id}-amort-${i}`,
        date: `${ym}-01`,
        amount_aed: Math.round((t.amount_aed / n) * 100) / 100,
        amount: Math.round((t.amount / n) * 100) / 100,
      });
    }
  }
  return result;
}

/**
 * Aggregate transactions by month. Returns { 'YYYY-MM': total }.
 */
export function aggregateByMonth(data) {
  const monthly = {};
  data.forEach((t) => {
    const ym = t.date.slice(0, 7);
    monthly[ym] = (monthly[ym] || 0) + t.amount_aed;
  });
  return monthly;
}

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];

/**
 * Pick the months to display around a selection.
 * - A month selected: a window of `size` months containing it (selected sits
 *   third, shifted to stay inside the available data).
 * - 'all': the latest `maxAll` months (Infinity = no cap).
 */
export function getWindowMonths(sortedMonths, selectedMonth, size = 4, maxAll = Infinity) {
  if (selectedMonth === 'all') {
    return sortedMonths.slice(Math.max(0, sortedMonths.length - maxAll));
  }
  if (sortedMonths.length <= size) return sortedMonths;
  const i = sortedMonths.indexOf(selectedMonth);
  const idx = i === -1 ? sortedMonths.length - 1 : i;
  let start = idx - 2;
  let end = start + size - 1;
  if (end >= sortedMonths.length) {
    end = sortedMonths.length - 1;
    start = end - (size - 1);
  }
  if (start < 0) start = 0;
  return sortedMonths.slice(start, start + size);
}

/**
 * Aggregate by category and month. Returns { category: { 'YYYY-MM': total } }.
 */
export function aggregateByCategoryMonth(data) {
  const out = {};
  data.forEach((t) => {
    const ym = t.date.slice(0, 7);
    const c = (out[t.category] ||= {});
    c[ym] = (c[ym] || 0) + t.amount_aed;
  });
  return out;
}

/**
 * Lower-cased text a transaction can be searched by: merchant, description,
 * category, source, tags, paid_by, currency, ISO date, month names and amounts.
 */
export function searchText(t) {
  const m = +t.date.slice(5, 7);
  const name = MONTH_NAMES[m - 1] || '';
  return [
    t.merchant_clean, t.description, t.category, t.source, t.tags,
    t.paid_by, t.currency, t.date,
    name, fmtMonth(t.date.slice(0, 7)),
    t.amount_aed.toFixed(2), String(Math.round(t.amount_aed)),
    t.currency !== 'AED' ? `${t.currency} ${t.amount}` : '',
  ].join(' | ').toLowerCase();
}
