import { beforeEach, expect, it, vi } from 'vitest';
import { getTheme, initTheme, toggleTheme } from './themeManager.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

it('toggles from the resolved system theme', () => {
  initTheme();
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(toggleTheme()).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('falls back to system for an invalid persisted preference', () => {
  localStorage.setItem('photomap-theme', 'invalid');
  expect(getTheme()).toBe('system');
});
