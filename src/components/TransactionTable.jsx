import { useMemo, useState, useRef, useEffect } from 'react';
import { getCatStyle, getSrcStyle } from '../constants';
import styles from './TransactionTable.module.css';

export default function TransactionTable({ data }) {
  const [selectedCats, setSelectedCats] = useState([]);
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allCategories = useMemo(
    () => [...new Set(data.map((t) => t.category))].sort(),
    [data]
  );

  function toggleCat(cat) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  const catFiltered = useMemo(
    () => selectedCats.length === 0 ? data : data.filter((t) => selectedCats.includes(t.category)),
    [data, selectedCats]
  );

  const sorted = useMemo(
    () => [...catFiltered].sort((a, b) => b.amount_aed - a.amount_aed).slice(0, 30),
    [catFiltered]
  );

  const countLabel =
    catFiltered.length > 30
      ? `Top 30 of ${catFiltered.length} transactions`
      : `${catFiltered.length} transactions`;

  const dropLabel =
    selectedCats.length === 0
      ? 'All categories'
      : selectedCats.length === 1
      ? selectedCats[0]
      : `${selectedCats.length} categories`;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>Transactions</span>
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
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Merchant</th>
            <th>Category</th>
            <th>Source</th>
            <th style={{ textAlign: 'right' }}>Amount (AED)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
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
  );
}
