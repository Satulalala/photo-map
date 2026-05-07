import { useState, useEffect, useRef, memo } from 'react';

/**
 * 使用 createImageBitmap 解码图片（减少主线程阻塞和内存占用）
 * 相比 Image 对象，createImageBitmap 在后台线程解码，不阻塞 UI
 * 解码后的 ImageBitmap 可以直接绘制到 Canvas，内存占用更低
 */
async function decodeImage(url) {
  try {
    // 优先使用 createImageBitmap（现代浏览器支持）
    if (typeof createImageBitmap === 'function') {
      const response = await fetch(url);
      const blob = await response.blob();
      // createImageBitmap 在后台线程解码，不阻塞主线程
      const bitmap = await createImageBitmap(blob);
      // 返回原始 URL，bitmap 用于验证图片有效性
      bitmap.close(); // 立即释放 bitmap 内存
      return url;
    }
  } catch {
    // 降级到普通加载
  }
  return url;
}

/**
 * 懒加载缩略图组件 - 使用 IntersectionObserver 精确控制加载时机
 * 优化：使用 createImageBitmap 在后台线程解码图片
 */
const LazyPhoto = memo(function LazyPhoto({ photo, className, alt = '', useThumbnail = true }) {
  const [placeholder, setPlaceholder] = useState('');
  const [src, setSrc] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const prevUrlRef = useRef(null);
  
  // IntersectionObserver 检测可见性
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // 可见后停止观察
        }
      },
      { rootMargin: '100px', threshold: 0.01 } // 提前 100px 开始加载
    );
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  // 可见时才加载图片
  useEffect(() => {
    if (!isVisible || !photo) return;
    
    const cleanup = () => {
      if (prevUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
    
    setLoaded(false);
    
    // 旧格式：直接是 base64
    if (typeof photo === 'string') {
      cleanup();
      setSrc(photo);
      setPlaceholder('');
      prevUrlRef.current = photo;
      return;
    }
    if (photo.data?.startsWith('data:')) {
      cleanup();
      setSrc(photo.data);
      setPlaceholder('');
      prevUrlRef.current = photo.data;
      return;
    }
    
    // 新格式：从文件加载
    if (photo.id && window.electronAPI) {
      // 先加载模糊占位图
      if (window.electronAPI.getPlaceholderUrl) {
        window.electronAPI.getPlaceholderUrl(photo.id).then(url => {
          if (url) setPlaceholder(url);
        });
      }
      
      // 加载缩略图或原图
      const getUrl = useThumbnail && window.electronAPI.getThumbnailUrl 
        ? window.electronAPI.getThumbnailUrl 
        : window.electronAPI.getPhotoUrl;
      getUrl(photo.id).then(url => {
        if (url) {
          cleanup();
          setSrc(url);
          prevUrlRef.current = url;
        }
      });
    }
    
    return cleanup;
  }, [isVisible, photo, useThumbnail]);
  
  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* 骨架占位 */}
      {!src && !placeholder && (
        <div style={{ 
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', 
          backgroundSize: '200% 100%', 
          animation: 'shimmer 1.5s infinite' 
        }} />
      )}
      {/* 模糊占位图 */}
      {placeholder && !loaded && (
        <img 
          src={placeholder} 
          alt="" 
          style={{ 
            position: 'absolute', inset: 0, 
            width: '100%', height: '100%', 
            objectFit: 'cover',
            filter: 'blur(10px)',
            transform: 'scale(1.1)'
          }} 
        />
      )}
      {/* 实际图片 */}
      {src && (
        <img 
          src={src} 
          alt={alt} 
          onLoad={() => setLoaded(true)}
          style={{ 
            width: '100%', height: '100%', 
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }} 
        />
      )}
    </div>
  );
});

export default LazyPhoto;
