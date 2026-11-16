import { useMemo, useState, useRef, useEffect } from 'react';
import { getCatStyle, getSrcStyle } from '../constants';
import { searchText } from '../utils';
import styles from './TransactionTable.module.css';

const PAGE_SIZE = 50;

// Primary key follows the chosen direction; ties always break newest-first
// (amount sort) or largest-first (date sort).
function compare(a, b, key, sign) {
  const byDate = a.date.localeCompare(b.date);
  const byAmount = a.amount_aed - b.amount_aed;
  return key === 'amount'
    ? sign * byAmount || -byDate
    : sign * byDate || -byAmount;
}

export default function TransactionTable({ data }) {
  const [selectedCats, setSelectedCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [showAll, setShowAll] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Collapse back to the first page whenever the visible set changes.
  useEffect(() => { setShowAll(false); }, [data, query, selectedCats, sort]);

  const indexed = useMemo(
    () => data.map((t) => ({ t, text: searchText(t) })),
    [data]
  );

  const allCategories = useMemo(
    () => [...new Set(data.map((t) => t.category))].sort(),
    [data]
  );

  function toggleCat(cat) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleSort(key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }
    );
  }

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return indexed
      .filter(({ t, text }) =>
        (selectedCats.length === 0 || selectedCats.includes(t.category)) &&
        terms.every((term) => text.includes(term))
      )
      .map(({ t }) => t);
  }, [indexed, query, selectedCats]);

  const sorted = useMemo(() => {
    const sign = sort.dir === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => compare(a, b, sort.key, sign));
  }, [filtered, sort]);

  const visible = showAll ? sorted : sorted.slice(0, PAGE_SIZE);
  const isFiltered = query.trim() !== '' || selectedCats.length > 0;

  const countLabel = isFiltered
    ? `${filtered.length} of ${data.length} transactions`
    : `${data.length} transactions`;

  const dropLabel =
    selectedCats.length === 0
      ? 'All categories'
      : selectedCats.length === 1
      ? selectedCats[0]
      : `${selectedCats.length} categories`;

  function sortIndicator(key) {
    if (sort.key !== key) return <span className={styles.sortIdle}>⇅</span>;
    return <span className={styles.sortActive}>{sort.dir === 'desc' ? '▼' : '▲'}</span>;
  }

  function ariaSort(key) {
    if (sort.key !== key) return 'none';
    return sort.dir === 'desc' ? 'descending' : 'ascending';
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Transactions</span>
        <div className={styles.search}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search merchant, category, amount, date…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search transactions"
          />
          {query && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dropdown} ref={dropRef}>
            <button className={styles.dropTrigger} onClick={() => setOpen((o) => !o)}>
              {dropLabel}
              <span className={styles.dropArrow}>{open ? '▲' : '▼'}</span>
            </button>
            {open && (
              <div className={styles.dropPanel}>
                {allCategories.map((cat) => {
                  const catStyle = getCatStyle(cat);
                  return (
                    <label key={cat} className={styles.dropItem}>
                      <input
                        type="checkbox"
                        checked={selectedCats.includes(cat)}
                        onChange={() => toggleCat(cat)}
                      />
                      <span className={styles.catDot} style={{ background: catStyle.color }} />
                      {cat}
                    </label>
                  );
                })}
                {selectedCats.length > 0 && (
                  <button className={styles.clearBtn} onClick={() => setSelectedCats([])}>
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>
          <span className={styles.count}>{countLabel}</span>
        </div>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort('date')}>
                <button type="button" className={styles.sortBtn} onClick={() => toggleSort('date')}>
                  Date {sortIndicator('date')}
                </button>
              </th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Source</th>
              <th aria-sort={ariaSort('amount')} style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  className={`${styles.sortBtn} ${styles.sortBtnRight}`}
                  onClick={() => toggleSort('amount')}
                >
                  Amount (AED) {sortIndicator('amount')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const cat = getCatStyle(t.category);
              const src = getSrcStyle(t.source);
              return (
                <tr key={t.row_id}>
                  <td className={styles.date}>{t.date}</td>
                  <td>{t.merchant_clean || t.description}</td>
                  <td>
                    <span
                      className={styles.catBadge}
                      style={{ background: cat.bg, color: cat.text }}
                    >
                      {t.category}
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.srcBadge}
                      style={{ background: src.bg, color: src.text }}
                    >
                      {t.source}
                    </span>
                  </td>
                  <td className={styles.amount}>
                    {Math.round(t.amount_aed).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className={styles.empty}>
          {query.trim() ? `No transactions match "${query.trim()}"` : 'No transactions'}
        </div>
      )}

      {!showAll && sorted.length > PAGE_SIZE && (
        <button type="button" className={styles.showAll} onClick={() => setShowAll(true)}>
          Show all {sorted.length}
        </button>
      )}
    </div>
  );
}
