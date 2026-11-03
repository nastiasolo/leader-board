import styles from './Avatar.module.css';

export default function Avatar({ name, photoUrl }) {
  if (photoUrl) {
    return (
      <img
        className={styles.avatar}
        src={photoUrl}
        alt=""
      />
    );
  }

  return (
    <span className={styles.fallback} aria-hidden="true">
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}
