import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const GSAPFilmLoader = ({ onComplete }) => {
  const containerRef = useRef(null);
  const leftFilmRef = useRef(null);
  const rightFilmRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const tlRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 主时间轴
    const masterTL = gsap.timeline();
    tlRef.current = masterTL;

    // 左右两条弯曲胶卷
    const leftFilm = containerRef.current.querySelector('.left-film-strip path');
    const rightFilm = containerRef.current.querySelector('.right-film-strip path');
    const leftFilmPaths = containerRef.current.querySelectorAll('.left-film-strip path');
    const rightFilmPaths = containerRef.current.querySelectorAll('.right-film-strip path');

    // 设置初始状态 - 胶卷路径不可见
    gsap.set([leftFilmPaths, rightFilmPaths], {
      strokeDasharray: "0 1000",
      opacity: 1
    });

    // 左侧胶卷延长动画 - 路径逐渐显现
    leftFilmPaths.forEach((path, i) => {
      masterTL.to(path, {
        duration: 2.5,
        strokeDasharray: "1000 0",
        ease: 'power2.out',
        delay: i * 0.1
      }, 0);
    });

    // 左侧胶卷整体螺旋扭转
    masterTL.to(containerRef.current.querySelector('.left-film-strip'), {
      duration: 4,
      rotationY: 360,
      rotationX: 20,
      rotationZ: 180,
      ease: 'none',
      repeat: -1
    }, 1);

    // 右侧胶卷延长动画
    rightFilmPaths.forEach((path, i) => {
      masterTL.to(path, {
        duration: 2.5,
        strokeDasharray: "1000 0",
        ease: 'power2.out',
        delay: i * 0.1
      }, 0.3);
    });

    // 右侧胶卷整体螺旋扭转（反向）
    masterTL.to(containerRef.current.querySelector('.right-film-strip'), {
      duration: 4,
      rotationY: -360,
      rotationX: -20,
      rotationZ: -180,
      ease: 'none',
      repeat: -1
    }, 1.3);

    // 进度更新
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          
          // 完成动画 - 胶卷向中心汇聚
          const completeTL = gsap.timeline({
            onComplete: () => setTimeout(onComplete, 500)
          });
          
          completeTL.to([leftFilmPaths, rightFilmPaths], {
            duration: 1,
            strokeDasharray: "0 1000",
            opacity: 0,
            ease: 'power2.in',
            stagger: 0.05
          });
          
          return 100;
        }
        return prev + 1.5;
      });
    }, 60);

    return () => {
      clearInterval(progressTimer);
      if (tlRef.current) {
        tlRef.current.kill();
      }
    };
  }, [onComplete]);

  // 创建弯曲盘旋的胶卷（SVG路径）
  const createCurvedFilm = (side) => {
    const isLeft = side === 'left';
    
    // 螺旋路径 - 像丝带一样弯曲
    const spiralPath = isLeft 
      ? "M 0 200 Q 100 150 200 200 Q 300 250 400 200 Q 500 150 600 200 Q 700 250 800 200"
      : "M 800 200 Q 700 150 600 200 Q 500 250 400 200 Q 300 150 200 200 Q 100 250 0 200";
    
    return (
      <svg
        key={side}
        className={`${side}-film-strip`}
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          overflow: 'visible',
          transformStyle: 'preserve-3d'
        }}
        viewBox="0 0 800 400"
      >
        <defs>
          {/* 胶卷渐变 */}
          <linearGradient id={`filmGradient-${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f0f0" />
            <stop offset="25%" stopColor="#d0d0d0" />
            <stop offset="50%" stopColor="#b0b0b0" />
            <stop offset="75%" stopColor="#909090" />
            <stop offset="100%" stopColor="#707070" />
          </linearGradient>
          
          {/* 孔洞图案 */}
          <pattern id={`holes-${side}`} x="0" y="0" width="20" height="30" patternUnits="userSpaceOnUse">
            {/* 上排孔洞 */}
            <circle cx="10" cy="8" r="2" fill="#2a2a2a" />
            {/* 下排孔洞 */}
            <circle cx="10" cy="22" r="2" fill="#2a2a2a" />
            {/* 中间图像区域 */}
            <rect x="0" y="10" width="20" height="10" fill="#1a1a1a" />
          </pattern>
        </defs>
        
        {/* 胶卷主体路径 */}
        <path
          d={spiralPath}
          stroke={`url(#filmGradient-${side})`}
          strokeWidth="30"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0 1000"
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        />
        
        {/* 胶卷孔洞 */}
        <path
          d={spiralPath}
          stroke={`url(#holes-${side})`}
          strokeWidth="26"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0 1000"
        />
        
        {/* 胶卷边框 */}
        <path
          d={spiralPath}
          stroke="#555"
          strokeWidth="32"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0 1000"
          opacity="0.8"
        />
      </svg>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 40%, #0f0f23 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      overflow: 'hidden'
    }}>
      {/* 星空背景 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.9), transparent),
          radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.7), transparent),
          radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.8), transparent),
          radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.6), transparent),
          radial-gradient(1px 1px at 160px 30px, rgba(255,255,255,0.9), transparent)
        `,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 100px',
        opacity: 0.8
      }} />

      {/* 胶卷动画容器 */}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'relative', 
          width: '100vw', 
          height: '400px',
          perspective: '1000px'
        }}
      >
        {/* 左侧弯曲胶卷 */}
        {createCurvedFilm('left')}
        
        {/* 右侧弯曲胶卷 */}
        {createCurvedFilm('right')}
      </div>

      {/* 应用信息 */}
      <div style={{ 
        textAlign: 'center', 
        color: 'white', 
        marginTop: '40px',
        zIndex: 1
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          margin: '0 0 16px 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          background: 'linear-gradient(135deg, #fff 0%, #e2e8f0 50%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          地图相册
        </h1>
        
        {/* 进度条 */}
        <div style={{
          width: '240px',
          height: '6px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '3px',
          margin: '0 auto 12px',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
          }} />
        </div>
        
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.8,
          fontWeight: '500'
        }}>
          {progress < 100 ? `正在加载... ${Math.round(progress)}%` : '准备就绪'}
        </div>
      </div>
    </div>
  );
};

export default GSAPFilmLoader;