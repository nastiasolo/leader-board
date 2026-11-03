import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

describe('employee sign in', () => {
  beforeEach(() => {
    localStorage.clear();
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
