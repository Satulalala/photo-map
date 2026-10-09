import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { usePanelAction } from './usePanelAction.js';

it('prevents duplicate saves while pending and allows retry after failure', async () => {
  let reject;
  const save = vi.fn(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      })
  );
  const { result } = renderHook(() => usePanelAction());
  let operation;
  act(() => {
    operation = result.current.run(save);
    void result.current.run(save);
  });
  expect(save).toHaveBeenCalledOnce();
  expect(result.current.busy).toBe(true);
  expect(result.current.canClose()).toBe(false);
  await act(async () => {
    reject(new Error('network'));
    await operation;
  });
  expect(result.current.error).toBe('操作失败，请重试。');
  expect(result.current.canClose()).toBe(true);
  await act(async () => result.current.run(() => Promise.resolve()));
  expect(result.current.error).toBe('');
});
