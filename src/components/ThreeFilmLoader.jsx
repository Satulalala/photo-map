import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeFilmLoader = ({ progress, stage, onComplete }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const filmStripRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加星空背景
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 100;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // 创建胶片材质
    const filmMaterial = new THREE.MeshPhongMaterial({
      color: 0xc0c0c0,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    });

    // 创建胶片几何体组
    const filmGroup = new THREE.Group();
    filmStripRef.current = filmGroup;
    scene.add(filmGroup);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 动画循环
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // 旋转星空
      stars.rotation.y += 0.001;
      
      // 渲染场景
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 根据进度更新胶片螺旋
  useEffect(() => {
    if (!filmStripRef.current) return;

    // 清除之前的胶片
    while (filmStripRef.current.children.length > 0) {
      filmStripRef.current.remove(filmStripRef.current.children[0]);
    }

    // 创建螺旋胶片
    const segmentCount = Math.floor(progress / 3);
    const radius = 2;
    const height = 4;

    for (let i = 0; i < segmentCount; i++) {
      // 胶片段几何体
      const geometry = new THREE.BoxGeometry(0.8, 0.15, 0.05);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0, 0, 0.7 - i * 0.02),
        shininess: 100,
        transparent: true,
        opacity: 0.9
      });

      const filmSegment = new THREE.Mesh(geometry, material);

      // 螺旋位置计算
      const angle = (i / segmentCount) * Math.PI * 8; // 8圈螺旋
      const spiralRadius = radius * (1 - i / segmentCount * 0.7); // 向中心收缩
      const y = (i / segmentCount - 0.5) * height; // 垂直分布

      filmSegment.position.x = Math.cos(angle) * spiralRadius;
      filmSegment.position.z = Math.sin(angle) * spiralRadius;
      filmSegment.position.y = y;

      // 胶片朝向螺旋中心
      filmSegment.lookAt(0, y, 0);
      
      // 添加旋转动画
      filmSegment.rotation.y = angle;
      filmSegment.rotation.x = Math.sin(angle) * 0.3;

      filmStripRef.current.add(filmSegment);

      // 添加胶片孔洞（小球体）
      const holeGeometry = new THREE.SphereGeometry(0.02, 8, 8);
      const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      
      // 上下各两个孔洞
      for (let j = 0; j < 4; j++) {
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        const holeX = (j % 2) * 0.6 - 0.3;
        const holeY = Math.floor(j / 2) * 0.1 - 0.05;
        hole.position.set(holeX, holeY, 0.026);
        filmSegment.add(hole);
      }
    }

    // 整体旋转动画
    if (stage === 'connecting') {
      const rotateAnimation = () => {
        if (filmStripRef.current) {
          filmStripRef.current.rotation.y += 0.02;
          filmStripRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
        }
        if (stage === 'connecting') {
          requestAnimationFrame(rotateAnimation);
        }
      };
      rotateAnimation();
    }

  }, [progress, stage]);

  // 完成动画
  useEffect(() => {
    if (stage === 'complete') {
      setTimeout(() => {
        onComplete();
      }, 1200);
    }
  }, [stage, onComplete]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 加载信息覆盖层 */}
      <div style={{
        position: 'absolute',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: 'white',
        zIndex: 3001
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '1px'
        }}>
          地图相册
        </div>
        <div style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontWeight: '400',
          letterSpacing: '0.5px'
        }}>
          {stage === 'loading' && `正在加载... ${Math.round(progress)}%`}
          {stage === 'connecting' && '胶片螺旋连接中'}
          {stage === 'complete' && '准备就绪'}
        </div>
      </div>
    </div>
  );
};

export default ThreeFilmLoader;