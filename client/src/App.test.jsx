import { cleanup, render, screen } from '@testing-library/react';
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
    expect(await screen.findByRole('heading', { name: 'Dashboard' }))
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
