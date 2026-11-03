import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

describe('employee sign in', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/login');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('Given valid demo credentials, When the employee signs in, Then the dashboard opens', async () => {
    // Given a login response followed by the signed-in employee profile.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'demo-token',
          user: { id: 2, name: 'Alex Morgan', is_admin: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // When the employee submits the login form.
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'alex@example.com');
    await user.type(screen.getByLabelText('Password'), 'DemoPass123!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    // Then the token is stored and the protected dashboard is displayed.
    expect(await screen.findByRole('heading', { name: 'My sales' }))
      .toBeTruthy();
    expect(localStorage.getItem('token')).toBe('demo-token');
  });

  it('Given invalid credentials, When the employee submits the form, Then the API error is shown', async () => {
    // Given the API rejects the supplied credentials.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Invalid email or password' }),
    }));
    const user = userEvent.setup();

    // When the employee submits the login form.
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'alex@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    // Then the backend error is visible and the employee remains signed out.
    expect(await screen.findByText('Invalid email or password'))
      .toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('sales leaderboard', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'demo-token');
    window.history.pushState({}, '', '/leaderboard');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('Given an authenticated employee, When the leaderboard loads, Then monthly DKK rankings are shown', async () => {
    // Given a profile and monthly rankings from the API.
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          period: 'month',
          start: '2026-11-01',
          end: '2026-11-03',
          leaderboard: [
            {
              rank: 1,
              employee_id: 1,
              name: 'Jordan Lee',
              photo_url: null,
              total_sales: 25000,
            },
            {
              rank: 2,
              employee_id: 2,
              name: 'Alex Morgan',
              photo_url: null,
              total_sales: 12345.5,
            },
          ],
        }),
      }));

    // When the employee opens the leaderboard page.
    render(<App />);

    // Then the page shows the rankings, DKK totals, and own row highlight.
    expect(await screen.findByRole('heading', { name: 'Leaderboard' }))
      .toBeTruthy();
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    expect(screen.getByText('12.345,50 kr.')).toBeTruthy();
    expect(screen.getByText('You').closest('li')
      .getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: 'This month' })
      .getAttribute('aria-pressed')).toBe('true');
  });

  it('Given monthly rankings, When the employee selects This week, Then weekly rankings are requested', async () => {
    // Given profile and monthly results followed by weekly results.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          period: 'month',
          start: '2026-11-01',
          end: '2026-11-03',
          leaderboard: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          period: 'week',
          start: '2026-11-02',
          end: '2026-11-03',
          leaderboard: [],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // When the employee switches to the weekly period.
    render(<App />);
    await screen.findByRole('heading', { name: 'Leaderboard' });
    await user.click(screen.getByRole('button', { name: 'This week' }));

    // Then the browser requests the week period and shows its empty state.
    expect(await screen.findByText('No sales in this period.')).toBeTruthy();
    expect(fetchMock.mock.calls[2][0]).toBe('/api/leaderboard?period=week');
  });

  it('Given the leaderboard API fails, When the page loads, Then the API error is shown', async () => {
    // Given a valid employee profile and a failed leaderboard response.
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Failed to fetch leaderboard' }),
      }));

    // When the employee opens the leaderboard page.
    render(<App />);

    // Then the message from the API is displayed.
    expect(await screen.findByText('Failed to fetch leaderboard'))
      .toBeTruthy();
  });
});

describe('personal sales dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'demo-token');
    window.history.pushState({}, '', '/dashboard');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('Given an employee with saved sales, When the dashboard loads, Then sales, commission, and dates are shown', async () => {
    // Given a profile and a saved sale from the API.
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          id: 45,
          amount: '1234.00',
          commission: '123.00',
          date: '2026-11-03',
          created_at: '2026-11-03T12:00:00.000Z',
        }]),
      }));

    // When the employee opens the dashboard.
    render(<App />);

    // Then the sale values and date are readable in DKK format.
    expect(await screen.findByRole('heading', { name: 'My sales' }))
      .toBeTruthy();
    expect(screen.getByText('1.234,00 kr.')).toBeTruthy();
    expect(screen.getByText(/Commission: 123,00 kr\./)).toBeTruthy();
    expect(screen.getByText('03.11.2026')).toBeTruthy();
  });

  it('Given an empty sales list, When the employee adds a sale, Then it is saved with commission and displayed', async () => {
    // Given an empty list and successful create/list responses.
    const createdSale = {
      id: 46,
      amount: '1000.50',
      commission: '125.25',
      date: '2026-11-03',
      created_at: '2026-11-03T12:00:00.000Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => createdSale })
      .mockResolvedValueOnce({ ok: true, json: async () => [createdSale] });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // When the employee enters a sale and submits the form.
    render(<App />);
    await user.type(await screen.findByLabelText('Sale amount (DKK)'), '1000.50');
    await user.type(screen.getByLabelText('Commission (DKK)'), '125.25');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2026-11-03');
    await user.click(screen.getByRole('button', { name: 'Add sale' }));

    // Then the API receives the numeric values and refreshed sales appear.
    expect(await screen.findByText('1.000,50 kr.')).toBeTruthy();
    expect(screen.getByText(/Commission: 125,25 kr\./)).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      amount: 1000.5,
      commission: 125.25,
      date: '2026-11-03',
    });
  });

  it('Given the API rejects a sale, When the employee submits it, Then the API error is shown', async () => {
    // Given a valid profile, empty sales list, and rejected create response.
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'At least one of amount or commission must be greater than zero',
        }),
      }));
    const user = userEvent.setup();

    // When the employee tries to save an empty sale.
    render(<App />);
    await screen.findByText('No sales yet. Add your first sale above.');
    await user.click(screen.getByRole('button', { name: 'Add sale' }));

    // Then the message returned by the API is displayed.
    expect((await screen.findByRole('alert')).textContent).toBe(
      'At least one of amount or commission must be greater than zero',
    );
  });

  it('Given a saved sale, When the employee edits it, Then the updated values are saved and displayed', async () => {
    // Given one saved sale and successful update/list responses.
    const originalSale = {
      id: 45,
      amount: '1234.00',
      commission: '123.00',
      date: '2026-11-03',
      created_at: '2026-11-03T12:00:00.000Z',
    };
    const updatedSale = {
      ...originalSale,
      amount: '2500.00',
      commission: '250.00',
      date: '2026-11-02',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [originalSale] })
      .mockResolvedValueOnce({ ok: true, json: async () => updatedSale })
      .mockResolvedValueOnce({ ok: true, json: async () => [updatedSale] });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // When the employee changes the saved sale.
    render(<App />);
    await screen.findByText('1.234,00 kr.');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const amountInputs = screen.getAllByLabelText('Sale amount (DKK)');
    await user.clear(amountInputs[1]);
    await user.type(amountInputs[1], '2500');
    const commissionInputs = screen.getAllByLabelText('Commission (DKK)');
    await user.clear(commissionInputs[1]);
    await user.type(commissionInputs[1], '250');
    await user.clear(screen.getAllByLabelText('Date')[1]);
    await user.type(screen.getAllByLabelText('Date')[1], '2026-11-02');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    // Then the update contract is sent and the new values appear in the list.
    expect(await screen.findByText('2.500,00 kr.')).toBeTruthy();
    expect(screen.getByText(/Commission: 250,00 kr\./)).toBeTruthy();
    expect(fetchMock.mock.calls[2][0]).toBe('/api/sales/45');
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      amount: 2500,
      commission: 250,
      date: '2026-11-02',
    });
  });

  it('Given a saved sale, When the employee confirms deletion, Then the sale is removed and the list refreshes', async () => {
    // Given one saved sale, a confirmed delete, and an empty refreshed list.
    const savedSale = {
      id: 45,
      amount: '1234.00',
      commission: '123.00',
      date: '2026-11-03',
      created_at: '2026-11-03T12:00:00.000Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [savedSale] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('No content');
        },
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);
    const user = userEvent.setup();

    // When the employee confirms deleting the sale.
    render(<App />);
    await screen.findByText('1.234,00 kr.');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // Then the server deletes it and the empty state is shown.
    expect(await screen.findByText('No sales yet. Add your first sale above.'))
      .toBeTruthy();
    expect(confirmMock).toHaveBeenCalledWith('Delete this sale?');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/sales/45');
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });

  it('Given a saved sale, When the employee cancels deletion, Then the sale remains unchanged', async () => {
    // Given one saved sale and a declined confirmation.
    const savedSale = {
      id: 45,
      amount: '1234.00',
      commission: '123.00',
      date: '2026-11-03',
      created_at: '2026-11-03T12:00:00.000Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@example.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [savedSale] });
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);
    const user = userEvent.setup();

    // When the employee declines the delete prompt.
    render(<App />);
    await screen.findByText('1.234,00 kr.');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // Then no DELETE request is sent and the sale stays visible.
    expect(screen.getByText('1.234,00 kr.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(confirmMock).toHaveBeenCalledWith('Delete this sale?');
  });
});

describe('admin employee management', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'admin-token');
    window.history.pushState({}, '', '/admin');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('Given an admin, When creating an employee, Then the employee appears in the user list', async () => {
    // Given an admin profile and the current employee list.
    const existingUser = {
      id: 2,
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      photo_url: null,
      is_admin: false,
    };
    const createdUser = {
      id: 5,
      name: 'Morgan Chen',
      email: 'morgan@example.com',
      photo_url: null,
      is_admin: false,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Avery Johnson',
          email: 'admin@demo.com',
          is_admin: true,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [existingUser] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => createdUser })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [createdUser, existingUser],
      });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // When the admin submits a new employee profile.
    render(<App />);
    await user.type(await screen.findByLabelText('Name'), 'Morgan Chen');
    await user.type(screen.getByLabelText('Email'), 'morgan@example.com');
    await user.type(screen.getByLabelText('Password'), 'DemoPass456!');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    // Then the employee is created and the current users are reloaded.
    expect(await screen.findByText('morgan@example.com')).toBeTruthy();
    expect(fetchMock.mock.calls[3][0]).toBe('/api/admin/users');
    expect(fetchMock.mock.calls[3][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      name: 'Morgan Chen',
      email: 'morgan@example.com',
      password: 'DemoPass456!',
      photo_url: null,
      is_admin: false,
    });
  });

  it('Given an admin and an employee, When the admin confirms deletion, Then that employee is removed', async () => {
    // Given an admin, an employee list, and a successful delete response.
    const adminProfile = {
      id: 1,
      name: 'Avery Johnson',
      email: 'admin@demo.com',
      is_admin: true,
    };
    const employee = {
      id: 2,
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      photo_url: null,
      is_admin: false,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => adminProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => [adminProfile, employee] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('No content');
        },
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [adminProfile] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);
    const user = userEvent.setup();

    // When the admin confirms deleting the employee.
    render(<App />);
    await screen.findByText('alex@demo.com');
    await user.click(screen.getByRole('button', { name: 'Delete Alex Morgan' }));

    // Then the API deletes that account and the refreshed list omits it.
    await waitFor(() => {
      expect(screen.queryByText('alex@demo.com')).toBeNull();
    });
    expect(confirmMock).toHaveBeenCalledWith('Delete Alex Morgan?');
    expect(fetchMock.mock.calls[3][0]).toBe('/api/admin/users/2');
    expect(fetchMock.mock.calls[3][1].method).toBe('DELETE');
  });

  it('Given an admin and an employee, When the admin cancels deletion, Then no delete request is sent', async () => {
    // Given an admin, an employee list, and a declined confirmation.
    const adminProfile = {
      id: 1,
      name: 'Avery Johnson',
      email: 'admin@demo.com',
      is_admin: true,
    };
    const employee = {
      id: 2,
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      photo_url: null,
      is_admin: false,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => adminProfile })
      .mockResolvedValueOnce({ ok: true, json: async () => [adminProfile, employee] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);
    const user = userEvent.setup();

    // When the admin declines the confirmation.
    render(<App />);
    await screen.findByText('alex@demo.com');
    await user.click(screen.getByRole('button', { name: 'Delete Alex Morgan' }));

    // Then the employee remains visible and the request list is unchanged.
    expect(screen.getByText('alex@demo.com')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(confirmMock).toHaveBeenCalledWith('Delete Alex Morgan?');
  });

  it('Given a regular employee, When opening the admin route, Then access is denied', async () => {
    // Given a regular employee profile at the admin URL.
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'Alex Morgan',
          email: 'alex@demo.com',
          is_admin: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }));

    // When the employee opens the admin route.
    render(<App />);

    // Then the app redirects to Dashboard and hides admin navigation.
    expect(await screen.findByRole('heading', { name: 'My sales' }))
      .toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });
});

describe('admin sales management', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'admin-token');
    window.history.pushState({}, '', '/admin');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('Given an admin, When all sales load, Then employee and DKK details are shown', async () => {
    // Given an admin profile, employees, and an all-sales response.
    const sale = {
      id: 45,
      employee_id: 2,
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      amount: '1234.00',
      commission: '123.00',
      date: '2026-11-03',
    };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Avery Johnson',
          email: 'admin@demo.com',
          is_admin: true,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [sale] }));

    // When the admin opens the management page.
    render(<App />);

    // Then the all-sales table shows employee details and amounts.
    expect(await screen.findByText('alex@demo.com')).toBeTruthy();
    expect(screen.getByText('1.234,00 kr.')).toBeTruthy();
    expect(screen.getByText('123,00 kr.')).toBeTruthy();
    expect(screen.getByText('03.11.2026')).toBeTruthy();
  });

  it('Given an admin and a saved sale, When the admin edits it, Then the API and table show updated values', async () => {
    // Given an admin profile, an employee list, and one saved sale.
    const originalSale = {
      id: 45,
      employee_id: 2,
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      amount: '1234.00',
      commission: '123.00',
      date: '2026-11-03',
    };
    const updatedSale = {
      ...originalSale,
      amount: '2500.00',
      commission: '250.00',
      date: '2026-11-02',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Avery Johnson',
          email: 'admin@demo.com',
          is_admin: true,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [originalSale] })
      .mockResolvedValueOnce({ ok: true, json: async () => updatedSale })
      .mockResolvedValueOnce({ ok: true, json: async () => [updatedSale] });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    // When the admin updates the sale details.
    render(<App />);
    await screen.findByText('alex@demo.com');
    await user.click(screen.getByRole('button', { name: 'Edit sale #45' }));
    await user.clear(screen.getByLabelText('Sale amount (DKK)'));
    await user.type(screen.getByLabelText('Sale amount (DKK)'), '2500');
    await user.clear(screen.getByLabelText('Commission (DKK)'));
    await user.type(screen.getByLabelText('Commission (DKK)'), '250');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2026-11-02');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    // Then the update request has the contract fields and new values display.
    expect(await screen.findByText('2.500,00 kr.')).toBeTruthy();
    expect(fetchMock.mock.calls[3][0]).toBe('/api/sales/45');
    expect(fetchMock.mock.calls[3][1].method).toBe('PUT');
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      amount: 2500,
      commission: 250,
      date: '2026-11-02',
    });
  });

  it('Given an admin and a saved sale, When the admin confirms deletion, Then the sale is removed', async () => {
    // Given an admin profile, an employee list, and one saved sale.
    const sale = {
      id: 45,
      employee_id: 2,
      name: 'Alex Morgan',
      email: 'alex@demo.com',
      amount: '1234.00',
      commission: '123.00',
      date: '2026-11-03',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'Avery Johnson',
          email: 'admin@demo.com',
          is_admin: true,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [sale] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('No content');
        },
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);
    const user = userEvent.setup();

    // When the admin confirms deleting the sale.
    render(<App />);
    await screen.findByText('alex@demo.com');
    await user.click(screen.getByRole('button', { name: 'Delete sale #45' }));

    // Then the API deletes the sale and the empty state appears.
    expect(await screen.findByText('No sales found.')).toBeTruthy();
    expect(confirmMock).toHaveBeenCalledWith('Delete this sale?');
    expect(fetchMock.mock.calls[3][0]).toBe('/api/sales/45');
    expect(fetchMock.mock.calls[3][1].method).toBe('DELETE');
  });
});
