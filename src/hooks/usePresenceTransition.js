import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 控制浮层/弹窗的挂载与退场过渡生命周期，在退场阶段保留最近一次有效数据快照。
 */
export function usePresenceTransition(value, duration = 180) {
  const isOpen = Boolean(value);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(isOpen);
  const [entered, setEntered] = useState(false);
  const snapshotRef = useRef(isOpen ? value : null);
  const timerRef = useRef(null);
  const rafRef = useRef(null);

  if (isOpen) {
    snapshotRef.current = value;
  }

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (rafRef.current != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (isOpen) {
      setMounted(true);
      setExiting(false);
      if (duration <= 0 || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
        setEntered(true);
        return undefined;
      }
      setEntered(false);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setEntered(true);
        });
      });
      return () => {
        if (rafRef.current != null && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }

    setEntered(false);
    if (!mounted) return undefined;

    if (duration <= 0 || prefersReducedMotion()) {
      setExiting(false);
      setMounted(false);
      snapshotRef.current = null;
      return undefined;
    }

    setExiting(true);
    timerRef.current = setTimeout(() => {
      setExiting(false);
      setMounted(false);
      snapshotRef.current = null;
      timerRef.current = null;
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [isOpen, duration, mounted]);

  const effectiveMounted = isOpen || mounted;
  return {
    mounted: effectiveMounted,
    entered: isOpen && entered,
    exiting: !isOpen && effectiveMounted && exiting,
    snapshot: isOpen ? value : snapshotRef.current,
  };
}
