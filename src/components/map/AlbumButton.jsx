import MapIcon from './MapIcon.jsx';

export default function AlbumButton({
  buttonRef,
  show,
  reveal,
  onClick,
  totalPhotos,
  totalPlaces,
  showLife,
  onOpenLife,
}) {
  return (
    <div className="map-bottom-actions" role="group" aria-label="相册与生活">
      <button
        type="button"
        className="life-entry-btn"
        data-action="life"
        aria-label="打开生活面板"
        aria-pressed={showLife}
        title="生活足迹"
        onClick={onOpenLife}
      >
        <MapIcon name="life" />
        <span>生活</span>
      </button>
      <button
        type="button"
        ref={buttonRef}
        aria-label={`打开我的相册，${totalPhotos} 张照片，${totalPlaces} 个地点`}
        aria-expanded={show}
        onClick={onClick}
        title="打开我的相册"
        data-action="album"
        className={`marker-count-btn ${show ? 'active origin-hidden' : ''} ${reveal ? 'reveal-on-close' : ''}`}
      >
        <span className="album-button-icon">
          <MapIcon name="photo" />
        </span>
        <span className="album-button-content">
          <span className="album-button-title">我的相册</span>
          <span className="marker-stats">
            <span className="stat-item">
              <span className="stat-num">{totalPhotos}</span> 张照片
            </span>
            <span className="stat-item">
              <span className="stat-num">{totalPlaces}</span> 个地点
            </span>
          </span>
        </span>
        <MapIcon name="arrow" />
      </button>
    </div>
  );
}
