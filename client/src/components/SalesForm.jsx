import { useId, useState } from 'react';
import styles from './SalesForm.module.css';

function getTodayDate() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
}

export default function SalesForm({
  initialSale,
  onSave,
  onCancel,
  submitLabel = 'Add sale',
}) {
  const fieldId = useId();
  const [amount, setAmount] = useState(
    initialSale ? String(initialSale.amount) : '',
  );
  const [commission, setCommission] = useState(
    initialSale ? String(initialSale.commission) : '',
  );
  const [date, setDate] = useState(
    initialSale?.date || getTodayDate(),
  );
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
      if (!initialSale) {
        setAmount('');
        setCommission('');
      }
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
          <label className={styles.label} htmlFor={`${fieldId}-amount`}>
            Sale amount (DKK)
          </label>
          <input
            className={styles.input}
            id={`${fieldId}-amount`}
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
          <label className={styles.label} htmlFor={`${fieldId}-commission`}>
            Commission (DKK)
          </label>
          <input
            className={styles.input}
            id={`${fieldId}-commission`}
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
          <label className={styles.label} htmlFor={`${fieldId}-date`}>
            Date
          </label>
          <input
            className={styles.input}
            id={`${fieldId}-date`}
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button
            className={styles.submit}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
          {onCancel && (
            <button
              className={styles.cancel}
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
