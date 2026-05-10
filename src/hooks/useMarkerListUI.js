import { useState, useCallback, useRef } from 'react';

export function useMarkerListUI() {
  const [showMarkerList, setShowMarkerList] = useState(false);
  const [markerListReady, setMarkerListReady] = useState(false);
  const [markerListClosing, setMarkerListClosing] = useState(false);
  const [markerListRect, setMarkerListRect] = useState(null);
  const [markerListTransitioning, setMarkerListTransitioning] = useState(false);
  const [markerListContentHidden, setMarkerListContentHidden] = useState(false);
  const [markerBtnReveal, setMarkerBtnReveal] = useState(false);
  const markerManageBtnRef = useRef(null);

  const closeMarkerListWithAnimation = useCallback(() => {
    if (markerListTransitioning) return;
    const btn = markerManageBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setMarkerListRect(prev => ({
      ...(prev || {}),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.max(btn.offsetWidth, btn.offsetHeight),
    }));
    setMarkerListClosing(true);
    setMarkerListTransitioning(true);
    setTimeout(() => {
      setShowMarkerList(false);
      setMarkerListReady(false);
      setMarkerListClosing(false);
      setMarkerListTransitioning(false);
      setMarkerBtnReveal(true);
      setTimeout(() => setMarkerBtnReveal(false), 600);
    }, 400);
  }, [markerListTransitioning]);

  const handleOpenMarkerList = useCallback(() => {
    if (markerListTransitioning) return;
    const btn = markerManageBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 计算面板位置
    setMarkerListRect({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: Math.max(btn.offsetWidth, btn.offsetHeight),
      targetW: Math.min(1200, vw - 80),
      targetH: Math.min(800, vh - 120),
      dx: (vw / 2) - (rect.left + rect.width / 2),
      dy: (vh / 2) - (rect.top + rect.height / 2),
      startScale: Math.max(btn.offsetWidth, btn.offsetHeight) / Math.min(1200, vw - 80),
    });
    setMarkerListTransitioning(true);
    setShowMarkerList(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMarkerListReady(true);
        setMarkerListContentHidden(false);
        setMarkerListTransitioning(false);
      });
    });
  }, [markerListTransitioning]);

  const handleCloseMarkerList = useCallback(() => {
    closeMarkerListWithAnimation();
  }, [closeMarkerListWithAnimation]);

  return {
    showMarkerList, markerListReady, markerListClosing, markerListRect,
    markerListTransitioning, markerListContentHidden, markerBtnReveal,
    markerManageBtnRef,
    setShowMarkerList, setMarkerListReady, setMarkerListClosing,
    setMarkerListRect, setMarkerListTransitioning, setMarkerListContentHidden,
    setMarkerBtnReveal,
    handleOpenMarkerList, handleCloseMarkerList, closeMarkerListWithAnimation,
  };
}
