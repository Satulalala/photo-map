import { useDialogFocus } from '../../hooks/useDialogFocus.js';
export default function PosterPanel({ poster, user, stats }) {
  useDialogFocus(true, '.poster-overlay', poster.closePoster);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="生成海报"
      tabIndex={-1}
      className="poster-overlay"
      onClick={poster.closePoster}
    >
      <div
        className={`poster-page poster-style-${poster.posterStyle}`}
        onClick={e => e.stopPropagation()}
      >
        <aside className="poster-sidebar">
          <h4>海报设置</h4>
          <div className="poster-side-group">
            <span className="poster-option-label">风格</span>
            <div className="poster-pills">
              <button
                className={poster.posterStyle === 'note' ? 'active' : ''}
                onClick={() => poster.setPosterStyle('note')}
              >
                便签
              </button>
              <button
                className={poster.posterStyle === 'film' ? 'active' : ''}
                onClick={() => poster.setPosterStyle('film')}
              >
                胶片
              </button>
              <button
                className={poster.posterStyle === 'postcard' ? 'active' : ''}
                onClick={() => poster.setPosterStyle('postcard')}
              >
                明信片
              </button>
            </div>
          </div>

          <div className="poster-side-group">
            <span className="poster-option-label">尺寸</span>
            <div className="poster-pills">
              <button
                className={poster.posterOrientation === 'portrait' ? 'active' : ''}
                onClick={() => poster.setPosterOrientation('portrait')}
              >
                手机 9:16
              </button>
              <button
                className={poster.posterOrientation === 'landscape' ? 'active' : ''}
                onClick={() => poster.setPosterOrientation('landscape')}
              >
                电脑 16:9
              </button>
            </div>
          </div>

          <div className="poster-side-group">
            <span className="poster-option-label">照片库（最多 5 张）</span>
            <div className="poster-photo-list-panel">
              {poster.bgPhotoOptions.length === 0 && (
                <div className="poster-photo-empty">暂无可选照片</div>
              )}
              {poster.bgPhotoOptions.map(item => (
                <button
                  key={item.id}
                  draggable
                  onDragStart={e => poster.handlePhotoDragStart(e, item.url)}
                  onDragEnd={() => {}}
                  className={`poster-photo-thumb ${poster.selectedPosterPhotos.includes(item.url) || poster.postcardDroppedPhoto === item.url ? 'active' : ''}`}
                  onClick={() => poster.handleTogglePosterPhoto(item.url)}
                  title={item.label}
                >
                  <img src={item.url} alt={item.label} />
                </button>
              ))}
            </div>
            <small>便签/胶片：点击添加到相框；明信片：拖拽到海报中心</small>
            {poster.posterStyle === 'postcard' && poster.postcardDroppedPhoto && (
              <button
                className="poster-link-btn"
                onClick={() => poster.setPostcardDroppedPhoto('')}
              >
                清除明信片主图
              </button>
            )}
          </div>

          <div className="poster-side-actions">
            <button className="poster-action primary" onClick={poster.handleSavePoster}>
              保存海报(PNG)
            </button>
            <button className="poster-action" onClick={() => poster.setShowPoster(false)}>
              关闭
            </button>
          </div>
        </aside>

        <main className="poster-canvas-wrap">
          <div
            className={`poster-preview ${poster.posterTemplate.bgClass} ${poster.posterSizeClass}`}
          >
            {poster.posterStyle === 'postcard' ? (
              <div
                className={`postcard-dropzone ${poster.isPostcardDragOver ? 'drag-over' : ''}`}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  poster.setIsPostcardDragOver(true);
                }}
                onDragLeave={() => poster.setIsPostcardDragOver(false)}
                onDrop={poster.handlePostcardDrop}
              >
                {poster.postcardDroppedPhoto ? (
                  <img
                    src={poster.postcardDroppedPhoto}
                    alt="postcard"
                    className="postcard-main-photo"
                  />
                ) : (
                  <div className="postcard-drop-hint">拖拽一张照片到这里</div>
                )}
              </div>
            ) : (
              <div className="poster-frames-layer">
                {poster.posterTemplate.slots.map((slot, idx) => {
                  const photo = poster.selectedPosterPhotos[idx];
                  return (
                    <div
                      key={idx}
                      className={`poster-frame-slot ${poster.dragOverFrameIndex === idx ? 'drag-over' : ''}`}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        poster.setDragOverFrameIndex(idx);
                      }}
                      onDragLeave={() => poster.setDragOverFrameIndex(-1)}
                      onDrop={e => poster.handleFrameDrop(e, idx)}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.w}%`,
                        height: `${slot.h}%`,
                        transform: `rotate(${slot.r}deg)`,
                      }}
                    >
                      {photo ? (
                        <img src={photo} alt="poster" />
                      ) : (
                        <div className="poster-frame-placeholder">+</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="poster-mask">
              <h2>{user?.username || user?.email || '我的'} · 全球足迹海报</h2>
              <div className="poster-stats-row-top">
                <span>省份覆盖 {stats.homelandCoverage}%</span>
                <span>照片记录 {stats.totalPhotos} 张</span>
                <span>到访国家 {stats.visitedCountryCount}</span>
              </div>
              <div className="poster-stats-grid">
                <div>
                  <strong>{stats.totalMarkers}</strong>
                  <span>标记点</span>
                </div>
                <div>
                  <strong>{stats.totalPhotos}</strong>
                  <span>照片</span>
                </div>
                <div>
                  <strong>{stats.visitedCount}</strong>
                  <span>到访省份</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
