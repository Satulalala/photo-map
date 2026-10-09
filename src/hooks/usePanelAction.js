import { useEffect, useRef, useState } from 'react';

export function usePanelAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async action => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch {
      if (mounted.current) setError('操作失败，请重试。');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { busy, error, run, canClose: () => !pending.current };
}
