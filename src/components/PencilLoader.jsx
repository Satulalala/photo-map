import { useEffect, useState, useRef } from 'react';

/**
 * Field Notes Pencil Loader
 * Draws a circle with pencil-like stroke, then reveals a button or auto-completes.
 */
export default function PencilLoader({ onComplete, canEnter, onShowLogin }) {
  const [phase, setPhase] = useState('drawing');
  const timerRef = useRef(null);

  useEffect(() => {
    // Phase 1: draw circle (1.3s)
    timerRef.current = setTimeout(() => setPhase('drawn'), 1300);

    if (!canEnter) {
      // Auto-complete: dotted phase then done
      const t2 = setTimeout(() => setPhase('dotted'), 1500);
      const t3 = setTimeout(() => {
        setPhase('done');
        onComplete?.();
      }, 2000);
      return () => { clearTimeout(timerRef.current); clearTimeout(t2); clearTimeout(t3); };
    }
    return () => clearTimeout(timerRef.current);
  }, [onComplete, canEnter]);

  if (phase === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'var(--paper-white, #fefdf7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        transition: 'opacity 400ms ease',
      }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ overflow: 'visible' }}>
        <circle
          cx="36" cy="36" r="30"
          fill="none"
          stroke="var(--darkroom-red, #c73e1d)"
          strokeWidth="2"
          strokeDasharray={phase === 'dotted' ? '4 4' : '188.5'}
          strokeDashoffset={phase === 'drawing' ? '188.5' : '0'}
          strokeLinecap="round"
          style={{ transition: phase === 'dotted' ? 'stroke-dasharray 200ms ease' : 'none' }}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="188.5" to="0"
            dur="1.2s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.42 0 0.58 1"
          />
        </circle>
      </svg>

      {phase === 'drawing' && (
        <span style={{
          fontFamily: 'var(--font-serif, serif)',
          fontSize: '15px',
          color: 'var(--ink-secondary, #6b5e4e)',
          fontStyle: 'italic',
        }}>
          在地图上画一个圈
        </span>
      )}

      {canEnter && phase === 'drawn' && (
        <button
          onClick={() => {
            setPhase('done');
            onShowLogin?.();
          }}
          className="btn btn-primary"
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '16px',
            padding: '12px 32px',
            animation: 'fadeIn 400ms ease both',
          }}
        >
          进入地图
        </button>
      )}
    </div>
  );
}
