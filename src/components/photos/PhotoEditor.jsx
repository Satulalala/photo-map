import { useState, useRef, useEffect } from 'react';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';
import { fitPhoto, normalizeRotation, exportPhoto } from './photoTransform.js';

export default function PhotoEditor({ photoEditor, setPhotoEditor, setPhotoViewer }) {
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [available, setAvailable] = useState({ width: 1, height: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const stageRef = useRef(null);
  const drag = useRef(null);
  const pending = useRef(false);
  const fit = natural.width
    ? fitPhoto(natural.width, natural.height, rotation, available.width, available.height)
    : null;
  const hasCrop = crop && crop.width >= 10 && crop.height >= 10;
  const changed = normalizeRotation(rotation) !== 0 || hasCrop;

  const close = () => {
    if (pending.current) return;
    if (photoEditor.returnToViewer) setPhotoViewer(photoEditor.returnToViewer);
    setPhotoEditor(null);
  };
  useDialogFocus(true, '.photo-editor-overlay', close);
  useEffect(() => {
    const stage = stageRef.current;
    const observer = new ResizeObserver(() => {
      setAvailable({
        width: Math.max(1, stage.clientWidth - 48),
        height: Math.max(1, stage.clientHeight - 80),
      });
      setCrop(null);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const point = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    };
  };
  const start = event => {
    if (saving || !fit || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const corner = event.target.dataset.corner;
    const inside =
      crop &&
      p.x >= crop.x &&
      p.x <= crop.x + crop.width &&
      p.y >= crop.y &&
      p.y <= crop.y + crop.height;
    drag.current = { ...p, crop, kind: corner || (inside ? 'move' : 'new') };
    if (!inside && !corner) setCrop(null);
  };
  const move = event => {
    if (!drag.current || saving) return;
    const p = point(event);
    const { x, y, crop: original, kind } = drag.current;
    if (kind === 'new') {
      setCrop({
        x: Math.min(x, p.x),
        y: Math.min(y, p.y),
        width: Math.abs(p.x - x),
        height: Math.abs(p.y - y),
      });
    } else if (kind === 'move') {
      setCrop({
        ...original,
        x: Math.max(0, Math.min(fit.width - original.width, original.x + p.x - x)),
        y: Math.max(0, Math.min(fit.height - original.height, original.y + p.y - y)),
      });
    } else {
      const left = kind.includes('l')
        ? Math.min(p.x, original.x + original.width - 10)
        : original.x;
      const top = kind.includes('t')
        ? Math.min(p.y, original.y + original.height - 10)
        : original.y;
      const right = kind.includes('r')
        ? Math.max(p.x, original.x + 10)
        : original.x + original.width;
      const bottom = kind.includes('b')
        ? Math.max(p.y, original.y + 10)
        : original.y + original.height;
      setCrop({ x: left, y: top, width: right - left, height: bottom - top });
    }
  };
  const save = async () => {
    if (pending.current || !changed || !fit) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const blob = await exportPhoto(photoEditor.photoUrl, rotation, hasCrop ? crop : null, fit);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `edited_${Date.now()}.jpg`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      pending.current = false;
      close();
    } catch {
      setError('导出失败，请检查照片是否加载完成后重试。');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <div
      className="photo-editor-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="编辑照片"
      aria-busy={saving}
      tabIndex={-1}
    >
      <div className="photo-editor-modern">
        <div className="pe-header">
          <button type="button" className="pe-btn pe-cancel" onClick={close} disabled={saving}>
            取消
          </button>
          <span className="pe-title">编辑照片</span>
          <button
            type="button"
            className={`pe-btn pe-done ${changed ? 'active' : ''}`}
            onClick={save}
            disabled={!changed || saving}
          >
            {saving ? '导出中…' : '导出副本'}
          </button>
        </div>
        <div className="pe-canvas-area" ref={stageRef}>
          <div
            className="pe-image-container"
            style={fit ? { width: fit.width, height: fit.height } : undefined}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <img
              src={photoEditor.photoUrl}
              alt="正在编辑的照片"
              draggable={false}
              onLoad={event =>
                setNatural({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setError('照片加载失败。')}
              style={
                fit
                  ? {
                      width: fit.imageWidth,
                      height: fit.imageHeight,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    }
                  : undefined
              }
            />
            {crop && crop.width > 5 && (
              <div
                className="pe-crop-box"
                style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
              >
                <div className="pe-grid">
                  <div className="pe-grid-h" style={{ top: '33.33%' }} />
                  <div className="pe-grid-h" style={{ top: '66.66%' }} />
                  <div className="pe-grid-v" style={{ left: '33.33%' }} />
                  <div className="pe-grid-v" style={{ left: '66.66%' }} />
                </div>
                {['tl', 'tr', 'bl', 'br'].map(corner => (
                  <span key={corner} data-corner={corner} className={`crop-handle ${corner}`} />
                ))}
              </div>
            )}
          </div>
          {!crop && <p className="pe-hint">拖动鼠标或手指选择裁剪区域</p>}
          {error && (
            <p className="pe-status" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="pe-toolbar">
          <button
            type="button"
            className="pe-tool"
            disabled={saving || !fit}
            aria-label="逆时针旋转"
            title="逆时针旋转"
            onClick={() => {
              setRotation(value => value - 90);
              setCrop(null);
            }}
          >
            <MapIcon name="rotateLeft" />
          </button>
          <button
            type="button"
            className="pe-tool"
            disabled={saving || !fit}
            aria-label="顺时针旋转"
            title="顺时针旋转"
            onClick={() => {
              setRotation(value => value + 90);
              setCrop(null);
            }}
          >
            <MapIcon name="rotateRight" />
          </button>
          <button
            type="button"
            className="pe-tool"
            disabled={saving || !crop}
            aria-label="清除裁剪"
            title="清除裁剪"
            onClick={() => setCrop(null)}
          >
            <MapIcon name="crop" />
          </button>
          <button
            type="button"
            className="pe-tool"
            disabled={saving || !changed}
            aria-label="重置全部"
            title="重置全部"
            onClick={() => {
              setRotation(0);
              setCrop(null);
            }}
          >
            <MapIcon name="refresh" />
          </button>
        </div>
      </div>
    </div>
  );
}
