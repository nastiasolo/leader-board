import { useEffect, useState } from 'react';
import SalesForm from '../components/SalesForm.jsx';
import { salesApi } from '../api/client.js';
import styles from './Dashboard.module.css';

function formatDkk(amount) {
  return `${Number(amount).toLocaleString('da-DK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr.`;
}

function formatDate(value) {
  const [year, month, day] = String(value).split('T')[0].split('-');

  return year && month && day ? `${day}.${month}.${year}` : value;
}

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isCurrentRequest = true;

    salesApi.list()
      .then((result) => {
        if (isCurrentRequest) {
          setSales(result);
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  async function handleCreateSale(sale) {
    setError('');
    await salesApi.create(sale);
    const updatedSales = await salesApi.list();
    setSales(updatedSales);
  }

  async function handleUpdateSale(id, sale) {
    setError('');
    await salesApi.update(id, sale);
    const updatedSales = await salesApi.list();
    setSales(updatedSales);
    setEditingId(null);
  }

  async function handleDeleteSale(id) {
    const confirmed = window.confirm('Delete this sale?');
    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await salesApi.remove(id);
      const updatedSales = await salesApi.list();
      setSales(updatedSales);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className={`pageEnter ${styles.dashboard}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Sales performance</p>
          <h1 className={styles.title}>My sales</h1>
        </div>
        <p className={styles.currency}>All values in DKK</p>
      </div>

      <h2 className={styles.formTitle}>Add a sale</h2>
      <SalesForm onSave={handleCreateSale} />

      <section className={styles.history} aria-labelledby="sales-history-title">
        <h2 className={styles.sectionTitle} id="sales-history-title">
          My past sales
        </h2>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {isLoading ? (
          <p className={styles.status} aria-live="polite">Loading sales…</p>
        ) : error ? null : sales.length === 0 ? (
          <p className={styles.status}>
            No sales yet. Add your first sale above.
          </p>
        ) : (
          <ul className={styles.list}>
            {sales.map((sale) => (
              <li className={styles.sale} key={sale.id}>
                {editingId === sale.id ? (
                  <SalesForm
                    key={sale.id}
                    initialSale={sale}
                    submitLabel="Save changes"
                    onSave={(updatedSale) => (
                      handleUpdateSale(sale.id, updatedSale)
                    )}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className={styles.saleDetails}>
                      <div className={styles.saleValues}>
                        <span className={styles.saleAmount}>
                          {formatDkk(sale.amount)}
                        </span>
                        <span className={styles.commission}>
                          Commission: {formatDkk(sale.commission)}
                        </span>
                      </div>
                      <time className={styles.date} dateTime={sale.date}>
                        {formatDate(sale.date)}
                      </time>
                    </div>
                    <div className={styles.saleActions}>
                      <button
                        className={styles.editButton}
                        type="button"
                        onClick={() => setEditingId(sale.id)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        onClick={() => handleDeleteSale(sale.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
