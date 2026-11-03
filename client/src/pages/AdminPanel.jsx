import { useEffect, useId, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import SalesForm from '../components/SalesForm.jsx';
import Avatar from '../components/Avatar.jsx';
import { adminApi, salesApi } from '../api/client.js';
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
  const [sales, setSales] = useState([]);
  const [newUser, setNewUser] = useState(emptyUser);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');
  const [salesError, setSalesError] = useState('');

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

  useEffect(() => {
    let isCurrentRequest = true;

    adminApi.listSales()
      .then((result) => {
        if (isCurrentRequest) {
          setSales(result);
        }
      })
      .catch((requestError) => {
        if (isCurrentRequest) {
          setSalesError(requestError.message);
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoadingSales(false);
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

  async function refreshSales() {
    const updatedSales = await adminApi.listSales();
    setSales(updatedSales);
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
      await Promise.all([refreshUsers(), refreshSales()]);
    } catch (requestError) {
      setListError(requestError.message);
    }
  }

  async function handleUpdateSale(id, sale) {
    setSalesError('');
    await salesApi.update(id, sale);
    await refreshSales();
    setEditingSaleId(null);
  }

  async function handleDeleteSale(sale) {
    const confirmed = window.confirm('Delete this sale?');
    if (!confirmed) {
      return;
    }

    setSalesError('');

    try {
      await salesApi.remove(sale.id);
      await refreshSales();
    } catch (requestError) {
      setSalesError(requestError.message);
    }
  }

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
                    <td>
                      <div className={styles.employeeIdentity}>
                        <Avatar
                          name={employee.name}
                          photoUrl={employee.photo_url}
                        />
                        <span>{employee.name}</span>
                      </div>
                    </td>
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

      <section className={styles.section} aria-labelledby="sales-title">
        <h2 className={styles.sectionTitle} id="sales-title">All sales</h2>
        {salesError && (
          <p className={styles.error} role="alert">{salesError}</p>
        )}
        {isLoadingSales ? (
          <p className={styles.status} aria-live="polite">Loading sales…</p>
        ) : salesError ? null : sales.length === 0 ? (
          <p className={styles.status}>No sales found.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Employee</th>
                  <th scope="col">Date</th>
                  <th scope="col">Sale amount</th>
                  <th scope="col">Commission</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    {editingSaleId === sale.id ? (
                      <td colSpan="6">
                        <SalesForm
                          key={sale.id}
                          initialSale={sale}
                          submitLabel="Save changes"
                          onSave={(updatedSale) => (
                            handleUpdateSale(sale.id, updatedSale)
                          )}
                          onCancel={() => setEditingSaleId(null)}
                        />
                      </td>
                    ) : (
                      <>
                        <td>{sale.id}</td>
                        <td>
                          <div className={styles.employeeIdentity}>
                            <Avatar
                              name={sale.name}
                              photoUrl={sale.photo_url}
                            />
                            <div>
                              <span className={styles.employeeName}>
                                {sale.name}
                              </span>
                              <span className={styles.employeeEmail}>
                                {sale.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <time dateTime={sale.date}>
                            {formatDate(sale.date)}
                          </time>
                        </td>
                        <td>{formatDkk(sale.amount)}</td>
                        <td>{formatDkk(sale.commission)}</td>
                        <td>
                          <div className={styles.saleActions}>
                            <button
                              className={styles.actionButton}
                              type="button"
                              aria-label={`Edit sale #${sale.id}`}
                              onClick={() => setEditingSaleId(sale.id)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.deleteButton}
                              type="button"
                              aria-label={`Delete sale #${sale.id}`}
                              onClick={() => handleDeleteSale(sale)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
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
