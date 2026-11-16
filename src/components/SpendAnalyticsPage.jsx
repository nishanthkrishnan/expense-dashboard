import { useMemo } from 'react';
import { filterByMonth, expandAmortized, fmtAED } from '../utils';
import MonthFilter from './MonthFilter';
import TrendChart from './TrendChart';
import CategoryChart from './CategoryChart';
import CategoryComparison from './CategoryComparison';
import CollapsibleSection from './CollapsibleSection';
import TransactionTable from './TransactionTable';
import styles from './SpendAnalyticsPage.module.css';

export default function SpendAnalyticsPage({ transactions, selectedMonth, setSelectedMonth, months }) {
  const amortizedTransactions = useMemo(() => expandAmortized(transactions), [transactions]);
  const filtered = useMemo(() => filterByMonth(transactions, selectedMonth), [transactions, selectedMonth]);
  const filteredAmortized = useMemo(
    () => filterByMonth(amortizedTransactions, selectedMonth),
    [amortizedTransactions, selectedMonth]
  );
  const actualTotal = filtered.reduce((s, t) => s + t.amount_aed, 0);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Expense tracker</h1>
        <MonthFilter months={months} selected={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <div className={styles.sectionLabel}>Amortized spend</div>
      <div className={styles.charts}>
        <div className={styles.chartBox}>
          <div className={styles.chartTitle}>Monthly spend trend (AED)</div>
          <TrendChart data={amortizedTransactions} selectedMonth={selectedMonth} />
        </div>
        <div className={styles.chartBox}>
          <CategoryChart data={filteredAmortized} selectedMonth={selectedMonth} />
        </div>
      </div>

      <CategoryComparison data={amortizedTransactions} selectedMonth={selectedMonth} />

      <CollapsibleSection
        label="Actual spend"
        summary={fmtAED(actualTotal)}
        storageKey="dash.actualSpendOpen"
      >
        <div className={`${styles.charts} ${styles.chartsTight}`}>
          <div className={styles.chartBox}>
            <div className={styles.chartTitle}>Monthly spend trend (AED)</div>
            <TrendChart data={transactions} selectedMonth={selectedMonth} />
          </div>
          <div className={styles.chartBox}>
            <CategoryChart data={filtered} selectedMonth={selectedMonth} />
          </div>
        </div>
      </CollapsibleSection>

      <TransactionTable data={filtered} />
    </div>
  );
}
