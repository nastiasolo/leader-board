const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || response.statusText);
  }

  return data;
}

export const authApi = {
  login: (email, password) => api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  me: () => api('/api/auth/me'),
};

export const leaderboardApi = {
  get: (period = 'month') => api(
    `/api/leaderboard?period=${encodeURIComponent(period)}`,
  ),
};

export const salesApi = {
  list: () => api('/api/sales'),
  create: (sale) => api('/api/sales', {
    method: 'POST',
    body: JSON.stringify(sale),
  }),
  update: (id, sale) => api(`/api/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(sale),
  }),
  remove: (id) => api(`/api/sales/${id}`, { method: 'DELETE' }),
};

export const adminApi = {
  listUsers: () => api('/api/admin/users'),
  createUser: (user) => api('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
  deleteUser: (id) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
};
