import { useAuth } from '../context/AuthContext.jsx';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <section className={styles.dashboard}>
      <p className={styles.eyebrow}>Sales performance</p>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.message}>Welcome back, {user.name}.</p>
      <p className={styles.hint}>
        Your personal sales workspace is coming next. Visit the leaderboard
        to see how the team is performing.
      </p>
    </section>
  );
}
