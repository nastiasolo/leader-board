import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { token } = await authApi.login(email, password);
      await login(token);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <section className={styles.card} aria-labelledby="login-title">
        <p className={styles.eyebrow}>Sales performance</p>
        <h1 className={styles.title}>Sales Leaderboard</h1>
        <h2 className={styles.subtitle} id="login-title">Log in</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              className={styles.input}
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              className={styles.input}
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className={styles.footer}>Use a published demo account to explore.</p>
      </section>
    </main>
  );
}
