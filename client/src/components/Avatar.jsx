import styles from './Avatar.module.css';

export default function Avatar({ name, photoUrl, size = 'medium' }) {
  const isLarge = size === 'large';

  if (photoUrl) {
    return (
      <img
        className={isLarge
          ? `${styles.avatar} ${styles.avatarLarge}`
          : styles.avatar}
        src={photoUrl}
        alt=""
      />
    );
  }

  return (
    <span
      className={isLarge
        ? `${styles.fallback} ${styles.fallbackLarge}`
        : styles.fallback}
      aria-hidden="true"
    >
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}
