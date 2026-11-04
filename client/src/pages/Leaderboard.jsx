import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { leaderboardApi } from '../api/client.js';
import Avatar from '../components/Avatar.jsx';
import styles from './Leaderboard.module.css';

const DISPLAY_REFRESH_INTERVAL = 30 * 60 * 1000;

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

function formatUpdateTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Leaderboard({ displayMode = false }) {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let isCurrentRequest = true;

    setLoading(true);
    setError('');
    setLastUpdatedAt(null);

    async function loadLatestLeaderboard() {
      try {
        const result = await leaderboardApi.get(period);

        if (isCurrentRequest) {
          setData(result);
          setLastUpdatedAt(new Date());
          setError('');
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setError(requestError.message);
        }
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    }

    void loadLatestLeaderboard();
    const refreshInterval = displayMode
      ? window.setInterval(() => {
        void loadLatestLeaderboard();
      }, DISPLAY_REFRESH_INTERVAL)
      : null;

    return () => {
      isCurrentRequest = false;
      if (refreshInterval !== null) {
        window.clearInterval(refreshInterval);
      }
    };
  }, [displayMode, period]);

  const hasCurrentPeriodData = data?.period === period;

  return (
    <section className={displayMode
      ? `${styles.leaderboard} ${styles.displayMode}`
      : `pageEnter ${styles.leaderboard}`}
    >
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

      {displayMode && lastUpdatedAt && (
        <p className={styles.updatedAt}>
          Last updated at {formatUpdateTime(lastUpdatedAt)}
        </p>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading && !hasCurrentPeriodData ? (
        <p className={styles.status} aria-live="polite">Loading rankings…</p>
      ) : hasCurrentPeriodData && data.leaderboard.length === 0 ? (
        <p className={styles.status}>No sales in this period.</p>
      ) : hasCurrentPeriodData ? (
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
                  <Avatar
                    name={row.name}
                    photoUrl={row.photo_url}
                    size={displayMode ? 'large' : 'medium'}
                  />
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
      ) : null}
    </section>
  );
}
