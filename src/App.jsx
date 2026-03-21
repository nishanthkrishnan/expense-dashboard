import { useState, useEffect } from 'react';
import { fetchSheetData, parseTransactions } from './sheets';
import { TAB_MANUAL_TRANSACTIONS } from './config';
import { getMonths } from './utils';
import SpendAnalyticsPage from './components/SpendAnalyticsPage';
import SettlementPage from './components/SettlementPage';
import PinGate from './components/PinGate';
import styles from './App.module.css';

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('pin_ok') === '1');
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activePage, setActivePage] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [rawCard, rawManual] = await Promise.all([
          fetchSheetData(),
          fetchSheetData(TAB_MANUAL_TRANSACTIONS),
        ]);
        const parsed = parseTransactions([...rawCard, ...rawManual])
          .filter((t) => t.exclude_overall.toLowerCase() !== 'yes');
        if (!cancelled) {
          setTransactions(parsed);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (!unlocked) {
    return <PinGate onUnlock={() => { sessionStorage.setItem('pin_ok', '1'); setUnlocked(true); }} />;
  }

  const months = getMonths(transactions);
  const pageProps = { transactions, selectedMonth, setSelectedMonth, months };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p className={styles.errorTitle}>Failed to load data</p>
        <p className={styles.errorMsg}>{error}</p>
        <p className={styles.errorHint}>
          Check that your API key is set in <code>.env</code> as{' '}
          <code>VITE_GSHEET_API_KEY=your_key</code> and the sheet is shared as
          "Anyone with the link can view".
        </p>
      </div>
    );
  }

  return (
    <div>
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activePage === 'analytics' ? styles.tabActive : ''}`}
          onClick={() => setActivePage('analytics')}
        >
          Spend analytics
        </button>
        <button
          className={`${styles.tab} ${activePage === 'settlement' ? styles.tabActive : ''}`}
          onClick={() => setActivePage('settlement')}
        >
          Settlement
        </button>
      </nav>

      {activePage === 'analytics'
        ? <SpendAnalyticsPage {...pageProps} />
        : <SettlementPage {...pageProps} />}
    </div>
  );
}
