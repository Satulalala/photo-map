import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth.js';
import { hasMapSession, setCurrentUser, setToken, getToken, getCurrentUser } from '../api/auth.js';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it('starts at login for a new visitor and restores guest choice after refresh', () => {
  const first = renderHook(() => useAuth(vi.fn()));
  expect(first.result.current.userChose).toBe(false);
  expect(hasMapSession()).toBe(false);
  act(() => first.result.current.handleSkipLogin());
  expect(hasMapSession()).toBe(false);
  act(() => first.result.current.handleEnterMapFromLoader(vi.fn()));
  first.unmount();
  const restored = renderHook(() => useAuth(vi.fn()));
  expect(restored.result.current.userChose).toBe(true);
  expect(restored.result.current.user).toBeNull();
  expect(hasMapSession()).toBe(true);
  act(() => restored.result.current.handleLogout());
  expect(hasMapSession()).toBe(false);
});

it('restores an account and removes both authentication and map session on logout', () => {
  setCurrentUser({ id: 'user', email: 'test@example.com' });
  setToken('test-token');
  const first = renderHook(() => useAuth(vi.fn()));
  expect(first.result.current.userChose).toBe(true);
  expect(first.result.current.user.id).toBe('user');
  expect(hasMapSession()).toBe(false);
  act(() => first.result.current.handleEnterMapFromLoader(vi.fn()));
  expect(hasMapSession()).toBe(true);
  act(() => first.result.current.handleLogout());
  expect(getToken()).toBeNull();
  expect(getCurrentUser()).toBeNull();
  first.unmount();
  const restored = renderHook(() => useAuth(vi.fn()));
  expect(restored.result.current.userChose).toBe(false);
  expect(hasMapSession()).toBe(false);
});

it('keeps an expired session cleared when the initial account verification returns late', async () => {
  const user = { id: 123, email: 'session-test@example.invalid' };
  const profileResponse = Promise.withResolvers();
  setCurrentUser(user);
  setToken('test-token');
  const fetchMock = vi.fn().mockReturnValue(profileResponse.promise);
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useAuth(vi.fn()));
  expect(fetchMock).toHaveBeenCalledTimes(1);

  act(() => window.dispatchEvent(new Event('photomap:auth-expired')));
  await act(async () => {
    profileResponse.resolve(Response.json({ ok: true, user }));
  });

  expect(getCurrentUser()).toBeNull();
  expect(getToken()).toBeNull();
  expect(result.current.user).toBeNull();
  expect(result.current.isLoggedIn).toBe(false);
});
