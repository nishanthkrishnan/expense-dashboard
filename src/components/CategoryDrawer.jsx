import { useEffect, useMemo, useRef, useState } from 'react';
import { getCatStyle, getSrcStyle } from '../constants';
import { fmtAED, fmtMonth, getWindowMonths } from '../utils';
import styles from './CategoryDrawer.module.css';

const TOP_MERCHANTS = 5;

function merchantOf(t) {
  return t.merchant_clean || t.description || 'Unknown';
}

function fmtDay(date) {
  const d = date.slice(8, 10);
  return `${fmtMonth(date.slice(0, 7)).slice(0, 3)} ${d}`;
}

/**
 * Details panel for one category in one month (or all months).
 * drill = { category, month: 'YYYY-MM' | 'all', mode: 'amortized' | 'actual' }
 */
export default function CategoryDrawer({ drill, actual, amortized, onChange, onClose }) {
  const panelRef = useRef(null);
  const returnFocus = useRef(null);
  const [merchant, setMerchant] = useState(null);
  const [sortBy, setSortBy] = useState('amount');

  const { category, month, mode } = drill;
  const source = mode === 'amortized' ? amortized : actual;
  const cat = getCatStyle(category);

  // Focus management, Esc to close, lock page scroll while open.
  useEffect(() => {
    returnFocus.current = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [onClose]);

  // Reset merchant filter when switching category/month/mode.
  useEffect(() => { setMerchant(null); }, [category, month, mode]);

  const allMonths = useMemo(
    () => [...new Set(source.map((t) => t.date.slice(0, 7)))].sort(),
    [source]
  );

  const rows = useMemo(
    () => source.filter((t) =>
      t.category === category && (month === 'all' || t.date.startsWith(month))
    ),
    [source, category, month]
  );

  const total = rows.reduce((s, t) => s + t.amount_aed, 0);

  const delta = useMemo(() => {
    if (month === 'all') return null;
    const others = getWindowMonths(allMonths, month).filter((m) => m !== month);
    if (!others.length) return null;
    const sum = source
      .filter((t) => t.category === category && others.includes(t.date.slice(0, 7)))
      .reduce((s, t) => s + t.amount_aed, 0);
    const avg = sum / others.length;
    if (avg === 0) return null;
    return Math.round(((total - avg) / avg) * 100);
  }, [source, allMonths, category, month, total]);

  const merchants = useMemo(() => {
    const by = {};
    rows.forEach((t) => {
      const k = merchantOf(t);
      by[k] = (by[k] || 0) + t.amount_aed;
    });
    const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_MERCHANTS);
    const rest = sorted.slice(TOP_MERCHANTS);
    return {
      top,
      restCount: rest.length,
      restTotal: rest.reduce((s, [, v]) => s + v, 0),
    };
  }, [rows]);

  const listed = useMemo(() => {
    const r = merchant ? rows.filter((t) => merchantOf(t) === merchant) : rows;
    return [...r].sort((a, b) =>
      sortBy === 'amount'
        ? b.amount_aed - a.amount_aed || b.date.localeCompare(a.date)
        : b.date.localeCompare(a.date) || b.amount_aed - a.amount_aed
    );
  }, [rows, merchant, sortBy]);

  const mi = allMonths.indexOf(month);
  const prev = mi > 0 ? allMonths[mi - 1] : null;
  const next = mi !== -1 && mi < allMonths.length - 1 ? allMonths[mi + 1] : null;
  const maxMerchant = merchants.top[0]?.[1] || 1;

  return (
    <div className={styles.root}>
      <div className={styles.scrim} onClick={onClose} />
      <aside
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${category} details`}
        tabIndex={-1}
      >
        <header className={styles.head}>
          <div className={styles.titleRow}>
            <span className={styles.title}>
              <span className={styles.dot} style={{ background: cat.color }} />
              {category}
            </span>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">✕</button>
          </div>

          {month !== 'all' ? (
            <div className={styles.monthNav}>
              <button
                type="button"
                className={styles.navBtn}
                disabled={!prev}
                onClick={() => onChange({ ...drill, month: prev })}
                aria-label="Previous month"
              >
                ‹ {prev ? fmtMonth(prev) : ''}
              </button>
              <span className={styles.monthCurrent}>{fmtMonth(month)}</span>
              <button
                type="button"
                className={styles.navBtn}
                disabled={!next}
                onClick={() => onChange({ ...drill, month: next })}
                aria-label="Next month"
              >
                {next ? fmtMonth(next) : ''} ›
              </button>
            </div>
          ) : (
            <div className={styles.monthNav}><span className={styles.monthCurrent}>All months</span></div>
          )}

          <div className={styles.summary}>
            <span className={styles.total}>{fmtAED(total)}</span>
            <span className={styles.muted}>· {rows.length} transaction{rows.length === 1 ? '' : 's'}</span>
          </div>
          <div className={styles.metaRow}>
            {delta !== null && (
              <span className={delta > 0 ? styles.up : delta < 0 ? styles.down : styles.muted}>
                {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {Math.abs(delta)}% vs window avg
              </span>
            )}
            <span className={styles.chip}>{mode === 'amortized' ? 'Amortized' : 'Actual'}</span>
          </div>
        </header>

        <div className={styles.body}>
          {rows.length === 0 ? (
            <div className={styles.empty}>No {category} spend in {month === 'all' ? 'this period' : fmtMonth(month)}.</div>
          ) : (
            <>
              <section className={styles.section}>
                <div className={styles.sectionLabel}>Top merchants</div>
                {merchants.top.map(([name, value]) => {
                  const active = merchant === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`${styles.merchant} ${active ? styles.merchantActive : ''} ${merchant && !active ? styles.merchantDim : ''}`}
                      onClick={() => setMerchant(active ? null : name)}
                      aria-pressed={active}
                    >
                      <span className={styles.merchantName}>{name}</span>
                      <span className={styles.merchantBarTrack}>
                        <span
                          className={styles.merchantBar}
                          style={{ width: `${(value / maxMerchant) * 100}%`, background: cat.color }}
                        />
                      </span>
                      <span className={styles.merchantPct}>{Math.round((value / total) * 100)}%</span>
                    </button>
                  );
                })}
                {merchants.restCount > 0 && (
                  <div className={styles.more}>
                    +{merchants.restCount} more · {fmtAED(merchants.restTotal)} ({Math.round((merchants.restTotal / total) * 100)}%)
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.listHead}>
                  <span className={styles.sectionLabel}>
                    Transactions{merchant ? ` · ${merchant}` : ''}
                  </span>
                  <span className={styles.sortToggle}>
                    {['amount', 'date'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`${styles.sortOpt} ${sortBy === k ? styles.sortOptActive : ''}`}
                        onClick={() => setSortBy(k)}
                      >
                        {k === 'amount' ? 'Amount' : 'Date'}
                      </button>
                    ))}
                  </span>
                </div>
                <ul className={styles.list}>
                  {listed.map((t) => {
                    const src = getSrcStyle(t.source);
                    const isSlice = t.amort_total > 1;
                    return (
                      <li key={t.row_id} className={styles.item}>
                        <div className={styles.itemMain}>
                          <span className={styles.itemDate}>
                            {isSlice ? fmtMonth(t.date.slice(0, 7)).slice(0, 3) : fmtDay(t.date)}
                          </span>
                          <span className={styles.itemName}>{merchantOf(t)}</span>
                          <span className={styles.itemAmt}>{Math.round(t.amount_aed).toLocaleString()}</span>
                        </div>
                        <div className={styles.itemSub}>
                          <span className={styles.src} style={{ background: src.bg, color: src.text }}>{t.source}</span>
                          {isSlice && (
                            <span>↻ {t.amort_index + 1}/{t.amort_total} of {fmtAED(t.orig_amount_aed)} · bought {fmtMonth(t.orig_date.slice(0, 7))}</span>
                          )}
                          {t.currency && t.currency !== 'AED' && !isSlice && (
                            <span>{t.currency} {Number(t.amount).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
