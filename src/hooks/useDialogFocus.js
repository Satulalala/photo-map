import { useLayoutEffect, useRef } from 'react';

const focusableSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const dialogs = [];
const topDialog = () =>
  dialogs.reduce((top, candidate) => {
    if (!top || top.contains(candidate)) return candidate;
    if (candidate.contains(top)) return top;
    return (parseFloat(getComputedStyle(candidate).zIndex) || 0) >=
      (parseFloat(getComputedStyle(top).zIndex) || 0)
      ? candidate
      : top;
  }, null);

export function useDialogFocus(open, selector, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (!open) return;
    const dialog = document.querySelector(selector);
    if (!dialog) return;
    const previous = document.activeElement;
    dialogs.push(dialog);
    const getControls = () =>
      [...dialog.querySelectorAll(focusableSelector)].filter(
        element =>
          !element.closest('[hidden]') &&
          getComputedStyle(element).display !== 'none' &&
          getComputedStyle(element).visibility !== 'hidden'
      );
    if (topDialog() === dialog)
      (dialog.querySelector('.settings-close') || getControls()[0] || dialog).focus();

    const handleKeyDown = event => {
      if (topDialog() !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = getControls();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      dialogs.splice(dialogs.indexOf(dialog), 1);
      if (previous?.isConnected && (!topDialog() || topDialog().contains(previous)))
        previous.focus();
    };
  }, [open, selector]);
}
