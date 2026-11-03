import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <NavLink className={styles.brand} to="/dashboard">
          Sales Leaderboard
        </NavLink>

        <nav className={styles.navigation} aria-label="Main navigation">
          <NavLink
            className={({ isActive }) => (
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            )}
            to="/dashboard"
          >
            Dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) => (
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            )}
            to="/leaderboard"
          >
            Leaderboard
          </NavLink>
          {isAdmin && (
            <NavLink
              className={({ isActive }) => (
                isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
              )}
              to="/admin"
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className={styles.account}>
          <span className={styles.userName}>{user.name}</span>
          <button
            className={styles.logout}
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
