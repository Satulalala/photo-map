import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

const LottieFilmLoader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + 1.5;
      });
    }, 60);

    return () => clearInterval(timer);
  }, [onComplete]);

  // 使用在线的Lottie动画 - 胶卷/电影相关
  const [animationData, setAnimationData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // 加载Lottie动画数据
    fetch("https://lottie.host/4db68bbd-31f6-4008-a862-a8ebe24581b9/2QkQmOJlhK.json")
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => {
        console.log('Failed to load Lottie animation:', error);
        setLoadError(true);
      });
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      {/* 星空背景 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(2px 2px at 20px 30px, #fff, transparent),
          radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
          radial-gradient(1px 1px at 90px 40px, #fff, transparent),
          radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
          radial-gradient(2px 2px at 160px 30px, #fff, transparent)
        `,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 100px',
        opacity: 0.6,
        animation: 'starTwinkle 4s ease-in-out infinite'
      }} />

      {/* Lottie 胶卷动画 */}
      <div style={{ 
        width: '280px', 
        height: '280px',
        marginBottom: '20px'
      }}>
        {animationData && !loadError ? (
          <Lottie 
            animationData={animationData}
            loop={true}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          // 备用动画 - 简单的CSS动画
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '120px',
            animation: 'filmSpin 3s linear infinite'
          }}>
            🎞️
          </div>
        )}
      </div>
      
      {/* 应用信息 */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <h1 style={{ 
          color: 'white', 
          fontSize: '32px', 
          fontWeight: '700',
          margin: '0 0 12px 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '1px'
        }}>
          地图相册
        </h1>
        
        {/* 进度条 */}
        <div style={{
          width: '200px',
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
          margin: '0 auto 12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {progress < 100 ? `正在加载... ${Math.round(progress)}%` : '准备就绪'}
        </div>
      </div>
    </div>
  );
};

export default LottieFilmLoader;
