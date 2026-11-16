import { useState } from 'react';
import styles from './CollapsibleSection.module.css';

function readOpen(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Section with a clickable header that shows/hides its children.
 * Collapsed by default; open state is remembered per browser under `storageKey`.
 */
export default function CollapsibleSection({ label, summary, storageKey, children }) {
  const [open, setOpen] = useState(() => readOpen(storageKey));

  function toggle() {
    setOpen((o) => {
      try {
        localStorage.setItem(storageKey, o ? '0' : '1');
      } catch {
        /* storage unavailable: state just won't persist */
      }
      return !o;
    });
  }

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={toggle}
        aria-expanded={open}
      >
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▸</span>
        <span className={styles.label}>{label}</span>
        {summary && <span className={styles.summary}>· {summary}</span>}
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </section>
  );
}
