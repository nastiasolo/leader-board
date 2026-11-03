import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { leaderboardApi } from '../api/client.js';
import styles from './Leaderboard.module.css';

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

function getWeekNumber(date) {
  const weekDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ));
  const dayNumber = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));

  return Math.ceil(((weekDate - yearStart) / 86400000 + 1) / 7);
}

function getPeriodLabel(period) {
  const today = new Date();

  if (period === 'year') {
    return String(today.getFullYear());
  }

  if (period === 'month') {
    return today.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  return `Week ${getWeekNumber(today)}`;
}

function formatDkk(amount) {
  return `${Number(amount).toLocaleString('da-DK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr.`;
}

function Avatar({ name, photoUrl }) {
  if (photoUrl) {
    return <img className={styles.avatar} src={photoUrl} alt="" />;
  }

  return (
    <span className={styles.avatarFallback} aria-hidden="true">
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    let isCurrentRequest = true;

    setLoading(true);
    setError('');
    leaderboardApi.get(period)
      .then((result) => {
        if (isCurrentRequest) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [period]);

  return (
    <section className={styles.leaderboard}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Team performance</p>
          <h1 className={styles.title}>Leaderboard</h1>
        </div>
        <p className={styles.periodLabel}>{getPeriodLabel(period)}</p>
      </div>

      <div className={styles.filters} aria-label="Leaderboard period">
        {PERIODS.map((option) => (
          <button
            key={option.value}
            className={period === option.value
              ? `${styles.filter} ${styles.filterActive}`
              : styles.filter}
            type="button"
            aria-pressed={period === option.value}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? (
        <p className={styles.status} aria-live="polite">Loading rankings…</p>
      ) : error ? null : data?.leaderboard?.length === 0 ? (
        <p className={styles.status}>No sales in this period.</p>
      ) : (
        <ol className={styles.list}>
          {data?.leaderboard?.map((row) => {
            const isCurrentUser = row.employee_id === user.id;

            return (
              <li
                key={row.employee_id}
                className={isCurrentUser
                  ? `${styles.row} ${styles.highlight}`
                  : styles.row}
                aria-current={isCurrentUser ? 'true' : undefined}
              >
                <span className={styles.rank}>#{row.rank}</span>
                <span className={styles.person}>
                  <Avatar name={row.name} photoUrl={row.photo_url} />
                  <span className={styles.name}>{row.name}</span>
                  {isCurrentUser && (
                    <span className={styles.youLabel}>You</span>
                  )}
                </span>
                <span className={styles.total}>{formatDkk(row.total_sales)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
