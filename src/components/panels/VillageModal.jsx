import { memo } from 'react';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';

function VillageModal({
  show,
  villageReady,
  villageClosing,
  villageRect,
  hasVillage,
  villageStats,
  villageFeeds,
  pendingFriendId,
  friendSearchQuery,
  filteredVillageMembers,
  friendActionMenu,
  pinnedFriendIds,
  onClose,
  onPendingFriendIdChange,
  onFriendSearchChange,
  onFriendActionToggle,
  onAddFriend,
  onChatFriend,
  onSetPinnedFriendIds,
  onSetHiddenFriendIds,
}) {
  useDialogFocus(show, '.village-modal-shell', onClose);
  if (!show) return null;

  return (
    <div className="village-modal-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="地球村"
        tabIndex={-1}
        className={`village-modal-shell ${villageReady ? 'open' : ''} ${villageClosing ? 'closing' : ''}`}
        onClick={e => e.stopPropagation()}
        style={
          villageRect
            ? {
                '--dx': `${villageRect.dx}px`,
                '--dy': `${villageRect.dy}px`,
                '--start-scale': villageRect.startScale,
              }
            : undefined
        }
      >
        <button
          type="button"
          aria-label="关闭地球村"
          className="village-shell-close"
          onClick={onClose}
        >
          <MapIcon name="close" />
        </button>
        <div className="village-modal-left">
          <div className="village-modal-head">
            <h3>
              地球村{' '}
              <span className="village-title-icon">
                <MapIcon name="globe" />
              </span>
            </h3>
          </div>

          <div className="village-social-hero">
            <div className="hero-main">
              <strong>Village Stream</strong>
              <span>和村友同步你们的世界轨迹</span>
            </div>
            <button type="button" className="hero-post-btn" disabled title="动态发布尚未接入">
              发布动态 · 未接入
            </button>
          </div>

          {!hasVillage ? (
            <div className="village-empty-state">
              <div className="village-empty-badge">地球村</div>
              <h4>还没有连接到村友协作流</h4>
              <p>社群加入与创建功能尚未接入。可以在右侧管理本地好友列表。</p>
              <div className="village-empty-actions">
                <button type="button" className="village-main-btn" disabled>
                  加入地球村
                </button>
                <button type="button" className="village-main-btn ghost" disabled>
                  创建地球村
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="village-stats-grid note-style">
                <div>
                  <strong>{villageStats.markers}</strong>
                  <span>村友新增标记</span>
                </div>
                <div>
                  <strong>{villageStats.photos}</strong>
                  <span>村友新增照片</span>
                </div>
                <div>
                  <strong>{villageStats.countries}</strong>
                  <span>新增国家</span>
                </div>
                <div>
                  <strong>{villageStats.regions}</strong>
                  <span>新增地区</span>
                </div>
              </div>

              <div className="village-feed-card">
                <div className="village-feed-title">村友动态</div>
                <div className="village-feed-list">
                  {villageFeeds.length === 0 ? (
                    <div className="village-feed-empty">暂无其他村友最近更新</div>
                  ) : (
                    villageFeeds.map(feed => (
                      <div className="village-feed-item" key={feed.id}>
                        <div className="village-feed-main">
                          <strong>{feed.actorId}</strong>
                          <span>
                            在 {feed.place} 新增 {feed.markerDelta} 个标记 · {feed.photoDelta}{' '}
                            张照片
                          </span>
                        </div>
                        <small>{feed.time}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="village-modal-right">
          <h4>好友列表</h4>

          <div className="village-friend-tools">
            <div className="village-friend-add">
              <input
                aria-label="好友 ID"
                value={pendingFriendId}
                onChange={e => onPendingFriendIdChange(e.target.value)}
                placeholder="输入好友ID"
              />
              <button type="button" disabled={!pendingFriendId.trim()} onClick={onAddFriend}>
                添加
              </button>
            </div>
            <input
              aria-label="搜索好友"
              className="village-friend-search"
              value={friendSearchQuery}
              onChange={e => onFriendSearchChange(e.target.value)}
              placeholder="搜索好友"
            />
          </div>

          <div className="village-friend-list">
            {filteredVillageMembers.length === 0 ? (
              <div className="village-friend-empty">暂无好友数据</div>
            ) : (
              filteredVillageMembers.map(member => (
                <div className="village-friend-item-wrap" key={`${member.id}-friend`}>
                  <button
                    type="button"
                    aria-expanded={friendActionMenu === member.id}
                    className="village-friend-item"
                    onClick={() => onFriendActionToggle(member.id)}
                  >
                    <div className={`village-avatar small ${member.online ? 'online' : 'offline'}`}>
                      {member.avatar}
                    </div>
                    <div className="village-friend-text">
                      <strong>
                        {member.id}
                        {pinnedFriendIds.includes(member.id) ? ' · 置顶' : ''}
                      </strong>
                      <span>{member.online ? '在线' : member.lastSeen}</span>
                    </div>
                  </button>

                  {friendActionMenu === member.id && (
                    <div className="village-friend-actions">
                      <button onClick={() => onChatFriend(member.id)}>聊天</button>
                      <button
                        onClick={() => {
                          onSetPinnedFriendIds(prev =>
                            prev.includes(member.id)
                              ? prev.filter(i => i !== member.id)
                              : [member.id, ...prev]
                          );
                          onFriendActionToggle('');
                        }}
                      >
                        {pinnedFriendIds.includes(member.id) ? '取消置顶' : '置顶'}
                      </button>
                      <button
                        onClick={() => {
                          onSetHiddenFriendIds(prev => [...new Set([...prev, member.id])]);
                          onFriendActionToggle('');
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(VillageModal);
