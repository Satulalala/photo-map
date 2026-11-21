import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePresenceTransition } from './usePresenceTransition.js';

function TestPanel({ value, duration = 180 }) {
  const { mounted, exiting, snapshot } = usePresenceTransition(value, duration);
  if (!mounted) return null;
  return (
    <div data-testid="panel" data-exiting={exiting ? 'true' : 'false'}>
      {snapshot?.title || 'empty'}
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('keeps snapshot mounted during exit transition and unmounts after duration', () => {
  const { rerender } = render(<TestPanel value={{ title: '地点详情' }} />);
  expect(screen.getByTestId('panel')).toHaveTextContent('地点详情');
  expect(screen.getByTestId('panel')).toHaveAttribute('data-exiting', 'false');

  rerender(<TestPanel value={null} />);
  expect(screen.getByTestId('panel')).toHaveTextContent('地点详情');
  expect(screen.getByTestId('panel')).toHaveAttribute('data-exiting', 'true');

  act(() => {
    vi.advanceTimersByTime(180);
  });
  expect(screen.queryByTestId('panel')).toBeNull();
});

it('cancels pending unmount when reopened before exit finishes', () => {
  const { rerender } = render(<TestPanel value={{ title: '第一项' }} />);
  rerender(<TestPanel value={null} />);
  expect(screen.getByTestId('panel')).toHaveAttribute('data-exiting', 'true');

  act(() => {
    vi.advanceTimersByTime(100);
  });
  rerender(<TestPanel value={{ title: '第二项' }} />);
  expect(screen.getByTestId('panel')).toHaveAttribute('data-exiting', 'false');
  expect(screen.getByTestId('panel')).toHaveTextContent('第二项');

  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(screen.getByTestId('panel')).toHaveTextContent('第二项');
});

it('unmounts immediately when reduced motion is preferred', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  const { rerender } = render(<TestPanel value={{ title: '设置' }} />);
  rerender(<TestPanel value={null} />);
  expect(screen.queryByTestId('panel')).toBeNull();
});
