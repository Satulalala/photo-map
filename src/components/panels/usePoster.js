/**
 * 海报生成逻辑（从 LifePanel 提取）
 */
import { useMemo, useState, useCallback } from 'react';

const POSTER_TEMPLATES = {
  film: {
    bgClass: 'poster-template-film',
    slots: [
      { x: 8, y: 8, w: 22, h: 26, r: -6 },
      { x: 36, y: 12, w: 20, h: 24, r: 4 },
      { x: 65, y: 10, w: 25, h: 22, r: -4 },
      { x: 12, y: 56, w: 24, h: 26, r: 3 },
      { x: 62, y: 58, w: 24, h: 25, r: -3 },
    ],
  },
  postcard: {
    bgClass: 'poster-template-postcard',
    slots: [],
  },
  note: {
    bgClass: 'poster-template-note',
    slots: [
      { x: 9, y: 12, w: 24, h: 22, r: -4 },
      { x: 67, y: 10, w: 22, h: 20, r: 5 },
      { x: 38, y: 8, w: 22, h: 20, r: 1 },
      { x: 12, y: 66, w: 24, h: 20, r: -2 },
      { x: 64, y: 64, w: 24, h: 22, r: 3 },
    ],
  },
};

const POSTER_BACKGROUNDS = {
  note: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#fff9dd');
    g.addColorStop(0.6, '#f7df9a');
    g.addColorStop(1, '#efc16c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
  film: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#161616');
    g.addColorStop(0.5, '#2b2b2b');
    g.addColorStop(1, '#4e4e4e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
  postcard: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#7ec2ff');
    g.addColorStop(0.52, '#dff3ff');
    g.addColorStop(1, '#f6d8b2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
};

export default function usePoster({ markers, user, stats }) {
  const [showPoster, setShowPoster] = useState(false);
  const [posterStyle, setPosterStyle] = useState('note');
  const [posterOrientation, setPosterOrientation] = useState('portrait');
  const [selectedPosterPhotos, setSelectedPosterPhotos] = useState([]);
  const [postcardDroppedPhoto, setPostcardDroppedPhoto] = useState('');
  const [isPostcardDragOver, setIsPostcardDragOver] = useState(false);
  const [draggingPhotoUrl, setDraggingPhotoUrl] = useState('');
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState(-1);

  const bgPhotoOptions = useMemo(() => {
    const list = [];
    markers.forEach((m, idx) => {
      const url = m.firstPhoto?.data || m.firstPhoto?.url || m.photos?.[0]?.data || m.photos?.[0]?.url;
      if (url) {
        list.push({ id: m.id || `m-${idx}`, label: m.name || `地点 ${idx + 1}`, url });
      }
    });
    return list.slice(0, 60);
  }, [markers]);

  const posterTemplate = useMemo(() => POSTER_TEMPLATES[posterStyle] || POSTER_TEMPLATES.note, [posterStyle]);
  const posterSizeClass = posterOrientation === 'landscape' ? 'poster-landscape' : 'poster-portrait';

  const handlePhotoDragStart = useCallback((e, url) => {
    e.dataTransfer.setData('text/plain', url);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingPhotoUrl(url);
  }, []);

  const handlePostcardDrop = useCallback(e => {
    e.preventDefault();
    const url = e.dataTransfer.getData('text/plain') || draggingPhotoUrl;
    if (url) setPostcardDroppedPhoto(url);
    setIsPostcardDragOver(false);
    setDraggingPhotoUrl('');
  }, [draggingPhotoUrl]);

  const handleTogglePosterPhoto = useCallback(url => {
    setSelectedPosterPhotos(prev => {
      if (prev.includes(url)) return prev.filter(i => i !== url);
      if (prev.length >= 5) return prev;
      return [...prev, url];
    });
  }, []);

  const handleFrameDrop = useCallback((e, idx) => {
    e.preventDefault();
    const url = e.dataTransfer.getData('text/plain') || draggingPhotoUrl;
    if (!url) return;
    setSelectedPosterPhotos(prev => {
      const next = [...prev];
      next[idx] = url;
      return next.slice(0, 5);
    });
    setDragOverFrameIndex(-1);
    setDraggingPhotoUrl('');
  }, [draggingPhotoUrl]);

  const handleSavePoster = useCallback(async () => {
    const width = posterOrientation === 'landscape' ? 1920 : 1080;
    const height = posterOrientation === 'landscape' ? 1080 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImage = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    POSTER_BACKGROUNDS[posterStyle]?.(ctx, width, height);

    const drawFramePhoto = async (slot, url) => {
      const x = (slot.x / 100) * width;
      const y = (slot.y / 100) * height;
      const w = (slot.w / 100) * width;
      const h = (slot.h / 100) * height;

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((slot.r * Math.PI) / 180);

      ctx.fillStyle = '#fff';
      ctx.fillRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16);

      if (url) {
        try {
          const img = await loadImage(url);
          const ratio = Math.min(w / img.width, h / img.height);
          const dw = img.width * ratio;
          const dh = img.height * ratio;
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        } catch {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(-w / 2, -h / 2, w, h);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    };

    if (posterStyle === 'postcard') {
      if (postcardDroppedPhoto) {
        try {
          const img = await loadImage(postcardDroppedPhoto);
          const pad = width * 0.08;
          const areaX = pad;
          const areaY = height * 0.08;
          const areaW = width - pad * 2;
          const areaH = height * 0.7;
          const ratio = Math.min(areaW / img.width, areaH / img.height);
          const dw = img.width * ratio;
          const dh = img.height * ratio;
          const dx = areaX + (areaW - dw) / 2;
          const dy = areaY + (areaH - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
        } catch {}
      }
    } else {
      for (let i = 0; i < posterTemplate.slots.length; i += 1) {
        await drawFramePhoto(posterTemplate.slots[i], selectedPosterPhotos[i]);
      }
    }

    const overlay = ctx.createLinearGradient(0, height * 0.45, 0, height);
    overlay.addColorStop(0, 'rgba(17,10,0,0.08)');
    overlay.addColorStop(1, 'rgba(17,10,0,0.55)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(width * 0.038)}px "Microsoft YaHei"`;
    ctx.fillText(`${user?.username || user?.email || '我的'} · 全球足迹海报`, width * 0.05, height * 0.84);

    const chips = [`国土覆盖 ${stats.homelandCoverage}%`, `全球覆盖 ${stats.globalCoverage}%`, `到访国家 ${stats.visitedCountryCount}`];
    ctx.font = `600 ${Math.round(width * 0.015)}px "Microsoft YaHei"`;
    let chipX = width * 0.05;
    const chipY = height * 0.88;
    chips.forEach(chip => {
      const textW = ctx.measureText(chip).width;
      const chipW = textW + 28;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(chipX, chipY, chipW, 36);
      ctx.fillStyle = '#fff';
      ctx.fillText(chip, chipX + 14, chipY + 24);
      chipX += chipW + 12;
    });

    const statsData = [
      { v: stats.totalMarkers, l: '标记点' },
      { v: stats.totalPhotos, l: '照片' },
      { v: stats.visitedCount, l: '到访省份' },
    ];
    const cardW = width * 0.26;
    const cardH = 90;
    const gap = width * 0.03;
    const startX = width * 0.05;
    const y = height - cardH - 16;
    statsData.forEach((item, idx) => {
      const x = startX + idx * (cardW + gap);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(width * 0.03)}px "Microsoft YaHei"`;
      ctx.fillText(String(item.v), x + 18, y + 38);
      ctx.font = `500 ${Math.round(width * 0.015)}px "Microsoft YaHei"`;
      ctx.fillText(item.l, x + 18, y + 70);
    });

    try {
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `travel-poster-${Date.now()}.png`;
      a.click();
    } catch {
      alert('保存失败，请重试（可能是跨域图片导致）');
    }
  }, [posterOrientation, posterStyle, postcardDroppedPhoto, posterTemplate, selectedPosterPhotos, user, stats]);

  const closePoster = useCallback(() => {
    setShowPoster(false);
    setSelectedPosterPhotos([]);
    setPostcardDroppedPhoto('');
    setIsPostcardDragOver(false);
    setDragOverFrameIndex(-1);
    setDraggingPhotoUrl('');
  }, []);

  return {
    showPoster, setShowPoster,
    posterStyle, setPosterStyle,
    posterOrientation, setPosterOrientation,
    selectedPosterPhotos,
    postcardDroppedPhoto, setPostcardDroppedPhoto,
    isPostcardDragOver, setIsPostcardDragOver,
    draggingPhotoUrl,
    dragOverFrameIndex, setDragOverFrameIndex,
    bgPhotoOptions,
    posterTemplate, posterSizeClass,
    handlePhotoDragStart,
    handlePostcardDrop,
    handleTogglePosterPhoto,
    handleFrameDrop,
    handleSavePoster,
    closePoster,
  };
}
