import { useState, useEffect } from 'react';
import styles from './PinGate.module.css';

const PIN = '1357';

export default function PinGate({ onUnlock }) {
  const [entered, setEntered] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (entered.length < 4) return;
    if (entered === PIN) {
      onUnlock();
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setEntered('');
      }, 600);
    }
  }, [entered, onUnlock]);

  function press(digit) {
    if (entered.length < 4) setEntered((p) => p + digit);
  }

  function del() {
    setEntered((p) => p.slice(0, -1));
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.title}>Enter PIN</div>
        <div className={`${styles.dots} ${shake ? styles.shake : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${styles.dot} ${i < entered.length ? styles.filled : ''}`} />
          ))}
        </div>
        <div className={styles.pad}>
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <button key={d} className={styles.key} onClick={() => press(d)}>{d}</button>
          ))}
          <div />
          <button className={styles.key} onClick={() => press('0')}>0</button>
          <button className={`${styles.key} ${styles.del}`} onClick={del}>⌫</button>
        </div>
      </div>
    </div>
  );
}
