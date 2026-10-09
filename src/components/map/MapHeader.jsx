import SearchBar from './SearchBar.jsx';
import MapIcon from './MapIcon.jsx';
import WebDownloadButton from '../WebDownloadButton.jsx';

export default function MapHeader({
  searchProps,
  villageButtonRef,
  showVillage,
  isOnline,
  onOpenVillage,
  isWeb,
  isLoggedIn,
}) {
  return (
    <header className="map-header" aria-label="地图搜索" data-ui="map-header">
      <div className="search-bar-container">
        <button
          type="button"
          ref={villageButtonRef}
          aria-label="打开地球村"
          aria-expanded={showVillage}
          disabled={!isOnline}
          className={`globe-village-btn ${showVillage ? 'active origin-hidden' : ''}`}
          onClick={onOpenVillage}
          title={isOnline ? '地球村' : '地球村（离线不可用）'}
          data-action="village"
        >
          <MapIcon name="globe" />
        </button>
        <SearchBar {...searchProps} />
        {isWeb && isLoggedIn && (
          <div className="web-download-beside-search">
            <WebDownloadButton />
          </div>
        )}
      </div>
    </header>
  );
}
