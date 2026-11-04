import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Leaderboard from './Leaderboard.jsx';
import styles from './DisplayPage.module.css';

export default function DisplayPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleExit() {
    if (user.is_display) {
      logout();
      navigate('/login', { replace: true });
      return;
    }

    navigate('/admin', { replace: true });
  }

  return (
    <main className={`pageEnter ${styles.display}`}>
      <div className={styles.toolbar}>
        <span className={styles.label}>Sales display</span>
        <button
          className={styles.exit}
          type="button"
          onClick={handleExit}
        >
          Exit display
        </button>
      </div>
      <Leaderboard displayMode />
    </main>
  );
}
