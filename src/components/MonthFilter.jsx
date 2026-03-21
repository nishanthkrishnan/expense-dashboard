import { fmtMonth } from '../utils';
import styles from './MonthFilter.module.css';

export default function MonthFilter({ months, selected, onChange }) {
  return (
    <select
      className={styles.select}
      value={selected}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">All months</option>
      {months.map((m) => (
        <option key={m} value={m}>{fmtMonth(m)}</option>
      ))}
    </select>
  );
}
