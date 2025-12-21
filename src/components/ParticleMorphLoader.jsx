import { useEffect, useRef, useState } from 'react';

const ParticleMorphLoader = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('earth');
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  // 多种缓动函数库
  const easingFunctions = {
    // 基础缓动
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    // 三次方缓动
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (--t) * t * t + 1,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    
    // 弹性缓动
    easeOutElastic: (t) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    
    // 弹跳缓动
    easeOutBounce: (t) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    
    // 超调缓动
    easeOutBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  };

  // 路径生成函数 - 增强版，更自然的移动
  const pathGenerators = {
    // 直线路径 - 减少抖动范围
    straight: (start, end, t, particle) => {
      const baseX = start.x + (end.x - start.x) * t;
      const baseY = start.y + (end.y - start.y) * t;
      
      // 减少随机抖动范围
      const time = Date.now() * 0.001;
      const noiseX = Math.sin(time + particle.id * 0.1) * 1 * (1 - t);
      const noiseY = Math.cos(time + particle.id * 0.15) * 1 * (1 - t);
      
      return {
        x: baseX + noiseX,
        y: baseY + noiseY
      };
    },
    
    // 弧形路径 - 减少弧度范围
    arc: (start, end, t, particle) => {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      
      // 减少弧高和偏移范围
      const arcHeight = distance * (0.08 + (particle.id % 100) * 0.0005);
      const controlX = midX + (Math.sin(particle.id * 0.1) * 5);
      const controlY = midY - arcHeight;
      
      // 二次贝塞尔曲线
      const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * end.x;
      const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * end.y;
      
      return { x, y };
    },
    
    // 螺旋路径 - 减少螺旋半径
    spiral: (start, end, t, particle) => {
      const spiralTurns = 1.2 + (particle.id % 50) * 0.01; // 1.2-1.7圈
      const angle = t * Math.PI * 2 * spiralTurns;
      const maxRadius = 8 + (particle.id % 20) * 0.3; // 8-14px
      const radius = (1 - t) * maxRadius;
      
      const baseX = start.x + (end.x - start.x) * t;
      const baseY = start.y + (end.y - start.y) * t;
      
      // 减少椭圆变形
      const ellipseA = 1 + (particle.id % 20) * 0.02;
      const ellipseB = 1 + (particle.id % 15) * 0.015;
      
      return {
        x: baseX + Math.cos(angle) * radius * ellipseA,
        y: baseY + Math.sin(angle) * radius * ellipseB
      };
    },
    
    // 波浪路径 - 减少波浪幅度
    wave: (start, end, t, particle) => {
      const baseX = start.x + (end.x - start.x) * t;
      const baseY = start.y + (end.y - start.y) * t;
      
      // 减少波浪幅度
      const waveAmplitude1 = 6 + (particle.id % 20) * 0.15;
      const waveAmplitude2 = 3 + (particle.id % 15) * 0.1;
      const waveFrequency1 = 2.5 + (particle.id % 10) * 0.1;
      const waveFrequency2 = 4 + (particle.id % 8) * 0.15;
      
      // 垂直于移动方向的波浪
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const perpX = -dy / length;
        const perpY = dx / length;
        
        // 主波浪
        const wave1 = Math.sin(t * Math.PI * waveFrequency1) * waveAmplitude1 * (1 - t);
        // 次波浪
        const wave2 = Math.sin(t * Math.PI * waveFrequency2 + particle.id * 0.1) * waveAmplitude2 * (1 - t);
        
        const totalWave = wave1 + wave2 * 0.3;
        
        return {
          x: baseX + perpX * totalWave,
          y: baseY + perpY * totalWave
        };
      }
      
      return { x: baseX, y: baseY };
    },
    
    // 新增：漂浮路径 - 减少漂浮范围
    float: (start, end, t, particle) => {
      const baseX = start.x + (end.x - start.x) * t;
      const baseY = start.y + (end.y - start.y) * t;
      
      // 减少漂浮范围
      const time = Date.now() * 0.001;
      const floatX = Math.sin(time * 0.5 + particle.id * 0.05) * 4 * (1 - t);
      const floatY = Math.cos(time * 0.3 + particle.id * 0.07) * 3 * (1 - t);
      
      // 减少重力效果
      const gravity = t * t * 1.5;
      
      return {
        x: baseX + floatX,
        y: baseY + floatY + gravity
      };
    },
    
    // 新增：磁性路径 - 减少磁场扰动
    magnetic: (start, end, t, particle) => {
      const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      
      // 磁性加速效果
      const magneticT = t < 0.7 ? t * 0.5 : 0.35 + (t - 0.7) * 2.17; // 前70%慢，后30%快
      
      const baseX = start.x + (end.x - start.x) * magneticT;
      const baseY = start.y + (end.y - start.y) * magneticT;
      
      // 减少磁场扰动范围
      const fieldStrength = (1 - t) * distance * 0.01;
      const fieldX = Math.sin(particle.id * 0.1) * fieldStrength;
      const fieldY = Math.cos(particle.id * 0.12) * fieldStrength;
      
      return {
        x: baseX + fieldX,
        y: baseY + fieldY
      };
    }
  };

  // 避免粒子重叠的辅助函数 - 优化版本
  const generateNonOverlappingPoints = (points, minDistance = 2.2) => {
    const result = [];
    const spatialGrid = new Map();
    const gridSize = minDistance * 1.5; // 更小的网格，更精确的检测
    
    // 按距离中心的远近排序，优先放置中心区域的粒子
    const centerX = points.length > 0 ? points.reduce((sum, p) => sum + p.x, 0) / points.length : 0;
    const centerY = points.length > 0 ? points.reduce((sum, p) => sum + p.y, 0) / points.length : 0;
    
    const sortedPoints = points.sort((a, b) => {
      const distA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
      const distB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
      return distA - distB;
    });
    
    for (const point of sortedPoints) {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);
      
      let canPlace = true;
      
      // 检查周围更大范围的网格（3x3 -> 5x5）
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const checkKey = `${gridX + dx},${gridY + dy}`;
          const nearby = spatialGrid.get(checkKey) || [];
          
          for (const existing of nearby) {
            const distance = Math.sqrt(
              (point.x - existing.x) ** 2 + (point.y - existing.y) ** 2
            );
            if (distance < minDistance) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }
        if (!canPlace) break;
      }
      
      if (canPlace) {
        result.push(point);
        const key = `${gridX},${gridY}`;
        if (!spatialGrid.has(key)) {
          spatialGrid.set(key, []);
        }
        spatialGrid.get(key).push(point);
      }
    }
    
    return result;
  };

  // 形状定义 - 超高密度版本，3500+个粒子，完美间隔
  const shapes = {
    // 地球 - 优化版本，减少粒子数量，改善样式
    earth: (centerX, centerY) => {
      const points = [];
      const radius = 160; // 适中的半径
      
      // 减少层数，优化性能
      for (let layer = 0; layer < 12; layer++) {
        const layerRadius = (radius / 12) * (layer + 1);
        const pointsInLayer = Math.floor(15 + layer * 18); // 减少每层粒子数
        
        for (let i = 0; i < pointsInLayer; i++) {
          const angle = (i / pointsInLayer) * Math.PI * 2 + (layer * 0.15); // 增加层间错位
          const r = layerRadius + Math.sin(i * 0.5 + layer) * 3; // 更自然的波动
          points.push({
            x: centerX + Math.cos(angle) * r,
            y: centerY + Math.sin(angle) * r
          });
        }
      }
      
      // 优化中心核心区域 - 创造更好的地球感觉
      for (let ring = 0; ring < 6; ring++) {
        const ringRadius = ring * 4;
        const pointsInRing = Math.max(1, ring * 6);
        
        for (let i = 0; i < pointsInRing; i++) {
          const angle = (i / pointsInRing) * Math.PI * 2 + ring * 0.3;
          points.push({
            x: centerX + Math.cos(angle) * ringRadius,
            y: centerY + Math.sin(angle) * ringRadius
          });
        }
      }
      
      // 添加大陆轮廓效果 - 模拟地球表面
      const continents = [
        // 亚洲大陆
        { centerX: centerX + 30, centerY: centerY - 20, width: 60, height: 40 },
        // 欧洲
        { centerX: centerX - 10, centerY: centerY - 35, width: 35, height: 25 },
        // 非洲
        { centerX: centerX - 15, centerY: centerY + 15, width: 40, height: 50 },
        // 美洲
        { centerX: centerX - 70, centerY: centerY, width: 45, height: 80 },
        // 澳洲
        { centerX: centerX + 60, centerY: centerY + 40, width: 25, height: 20 }
      ];
      
      continents.forEach(continent => {
        const numPoints = Math.floor((continent.width * continent.height) / 80);
        for (let i = 0; i < numPoints; i++) {
          const x = continent.centerX + (Math.random() - 0.5) * continent.width;
          const y = continent.centerY + (Math.random() - 0.5) * continent.height;
          
          // 检查是否在地球范围内
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distFromCenter <= radius - 10) {
            points.push({ x, y });
          }
        }
      });
      
      return generateNonOverlappingPoints(points, 2.5);
    },

    // 相机 - 优化版本，减少粒子数量
    camera: (centerX, centerY) => {
      const points = [];
      
      // 相机主体 - 适中尺寸
      const bodyWidth = 240;
      const bodyHeight = 120;
      
      // 主体轮廓 - 适度密集
      for (let i = 0; i < 180; i++) {
        const t = i / 180;
        let x, y;
        
        if (t < 0.25) { // 上边
          x = -bodyWidth/2 + (t * 4) * bodyWidth;
          y = -bodyHeight/2;
        } else if (t < 0.5) { // 右边
          x = bodyWidth/2;
          y = -bodyHeight/2 + ((t - 0.25) * 4) * bodyHeight;
        } else if (t < 0.75) { // 下边
          x = bodyWidth/2 - ((t - 0.5) * 4) * bodyWidth;
          y = bodyHeight/2;
        } else { // 左边
          x = -bodyWidth/2;
          y = bodyHeight/2 - ((t - 0.75) * 4) * bodyHeight;
        }
        
        points.push({ x: centerX + x, y: centerY + y });
      }
      
      // 主体内部填充 - 适度网格
      for (let x = -bodyWidth/2 + 10; x < bodyWidth/2 - 10; x += 10) {
        for (let y = -bodyHeight/2 + 10; y < bodyHeight/2 - 10; y += 10) {
          const offsetX = x + (Math.random() - 0.5) * 2;
          const offsetY = y + (Math.random() - 0.5) * 2;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }
      
      // 镜头 - 适中圆形
      const lensRadius = 70;
      
      // 镜头多层同心圆 - 减少层数
      for (let layer = 0; layer < 6; layer++) {
        const layerRadius = lensRadius * (layer + 1) / 6;
        const pointsInLayer = Math.floor(10 + layer * 6);
        
        for (let i = 0; i < pointsInLayer; i++) {
          const angle = (i / pointsInLayer) * Math.PI * 2 + (layer * 0.15);
          points.push({
            x: centerX + Math.cos(angle) * layerRadius,
            y: centerY + Math.sin(angle) * layerRadius
          });
        }
      }
      
      // 镜头中心填充
      for (let r = 0; r < 12; r += 4) {
        const pointsInRing = Math.max(1, Math.floor(r * 1.5));
        for (let i = 0; i < pointsInRing; i++) {
          const angle = (i / pointsInRing) * Math.PI * 2;
          points.push({
            x: centerX + Math.cos(angle) * r,
            y: centerY + Math.sin(angle) * r
          });
        }
      }
      
      // 五棱镜 - 适中的顶部突起
      const prismWidth = 100;
      const prismHeight = 50;
      
      // 五棱镜轮廓
      for (let i = 0; i < 70; i++) {
        const t = i / 70;
        let x, y;
        
        if (t < 0.2) {
          x = -prismWidth/2 + t * 5 * 25;
          y = -bodyHeight/2 - prismHeight + t * 5 * 18;
        } else if (t < 0.4) {
          x = -prismWidth/2 + 25 + (t - 0.2) * 5 * (prismWidth - 50);
          y = -bodyHeight/2 - prismHeight + 18;
        } else if (t < 0.6) {
          x = prismWidth/2 - 25 + (t - 0.4) * 5 * 25;
          y = -bodyHeight/2 - prismHeight + 18 - (t - 0.4) * 5 * 18;
        } else if (t < 0.8) {
          x = prismWidth/2;
          y = -bodyHeight/2 - (t - 0.6) * 5 * prismHeight;
        } else {
          x = -prismWidth/2;
          y = -bodyHeight/2 - (1 - t) * 5 * prismHeight;
        }
        
        points.push({ x: centerX + x, y: centerY + y });
      }
      
      // 五棱镜内部填充
      for (let x = -prismWidth/2 + 8; x < prismWidth/2 - 8; x += 8) {
        for (let y = -bodyHeight/2 - prismHeight + 8; y < -bodyHeight/2 - 8; y += 8) {
          const offsetX = x + (Math.random() - 0.5) * 2;
          const offsetY = y + (Math.random() - 0.5) * 2;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }
      
      // 闪光灯
      const flashX = -bodyWidth/2 + 35;
      const flashY = -bodyHeight/2 - 22;
      for (let ring = 0; ring < 3; ring++) {
        const r = 3 + ring * 3;
        const pointsInRing = 6 + ring * 3;
        
        for (let i = 0; i < pointsInRing; i++) {
          const angle = (i / pointsInRing) * Math.PI * 2;
          points.push({
            x: centerX + flashX + Math.cos(angle) * r,
            y: centerY + flashY + Math.sin(angle) * r
          });
        }
      }
      
      // 快门按钮
      const shutterX = bodyWidth/2 - 30;
      const shutterY = -bodyHeight/2 - 25;
      for (let ring = 0; ring < 3; ring++) {
        const r = 3 + ring * 2.5;
        const pointsInRing = 6 + ring * 3;
        
        for (let i = 0; i < pointsInRing; i++) {
          const angle = (i / pointsInRing) * Math.PI * 2;
          points.push({
            x: centerX + shutterX + Math.cos(angle) * r,
            y: centerY + shutterY + Math.sin(angle) * r
          });
        }
      }
      
      // 取景器
      const viewfinderWidth = 40;
      const viewfinderHeight = 18;
      const viewfinderY = -bodyHeight/2 - 10;
      
      for (let x = -viewfinderWidth/2; x <= viewfinderWidth/2; x += 4) {
        for (let y = viewfinderY - viewfinderHeight/2; y <= viewfinderY + viewfinderHeight/2; y += 4) {
          const offsetX = x + (Math.random() - 0.5) * 1.5;
          const offsetY = y + (Math.random() - 0.5) * 1.5;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }

      return generateNonOverlappingPoints(points, 2.5);
    },

    // 相框 - 优化版本，减少粒子数量
    frame: (centerX, centerY) => {
      const points = [];
      const outerWidth = 280;
      const outerHeight = 190;
      const frameThickness = 40;
      const innerWidth = outerWidth - frameThickness * 2;
      const innerHeight = outerHeight - frameThickness * 2;
      
      // 外边框轮廓 - 适度密集
      const outerOutline = 280;
      for (let i = 0; i < outerOutline; i++) {
        const t = i / outerOutline;
        let x, y;
        
        if (t < 0.25) {
          x = -outerWidth/2 + (t * 4) * outerWidth;
          y = -outerHeight/2;
        } else if (t < 0.5) {
          x = outerWidth/2;
          y = -outerHeight/2 + ((t - 0.25) * 4) * outerHeight;
        } else if (t < 0.75) {
          x = outerWidth/2 - ((t - 0.5) * 4) * outerWidth;
          y = outerHeight/2;
        } else {
          x = -outerWidth/2;
          y = outerHeight/2 - ((t - 0.75) * 4) * outerHeight;
        }
        
        points.push({ x: centerX + x, y: centerY + y });
      }
      
      // 内边框轮廓
      const innerOutline = 200;
      for (let i = 0; i < innerOutline; i++) {
        const t = i / innerOutline;
        let x, y;
        
        if (t < 0.25) {
          x = -innerWidth/2 + (t * 4) * innerWidth;
          y = -innerHeight/2;
        } else if (t < 0.5) {
          x = innerWidth/2;
          y = -innerHeight/2 + ((t - 0.25) * 4) * innerHeight;
        } else if (t < 0.75) {
          x = innerWidth/2 - ((t - 0.5) * 4) * innerWidth;
          y = innerHeight/2;
        } else {
          x = -innerWidth/2;
          y = innerHeight/2 - ((t - 0.75) * 4) * innerHeight;
        }
        
        points.push({ x: centerX + x, y: centerY + y });
      }
      
      // 边框网格填充 - 适度密集
      const gridSpacing = 6;
      
      // 上边框
      for (let x = -outerWidth/2; x <= outerWidth/2; x += gridSpacing) {
        for (let y = -outerHeight/2; y <= -innerHeight/2; y += gridSpacing) {
          const offsetX = x + (Math.random() - 0.5) * 2;
          const offsetY = y + (Math.random() - 0.5) * 2;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }
      
      // 下边框
      for (let x = -outerWidth/2; x <= outerWidth/2; x += gridSpacing) {
        for (let y = innerHeight/2; y <= outerHeight/2; y += gridSpacing) {
          const offsetX = x + (Math.random() - 0.5) * 2;
          const offsetY = y + (Math.random() - 0.5) * 2;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }
      
      // 左边框
      for (let x = -outerWidth/2; x <= -innerWidth/2; x += gridSpacing) {
        for (let y = -innerHeight/2; y <= innerHeight/2; y += gridSpacing) {
          const offsetX = x + (Math.random() - 0.5) * 2;
          const offsetY = y + (Math.random() - 0.5) * 2;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }
      
      // 右边框
      for (let x = innerWidth/2; x <= outerWidth/2; x += gridSpacing) {
        for (let y = -innerHeight/2; y <= innerHeight/2; y += gridSpacing) {
          const offsetX = x + (Math.random() - 0.5) * 2;
          const offsetY = y + (Math.random() - 0.5) * 2;
          points.push({ x: centerX + offsetX, y: centerY + offsetY });
        }
      }
      
      // 四角装饰 - 适度精致
      const corners = [
        [-outerWidth/2 + 25, -outerHeight/2 + 25],
        [outerWidth/2 - 25, -outerHeight/2 + 25],
        [outerWidth/2 - 25, outerHeight/2 - 25],
        [-outerWidth/2 + 25, outerHeight/2 - 25]
      ];
      
      corners.forEach(([cx, cy]) => {
        for (let ring = 0; ring < 4; ring++) {
          const r = 2 + ring * 2.5;
          const pointsInRing = 6 + ring * 3;
          
          for (let i = 0; i < pointsInRing; i++) {
            const angle = (i / pointsInRing) * Math.PI * 2;
            points.push({
              x: centerX + cx + Math.cos(angle) * r,
              y: centerY + cy + Math.sin(angle) * r
            });
          }
        }
      });
      
      // 边框中央装饰
      const midDecorations = [
        [0, -outerHeight/2 + 12], // 上中
        [0, outerHeight/2 - 12],  // 下中
        [-outerWidth/2 + 12, 0],  // 左中
        [outerWidth/2 - 12, 0]    // 右中
      ];
      
      midDecorations.forEach(([mx, my]) => {
        for (let ring = 0; ring < 3; ring++) {
          const r = 2 + ring * 2;
          const pointsInRing = 6 + ring * 2;
          
          for (let i = 0; i < pointsInRing; i++) {
            const angle = (i / pointsInRing) * Math.PI * 2;
            points.push({
              x: centerX + mx + Math.cos(angle) * r,
              y: centerY + my + Math.sin(angle) * r
            });
          }
        }
      });

      return generateNonOverlappingPoints(points, 2.5);
    }
  };

  // 初始化粒子系统
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 创建高质量粒子，初始为地球形状
    const earthPoints = shapes.earth(centerX, centerY);
    const particles = earthPoints.map((point, i) => {
      // 为不同粒子分配不同的移动策略 - 增加新策略
      const strategies = ['straight', 'arc', 'wave', 'spiral', 'float', 'magnetic'];
      const easings = ['easeOutCubic', 'easeOutQuad', 'easeOutBack', 'easeOutElastic'];
      
      // 根据位置分配策略，创造更自然的分组效果
      const angle = Math.atan2(point.y - centerY, point.x - centerX);
      const strategyIndex = Math.floor((angle + Math.PI) / (Math.PI * 2) * strategies.length);
      
      return {
        id: i, // 粒子唯一ID
        x: point.x,
        y: point.y,
        startX: point.x,
        startY: point.y,
        targetX: point.x,
        targetY: point.y,
        size: 1.0 + Math.random() * 0.1, // 1.0-1.1px，更一致的大小
        alpha: 0.9 + Math.random() * 0.1, // 更一致的透明度
        vx: 0,
        vy: 0,
        morphProgress: 0,
        morphStartTime: 0,
        morphDuration: 800 + Math.random() * 400, // 800-1200ms 的变形时间，更流畅
        brightness: 0.85 + Math.random() * 0.15, // 更一致的亮度
        pathType: strategies[strategyIndex % strategies.length], // 基于位置的路径类型
        easingType: easings[i % easings.length], // 缓动类型
        delay: (i % 80) * 4, // 更大的分组，更自然的波浪
        phase: Math.random() * Math.PI * 2 // 随机相位，用于动画
      };
    });
    
    particlesRef.current = particles;
    console.log('粒子初始化完成，数量:', particles.length);
  }, []);

  // 变形到新形状 - 平滑过渡
  const morphToShape = (shapeName) => {
    const canvas = canvasRef.current;
    const particles = particlesRef.current;
    if (!canvas || !particles || particles.length === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const targetPoints = shapes[shapeName](centerX, centerY);
    
    console.log(`🔄 变形到${shapeName}，目标点数量:`, targetPoints.length);
    
    // 为每个粒子分配目标点和移动参数
    const currentTime = Date.now();
    
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const targetIndex = i % targetPoints.length;
      const target = targetPoints[targetIndex];
      
      // 记录起始位置
      particle.startX = particle.x;
      particle.startY = particle.y;
      
      // 设置目标位置
      particle.targetX = target.x;
      particle.targetY = target.y;
      
      // 重置变形参数
      particle.morphProgress = 0;
      particle.morphStartTime = currentTime + particle.delay;
    }
    
    console.log(`✅ ${shapeName}变形设置完成`);
  };

  // 渲染循环 - 平滑动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = 0;
    
    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      const particles = particlesRef.current;
      if (!particles || particles.length === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // 清空画布
      ctx.fillStyle = 'rgba(10, 15, 35, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 更新和绘制粒子 - 多算法版本
      const now = Date.now();
      
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // 检查是否开始移动
        if (now >= particle.morphStartTime) {
          // 计算移动进度
          const elapsed = now - particle.morphStartTime;
          const rawProgress = Math.min(elapsed / particle.morphDuration, 1);
          
          // 应用缓动函数
          const easedProgress = easingFunctions[particle.easingType](rawProgress);
          
          // 根据路径类型计算新位置，传递粒子对象
          const start = { x: particle.startX, y: particle.startY };
          const end = { x: particle.targetX, y: particle.targetY };
          const newPos = pathGenerators[particle.pathType](start, end, easedProgress, particle);
          
          particle.x = newPos.x;
          particle.y = newPos.y;
          particle.morphProgress = rawProgress;
        }
        
        // 计算粒子亮度和动态效果
        const dx = particle.targetX - particle.x;
        const dy = particle.targetY - particle.y;
        const velocity = Math.sqrt(dx * dx + dy * dy);
        const movementBrightness = Math.min(1, particle.brightness + velocity * 0.008);
        const progressBrightness = 0.7 + particle.morphProgress * 0.3;
        const dynamicBrightness = Math.max(movementBrightness, progressBrightness);
        
        // 减少呼吸效果和闪烁幅度，保持更一致的视觉效果
        const time = now * 0.001;
        const breathe = 1 + Math.sin(time * 1.5 + particle.phase) * 0.02; // 进一步减少呼吸效果
        const twinkle = 1 + Math.sin(time * 2 + particle.id * 0.05) * 0.015; // 进一步减少闪烁效果
        
        // 动态尺寸和透明度
        const dynamicSize = particle.size * breathe;
        const alpha = particle.alpha * dynamicBrightness * twinkle;
        
        // 保持纯白色粒子，使用动态尺寸
        // 外层光晕 - 更柔和
        ctx.globalAlpha = alpha * 0.25;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, dynamicSize * 2.2, 0, Math.PI * 2);
        ctx.fill();
        
        // 中层光晕
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, dynamicSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // 内层核心
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, dynamicSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 中心亮点 - 更亮
        ctx.globalAlpha = Math.min(1, alpha * 1.2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.2)})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, dynamicSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 重置全局透明度
      ctx.globalAlpha = 1;
      
      animationRef.current = requestAnimationFrame(animate);
    };

    // 启动渲染循环
    console.log('启动渲染循环');
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 完全平滑的进度条 - 消除开头顿顿
  useEffect(() => {
    console.log('开始加载');
    
    const totalDuration = 2750; // 总时长2.75秒
    let startTime = null; // 延迟初始化，使用RAF的timestamp
    let animationId = null;
    
    const updateProgress = (timestamp) => {
      // 第一次调用时初始化开始时间
      if (startTime === null) {
        startTime = timestamp;
      }
      
      const elapsed = timestamp - startTime;
      const rawProgress = Math.min((elapsed / totalDuration) * 100, 100);
      
      // 直接使用原始进度值，确保从真正的0开始
      setProgress(rawProgress);
      
      if (rawProgress < 100) {
        animationId = requestAnimationFrame(updateProgress);
      } else {
        // 加载完成
        setTimeout(() => {
          setStage('zoom');
          if (containerRef.current) {
            containerRef.current.style.transform = 'scale(3)';
            containerRef.current.style.opacity = '0';
            containerRef.current.style.transition = 'all 1s ease-in';
          }
          setTimeout(onComplete, 1000);
        }, 300);
      }
    };
    
    // 使用requestAnimationFrame的timestamp，确保精确计时
    animationId = requestAnimationFrame(updateProgress);
    
    // 清理函数
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [onComplete]);
  
  // 根据进度切换形状 - 使用 useRef 避免闪烁
  const lastStageRef = useRef('earth');
  
  useEffect(() => {
    let newStage = lastStageRef.current;
    
    // 调整切换时机，给相机更多展示时间
    if (progress >= 25 && lastStageRef.current === 'earth') {
      newStage = 'camera';
    } else if (progress >= 75 && lastStageRef.current === 'camera') {
      newStage = 'frame';
    }
    
    // 只有当状态真正改变时才执行切换
    if (newStage !== lastStageRef.current) {
      console.log(`🔄 切换形状: ${lastStageRef.current} → ${newStage}，进度: ${progress}%`);
      lastStageRef.current = newStage;
      setStage(newStage);
      morphToShape(newStage);
    }
  }, [progress]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #0a0f23 0%, #1a1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        overflow: 'hidden'
      }}
    >
      {/* 粒子画布 */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}
      />

      {/* 应用信息 - 移到底部 */}
      <div style={{ 
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center', 
        color: 'white',
        zIndex: 1
      }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: '700', 
          margin: '0 0 24px 0',
          color: 'white',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          地图相册
        </h1>
        
        {/* 进度条 */}
        <div style={{
          width: '280px',
          height: '8px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '4px',
          margin: '0 auto',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            width: `${Math.max(0, Math.min(100, progress))}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
            borderRadius: '4px',
            transition: 'none', // 移除CSS过渡，完全依赖JavaScript
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
          }} />
        </div>
        
        <div style={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.8)',
          marginTop: '16px',
          fontWeight: '600'
        }}>
          {Math.round(Math.max(0, Math.min(100, progress)))}%
        </div>
        
        {/* 加载状态提示 */}
        <div style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.7)',
          marginTop: '12px',
          transition: 'all 0.5s ease',
          minHeight: '20px'
        }}>
          {progress < 18 && '🌍 加载地图库...'}
          {progress >= 18 && progress < 40 && '🗺️ 初始化地图...'}
          {progress >= 40 && progress < 65 && '📍 加载标记数据...'}
          {progress >= 65 && progress < 85 && '📷 准备照片功能...'}
          {progress >= 85 && progress < 100 && '🖼️ 完成初始化...'}
          {progress >= 100 && '✨ 进入地图相册'}
        </div>
      </div>
    </div>
  );
};

export default ParticleMorphLoader;