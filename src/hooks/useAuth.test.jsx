import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth.js';
import { hasMapSession, setCurrentUser, setToken, getToken, getCurrentUser } from '../api/auth.js';

beforeEach(() => localStorage.clear());

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
