import { useState } from 'react';
import styles from './SalesForm.module.css';

function getTodayDate() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
}

export default function SalesForm({ onSave }) {
  const [amount, setAmount] = useState('');
  const [commission, setCommission] = useState('');
  const [date, setDate] = useState(getTodayDate);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSave({
        amount: amount === '' ? 0 : Number(amount),
        commission: commission === '' ? 0 : Number(commission),
        date,
      });
      setAmount('');
      setCommission('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sale-amount">
            Sale amount (DKK)
          </label>
          <input
            className={styles.input}
            id="sale-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="sale-commission">
            Commission (DKK)
          </label>
          <input
            className={styles.input}
            id="sale-commission"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="sale-date">Date</label>
          <input
            className={styles.input}
            id="sale-date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <button
          className={styles.submit}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Add sale'}
        </button>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
