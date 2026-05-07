import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 照片编辑器组件 - 现代化 UI
 * 裁剪和旋转在同一页面同时操作
 */
function PhotoEditor({ 
  photoEditor, 
  setPhotoEditor, 
  setPhotoViewer,
  cropPhoto,
  refreshMarkers
}) {
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'new' | 'move' | 'tl' | 'tr' | 'bl' | 'br'
  const [saving, setSaving] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const loadedUrlRef = useRef(null);

  // 重置状态
  useEffect(() => {
    if (photoEditor) {
      setRotation(0);
      setCropArea(null);
      loadedUrlRef.current = photoEditor.photoUrl;
    }
  }, [photoEditor?.photoUrl]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 卸载时释放 Blob URL
      if (loadedUrlRef.current?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(loadedUrlRef.current);
        } catch {}
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (photoEditor?.returnToViewer) {
      setPhotoViewer(photoEditor.returnToViewer);
    }
    setPhotoEditor(null);
  }, [photoEditor, setPhotoViewer, setPhotoEditor]);

  // 获取容器边界
  const getContainerBounds = () => {
    const container = containerRef.current;
    if (!container) return null;
    return container.getBoundingClientRect();
  };

  // 裁剪开始
  const handleMouseDown = (e) => {
    if (e.target.closest('.crop-handle')) return; // 由 handle 自己处理
    
    const bounds = getContainerBounds();
    if (!bounds) return;
    
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    
    // 检查是否点击在现有裁剪区域内（移动）
    if (cropArea && 
        x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setDragType('move');
      dragStartRef.current = { x, y, cropArea: { ...cropArea } };
    } else {
      // 新建裁剪区域
      setDragType('new');
      dragStartRef.current = { x, y };
      setCropArea(null);
    }
    setIsDragging(true);
  };

  // 角落拖拽开始
  const handleCornerDown = (corner, e) => {
    e.stopPropagation();
    const bounds = getContainerBounds();
    if (!bounds || !cropArea) return;
    
    setDragType(corner);
    dragStartRef.current = { 
      x: e.clientX - bounds.left, 
      y: e.clientY - bounds.top,
      cropArea: { ...cropArea }
    };
    setIsDragging(true);
  };

  // 鼠标移动
  const handleMouseMove = (e) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const bounds = getContainerBounds();
    if (!bounds) return;
    
    const x = Math.max(0, Math.min(bounds.width, e.clientX - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, e.clientY - bounds.top));
    
    if (dragType === 'new') {
      const { x: sx, y: sy } = dragStartRef.current;
      setCropArea({
        x: Math.min(sx, x),
        y: Math.min(sy, y),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy)
      });
    } else if (dragType === 'move') {
      const { x: sx, y: sy, cropArea: orig } = dragStartRef.current;
      const dx = x - sx, dy = y - sy;
      setCropArea({
        x: Math.max(0, Math.min(bounds.width - orig.width, orig.x + dx)),
        y: Math.max(0, Math.min(bounds.height - orig.height, orig.y + dy)),
        width: orig.width,
        height: orig.height
      });
    } else {
      // 角落调整
      const { cropArea: orig } = dragStartRef.current;
      let newArea = { ...orig };
      
      if (dragType.includes('l')) {
        newArea.width = orig.x + orig.width - x;
        newArea.x = x;
      }
      if (dragType.includes('r')) {
        newArea.width = x - orig.x;
      }
      if (dragType.includes('t')) {
        newArea.height = orig.y + orig.height - y;
        newArea.y = y;
      }
      if (dragType.includes('b')) {
        newArea.height = y - orig.y;
      }
      
      // 确保最小尺寸
      if (newArea.width >= 20 && newArea.height >= 20) {
        setCropArea(newArea);
      }
    }
  };

  // 鼠标释放
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
    dragStartRef.current = null;
  };

  // 旋转 - 不使用模运算，避免动画绕圈
  const rotateLeft = () => {
    setRotation(r => r - 90);
    setCropArea(null);
  };
  
  const rotateRight = () => {
    setRotation(r => r + 90);
    setCropArea(null);
  };

  // 重置 - 直接设为0，CSS transition 会处理动画
  const handleReset = () => {
    setRotation(0);
    setCropArea(null);
  };
  
  // 获取实际旋转角度（0-360）
  const getActualRotation = () => ((rotation % 360) + 360) % 360;

  // 清除裁剪
  const clearCrop = () => {
    setCropArea(null);
  };

  // 保存
  const handleSave = async () => {
    const img = imgRef.current;
    if (!img) return;
    
    setSaving(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    tempImg.onload = async () => {
      let sw = tempImg.naturalWidth, sh = tempImg.naturalHeight;
      const actualRotation = getActualRotation();
      const isRotated = actualRotation % 180 !== 0;
      
      canvas.width = isRotated ? sh : sw;
      canvas.height = isRotated ? sw : sh;
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((actualRotation * Math.PI) / 180);
      ctx.drawImage(tempImg, -sw / 2, -sh / 2);
      ctx.restore();
      
      if (cropArea && cropArea.width > 10 && cropArea.height > 10) {
        const container = containerRef.current;
        if (container) {
          const displayRect = container.getBoundingClientRect();
          const scaleX = canvas.width / displayRect.width;
          const scaleY = canvas.height / displayRect.height;
          
          const cx = cropArea.x * scaleX;
          const cy = cropArea.y * scaleY;
          const cw = cropArea.width * scaleX;
          const ch = cropArea.height * scaleY;
          
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cw;
          cropCanvas.height = ch;
          cropCanvas.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
          
          canvas.width = cw;
          canvas.height = ch;
          ctx.drawImage(cropCanvas, 0, 0);
        }
      }
      
      canvas.toBlob((blob) => {
        if (!blob) { setSaving(false); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `edited_${Date.now()}.jpg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setSaving(false);
        handleClose();
      }, 'image/jpeg', 0.92);
    };
    
    tempImg.onerror = () => setSaving(false);
    tempImg.src = photoEditor.photoUrl;
  };

  if (!photoEditor) return null;

  const actualRotation = getActualRotation();
  const hasChanges = actualRotation !== 0 || (cropArea && cropArea.width > 10 && cropArea.height > 10);

  return (
    <div 
      className="photo-editor-overlay"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="photo-editor-modern">
        {/* 顶部栏 */}
        <div className="pe-header">
          <button className="pe-btn pe-cancel" onClick={handleClose}>取消</button>
          <span className="pe-title">编辑</span>
          <button 
            className={`pe-btn pe-done ${hasChanges ? 'active' : ''}`}
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? '保存中...' : '完成'}
          </button>
        </div>

        {/* 图片区域 */}
        <div className="pe-canvas-area">
          <div 
            ref={containerRef}
            className="pe-image-container"
            onMouseDown={handleMouseDown}
          >
            <img 
              ref={imgRef}
              src={photoEditor.photoUrl} 
              alt="编辑" 
              draggable={false}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            
            {/* 裁剪遮罩和选区 */}
            {cropArea && cropArea.width > 5 && (
              <>
                <div className="pe-crop-overlay" />
                <div 
                  className="pe-crop-box"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  }}
                >
                  {/* 网格线 */}
                  <div className="pe-grid">
                    <div className="pe-grid-h" style={{ top: '33.33%' }} />
                    <div className="pe-grid-h" style={{ top: '66.66%' }} />
                    <div className="pe-grid-v" style={{ left: '33.33%' }} />
                    <div className="pe-grid-v" style={{ left: '66.66%' }} />
                  </div>
                  {/* 角落手柄 */}
                  <div className="crop-handle tl" onMouseDown={(e) => handleCornerDown('tl', e)} />
                  <div className="crop-handle tr" onMouseDown={(e) => handleCornerDown('tr', e)} />
                  <div className="crop-handle bl" onMouseDown={(e) => handleCornerDown('bl', e)} />
                  <div className="crop-handle br" onMouseDown={(e) => handleCornerDown('br', e)} />
                </div>
              </>
            )}
          </div>
          
          {/* 右侧复原按钮 */}
          {hasChanges && (
            <button className="pe-reset-btn" onClick={handleReset} title="重置全部">
              <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            </button>
          )}
          
          {/* 提示文字 */}
          {!cropArea && !hasChanges && (
            <div className="pe-hint">拖拽选择裁剪区域</div>
          )}
          
          {/* 状态指示 */}
          {hasChanges && (
            <div className="pe-status">
              {actualRotation !== 0 && <span className="pe-status-item">旋转 {actualRotation}°</span>}
              {cropArea && cropArea.width > 10 && (
                <span className="pe-status-item">{Math.round(cropArea.width)} × {Math.round(cropArea.height)}</span>
              )}
            </div>
          )}
        </div>

        {/* 底部工具栏 - 固定布局 */}
        <div className="pe-toolbar">
          <button className="pe-tool" onClick={rotateLeft} title="逆时针旋转">
            <svg viewBox="0 0 24 24"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>
          </button>
          <button className="pe-tool" onClick={rotateRight} title="顺时针旋转">
            <svg viewBox="0 0 24 24"><path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/></svg>
          </button>
          {cropArea && (
            <button className="pe-tool" onClick={clearCrop} title="清除裁剪">
              <svg viewBox="0 0 24 24"><path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/><path d="M2.5 3.5l18 18" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoEditor;
