import { useMemo } from 'react';
import { filterByMonth, fmtMonth } from '../utils';
import MonthFilter from './MonthFilter';
import styles from './SettlementPage.module.css';

const NISHANTH = { name: 'Nishanth', initials: 'NK', ratio: 0.65, color: '#3266ad', bg: '#E6F1FB' };
const NAVYA    = { name: 'Navya',    initials: 'NV', ratio: 0.35, color: '#D4537E', bg: '#FBEAF0' };

export default function SettlementPage({ transactions, selectedMonth, setSelectedMonth, months }) {
  const monthFiltered = filterByMonth(transactions, selectedMonth);

  const { splittable, excluded, total, nishanthPaid, navyaPaid } = useMemo(() => {
    const splittable = monthFiltered.filter(
      (t) => t.exclude_from_split.toLowerCase() !== 'yes'
    );
    const excluded = monthFiltered.length - splittable.length;
    const total = splittable.reduce((s, t) => s + t.amount_aed, 0);
    const nishanthPaid = splittable
      .filter((t) => t.paid_by === NISHANTH.name)
      .reduce((s, t) => s + t.amount_aed, 0);
    const navyaPaid = splittable
      .filter((t) => t.paid_by === NAVYA.name)
      .reduce((s, t) => s + t.amount_aed, 0);
    return { splittable, excluded, total, nishanthPaid, navyaPaid };
  }, [monthFiltered]);

  const nishanthShouldPay = total * NISHANTH.ratio;
  const navyaShouldPay    = total * NAVYA.ratio;
  const nishanthBalance   = nishanthPaid - nishanthShouldPay;
  const settlementAmount  = Math.abs(Math.round(nishanthBalance));

  const nishanthTxCount = splittable.filter((t) => t.paid_by === NISHANTH.name).length;
  const navyaTxCount    = splittable.filter((t) => t.paid_by === NAVYA.name).length;

  let verdictText;
  if (settlementAmount === 0) {
    verdictText = 'Settled';
  } else if (nishanthBalance > 0) {
    verdictText = `${NAVYA.name} owes ${NISHANTH.name}`;
  } else {
    verdictText = `${NISHANTH.name} owes ${NAVYA.name}`;
  }

  const monthLabel = selectedMonth === 'all' ? 'All time' : fmtMonth(selectedMonth);

  function fmt(n) {
    return `AED ${Math.round(n).toLocaleString()}`;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Settlement</h1>
        <MonthFilter months={months} selected={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Metric cards */}
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total splittable</div>
          <div className={styles.metricValue}>{fmt(total)}</div>
          <div className={styles.metricSub}>
            {splittable.length} transactions ({excluded} excluded)
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>
            {NISHANTH.name}'s share ({Math.round(NISHANTH.ratio * 100)}%)
          </div>
          <div className={styles.metricValue}>{fmt(nishanthShouldPay)}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>
            {NAVYA.name}'s share ({Math.round(NAVYA.ratio * 100)}%)
          </div>
          <div className={styles.metricValue}>{fmt(navyaShouldPay)}</div>
        </div>
      </div>

      {/* Split ratio bar */}
      <div className={styles.ratioCard}>
        <div className={styles.ratioTitle}>Expense split ratio</div>
        <div className={styles.ratioLegend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: NISHANTH.color }} />
            {NISHANTH.name} {Math.round(NISHANTH.ratio * 100)}%
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: NAVYA.color }} />
            {NAVYA.name} {Math.round(NAVYA.ratio * 100)}%
          </span>
        </div>
        <div className={styles.ratioBar}>
          <div
            className={styles.ratioSegment}
            style={{ width: `${NISHANTH.ratio * 100}%`, background: NISHANTH.color, borderRadius: '6px 0 0 6px' }}
          />
          <div
            className={styles.ratioSegment}
            style={{ width: `${NAVYA.ratio * 100}%`, background: NAVYA.color, borderRadius: '0 6px 6px 0' }}
          />
        </div>
      </div>

      {/* Person cards */}
      <div className={styles.personCards}>
        {[
          { person: NISHANTH, shouldPay: nishanthShouldPay, paid: nishanthPaid, txCount: nishanthTxCount, balance: nishanthBalance },
          { person: NAVYA,    shouldPay: navyaShouldPay,    paid: navyaPaid,    txCount: navyaTxCount,    balance: -nishanthBalance },
        ].map(({ person, shouldPay, paid, txCount, balance }) => (
          <div key={person.name} className={styles.personCard}>
            <div className={styles.personHeader}>
              <div className={styles.avatar} style={{ background: person.bg, color: person.color }}>
                {person.initials}
              </div>
              <div>
                <div className={styles.personName}>{person.name}</div>
                <div className={styles.personShare}>{Math.round(person.ratio * 100)}% share</div>
              </div>
            </div>
            <div className={styles.personRows}>
              <div className={styles.personRow}>
                <span className={styles.rowLabel}>Should pay</span>
                <span className={styles.rowValue}>{fmt(shouldPay)}</span>
              </div>
              <div className={styles.personRow}>
                <span className={styles.rowLabel}>Actually paid</span>
                <span className={styles.rowValue}>{fmt(paid)}</span>
              </div>
              <div className={styles.personRow}>
                <span className={styles.rowLabel}>Transactions</span>
                <span className={styles.rowValue}>{txCount}</span>
              </div>
              <div className={styles.personRow}>
                <span className={styles.rowLabel}>Balance</span>
                <span
                  className={styles.rowValue}
                  style={{ color: balance >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: 500 }}
                >
                  {balance >= 0
                    ? `Overpaid ${fmt(balance)}`
                    : `Underpaid ${fmt(Math.abs(balance))}`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settlement verdict */}
      <div className={styles.verdict}>
        <div className={styles.verdictLabel}>Settlement for {monthLabel}</div>
        <div className={styles.verdictAmount}>AED {settlementAmount.toLocaleString()}</div>
        <div className={styles.verdictDirection}>{verdictText}</div>
      </div>
    </div>
  );
}
