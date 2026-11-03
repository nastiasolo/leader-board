import { useEffect, useId, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi } from '../api/client.js';
import styles from './AdminPanel.module.css';

const emptyUser = {
  name: '',
  email: '',
  password: '',
  photo_url: '',
  is_admin: false,
};

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const formId = useId();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState(emptyUser);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');

  useEffect(() => {
    let isCurrentRequest = true;

    adminApi.listUsers()
      .then((result) => {
        if (isCurrentRequest) {
          setUsers(result);
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setListError(requestError.message);
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

  function handleChange(field, value) {
    setNewUser((previousUser) => ({ ...previousUser, [field]: value }));
  }

  async function refreshUsers() {
    const updatedUsers = await adminApi.listUsers();
    setUsers(updatedUsers);
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setFormError('');
    setIsCreating(true);

    try {
      await adminApi.createUser({
        ...newUser,
        photo_url: newUser.photo_url.trim() || null,
      });
      setNewUser(emptyUser);
      await refreshUsers();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteUser(employee) {
    const confirmed = window.confirm(`Delete ${employee.name}?`);
    if (!confirmed) {
      return;
    }

    setListError('');

    try {
      await adminApi.deleteUser(employee.id);
      await refreshUsers();
    } catch (requestError) {
      setListError(requestError.message);
    }
  }

  return (
    <section className={styles.admin}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Workspace settings</p>
          <h1 className={styles.title}>Admin dashboard</h1>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="users-title">
        <h2 className={styles.sectionTitle} id="users-title">Employees</h2>

        <form className={styles.form} onSubmit={handleCreateUser}>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${formId}-name`}>
                Name
              </label>
              <input
                className={styles.input}
                id={`${formId}-name`}
                type="text"
                autoComplete="name"
                required
                value={newUser.name}
                onChange={(event) => handleChange('name', event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${formId}-email`}>
                Email
              </label>
              <input
                className={styles.input}
                id={`${formId}-email`}
                type="email"
                autoComplete="email"
                required
                value={newUser.email}
                onChange={(event) => handleChange('email', event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${formId}-password`}>
                Password
              </label>
              <input
                className={styles.input}
                id={`${formId}-password`}
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={newUser.password}
                onChange={(event) => handleChange('password', event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${formId}-photo-url`}>
                Photo URL
              </label>
              <input
                className={styles.input}
                id={`${formId}-photo-url`}
                type="url"
                value={newUser.photo_url}
                onChange={(event) => handleChange('photo_url', event.target.value)}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newUser.is_admin}
                onChange={(event) => handleChange(
                  'is_admin',
                  event.target.checked,
                )}
              />
              Admin account
            </label>
            <button
              className={styles.submit}
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? 'Creating…' : 'Create user'}
            </button>
          </div>

          {formError && <p className={styles.error} role="alert">{formError}</p>}
        </form>

        {listError && <p className={styles.error} role="alert">{listError}</p>}
        {isLoading ? (
          <p className={styles.status} aria-live="polite">Loading employees…</p>
        ) : listError ? null : users.length === 0 ? (
          <p className={styles.status}>No employees found.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.is_admin ? 'Admin' : 'Employee'}</td>
                    <td>
                      {employee.id !== currentUser.id && (
                        <button
                          className={styles.deleteButton}
                          type="button"
                          aria-label={`Delete ${employee.name}`}
                          onClick={() => handleDeleteUser(employee)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
