import { useCallback, useMemo, useState } from 'react';
import { filterByMonth, expandAmortized, fmtAED } from '../utils';
import MonthFilter from './MonthFilter';
import TrendChart from './TrendChart';
import CategoryChart from './CategoryChart';
import CategoryComparison from './CategoryComparison';
import CollapsibleSection from './CollapsibleSection';
import CategoryDrawer from './CategoryDrawer';
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

  // Drill-down panel: { category, month, mode } or null.
  const [drill, setDrill] = useState(null);
  const closeDrill = useCallback(() => setDrill(null), []);
  const openAmortized = (category, month = selectedMonth) => setDrill({ category, month, mode: 'amortized' });
  const openActual = (category) => setDrill({ category, month: selectedMonth, mode: 'actual' });
  const activeFor = (mode) =>
    drill && drill.mode === mode && drill.month === selectedMonth ? drill.category : null;

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
          <CategoryChart
            data={filteredAmortized}
            selectedMonth={selectedMonth}
            onSelect={openAmortized}
            activeCategory={activeFor('amortized')}
          />
        </div>
      </div>

      <CategoryComparison
        data={amortizedTransactions}
        selectedMonth={selectedMonth}
        onSelect={openAmortized}
        active={drill?.mode === 'amortized' ? drill : null}
      />

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
            <CategoryChart
              data={filtered}
              selectedMonth={selectedMonth}
              onSelect={openActual}
              activeCategory={activeFor('actual')}
            />
          </div>
        </div>
      </CollapsibleSection>

      <TransactionTable data={filtered} />

      {drill && (
        <CategoryDrawer
          drill={drill}
          actual={transactions}
          amortized={amortizedTransactions}
          onChange={setDrill}
          onClose={closeDrill}
        />
      )}
    </div>
  );
}
