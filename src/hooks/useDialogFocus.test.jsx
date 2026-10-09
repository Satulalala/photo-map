import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useDialogFocus } from './useDialogFocus.js';

function Dialog({ open, onClose }) {
  useDialogFocus(open, '[data-testid="dialog"]', onClose);
  return open ? (
    <div data-testid="dialog" tabIndex={-1}>
      <button>第一个</button>
      <input aria-label="输入内容" />
      <button>最后一个</button>
    </div>
  ) : null;
}

it('keeps Tab in the dialog, closes from an input with Escape, and restores focus', () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const onClose = vi.fn();
  const view = render(<Dialog open onClose={onClose} />);
  expect(screen.getByRole('button', { name: '第一个' })).toHaveFocus();
  screen.getByRole('button', { name: '最后一个' }).focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(screen.getByRole('button', { name: '第一个' })).toHaveFocus();
  screen.getByRole('textbox').focus();
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
  view.rerender(<Dialog open={false} onClose={onClose} />);
  expect(trigger).toHaveFocus();
  trigger.remove();
});

function NestedDialog({ onClose }) {
  useDialogFocus(true, '[data-testid="child"]', onClose);
  return (
    <div data-testid="child" tabIndex={-1}>
      <button>关闭子窗口</button>
    </div>
  );
}

function ParentDialog({ onClose, onChildClose }) {
  useDialogFocus(true, '[data-testid="parent"]', onClose);
  return (
    <div data-testid="parent" tabIndex={-1}>
      <button>父窗口操作</button>
      <NestedDialog onClose={onChildClose} />
    </div>
  );
}

it('Escape only closes the innermost dialog regardless of effect registration order', () => {
  const parent = vi.fn();
  const child = vi.fn();
  render(<ParentDialog onClose={parent} onChildClose={child} />);
  expect(screen.getByRole('button', { name: '关闭子窗口' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(child).toHaveBeenCalledOnce();
  expect(parent).not.toHaveBeenCalled();
});
