import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const ArknightsLoader = ({ onComplete }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef(null);

  // 粒子系统
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 100;

    // 创建粒子
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        hue: Math.random() * 60 + 200 // 蓝色系
      });
    }

    // 动画循环
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 15, 35, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        // 更新位置
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 边界检测
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // 绘制粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.fill();

        // 连线效果
        particles.forEach((otherParticle, j) => {
          if (i !== j) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `hsla(${particle.hue}, 70%, 60%, ${0.3 * (1 - distance / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // GSAP 动画
  useEffect(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline();

    // Logo 入场动画
    tl.from('.ark-logo', {
      scale: 0,
      rotation: 360,
      duration: 1.5,
      ease: 'back.out(1.7)'
    })
    // 标题动画
    .from('.ark-title', {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power2.out'
    }, 0.5)
    // 进度条动画
    .from('.ark-progress-container', {
      scaleX: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 1)
    // 流光效果
    .to('.ark-glow', {
      x: '200%',
      duration: 2,
      ease: 'power2.inOut',
      repeat: -1
    }, 1.5);

    // 进度更新
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          
          // 完成动画
          gsap.to(containerRef.current, {
            scale: 1.1,
            opacity: 0,
            duration: 1,
            ease: 'power2.in',
            onComplete: () => setTimeout(onComplete, 200)
          });
          
          return 100;
        }
        return prev + 1.2;
      });
    }, 50);

    return () => {
      clearInterval(progressTimer);
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #0a0f23 0%, #1a2332 50%, #2a3441 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        overflow: 'hidden'
      }}
    >
      {/* 粒子背景 */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}
      />

      {/* 主要内容 */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Logo */}
        <div 
          className="ark-logo"
          style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 30px',
            background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 50%, #0288d1 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            boxShadow: '0 0 30px rgba(79, 195, 247, 0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          🗺️
          {/* 流光效果 */}
          <div 
            className="ark-glow"
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              transform: 'skewX(-20deg)'
            }}
          />
        </div>

        {/* 标题 */}
        <h1 
          className="ark-title"
          style={{
            fontSize: '36px',
            fontWeight: '700',
            margin: '0 0 40px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #4fc3f7 50%, #29b6f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 20px rgba(79, 195, 247, 0.3)',
            letterSpacing: '2px'
          }}
        >
          地图相册
        </h1>

        {/* 进度条容器 */}
        <div 
          className="ark-progress-container"
          style={{
            width: '300px',
            height: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            margin: '0 auto 20px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          {/* 进度条 */}
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4fc3f7, #29b6f6, #0288d1)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 10px rgba(79, 195, 247, 0.6)',
            position: 'relative'
          }}>
            {/* 进度条流光 */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '20px',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8))',
              animation: progress > 0 ? 'progressGlow 1s ease-in-out infinite' : 'none'
            }} />
          </div>
        </div>

        {/* 进度文字 */}
        <div style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.8)',
          fontWeight: '500',
          letterSpacing: '1px'
        }}>
          {progress < 100 ? `初始化中... ${Math.round(progress)}%` : '准备完成'}
        </div>

        {/* 副标题 */}
        <div style={{
          fontSize: '12px',
          color: 'rgba(79, 195, 247, 0.7)',
          marginTop: '10px',
          letterSpacing: '0.5px'
        }}>
          PHOTO MAP SYSTEM
        </div>
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes progressGlow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ArknightsLoader;