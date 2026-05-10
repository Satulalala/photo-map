import { memo } from 'react';

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
  if (!show) return null;

  return (
    <div className="village-modal-overlay" onClick={onClose}>
      <div
        className={`village-modal-shell ${villageReady ? 'open' : ''} ${villageClosing ? 'closing' : ''}`}
        onClick={e => e.stopPropagation()}
        style={villageRect ? {
          '--dx': `${villageRect.dx}px`,
          '--dy': `${villageRect.dy}px`,
          '--start-scale': villageRect.startScale,
        } : undefined}
      >
        <button className="village-shell-close" onClick={onClose}>✕</button>
        <div className="village-modal-left">
          <div className="village-modal-head">
            <h3>地球村 <span className="village-title-icon">🌍</span></h3>
          </div>

          <div className="village-social-hero">
            <div className="hero-main">
              <strong>Village Stream</strong>
              <span>和村友同步你们的世界轨迹</span>
            </div>
            <button className="hero-post-btn">发布动态</button>
          </div>

          {!hasVillage ? (
            <div className="village-empty-state">
              <div className="village-empty-badge">🌌 地球村邀请中</div>
              <h4>还没有连接到村友协作流</h4>
              <p>加入一个已有地球村，或创建你自己的宇宙社群空间。</p>
              <div className="village-empty-actions">
                <button className="village-main-btn">✨ 加入地球村</button>
                <button className="village-main-btn ghost">🚀 创建地球村</button>
              </div>
            </div>
          ) : (
            <>
              <div className="village-stats-grid note-style">
                <div><strong>{villageStats.markers}</strong><span>村友新增标记</span></div>
                <div><strong>{villageStats.photos}</strong><span>村友新增照片</span></div>
                <div><strong>{villageStats.countries}</strong><span>新增国家</span></div>
                <div><strong>{villageStats.regions}</strong><span>新增地区</span></div>
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
                          <span>在 {feed.place} 新增 {feed.markerDelta} 个标记 · {feed.photoDelta} 张照片</span>
                        </div>
                        <small>{feed.time}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button className="village-main-btn">进入地球村</button>
            </>
          )}
        </div>

        <div className="village-modal-right">
          <h4>好友列表</h4>

          <div className="village-friend-tools">
            <div className="village-friend-add">
              <input
                value={pendingFriendId}
                onChange={e => onPendingFriendIdChange(e.target.value)}
                placeholder="输入好友ID"
              />
              <button onClick={onAddFriend}>添加</button>
            </div>
            <input
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
                  <div className="village-friend-item" onClick={() => onFriendActionToggle(member.id)}>
                    <div className={`village-avatar small ${member.online ? 'online' : 'offline'}`}>{member.avatar}</div>
                    <div className="village-friend-text">
                      <strong>{member.id}{pinnedFriendIds.includes(member.id) ? ' · 置顶' : ''}</strong>
                      <span>{member.online ? '在线' : member.lastSeen}</span>
                    </div>
                  </div>

                  {friendActionMenu === member.id && (
                    <div className="village-friend-actions">
                      <button onClick={() => onChatFriend(member.id)}>聊天</button>
                      <button onClick={() => {
                        onSetPinnedFriendIds(prev => prev.includes(member.id) ? prev.filter(i => i !== member.id) : [member.id, ...prev]);
                        onFriendActionToggle('');
                      }}>{pinnedFriendIds.includes(member.id) ? '取消置顶' : '置顶'}</button>
                      <button onClick={() => {
                        onSetHiddenFriendIds(prev => [...new Set([...prev, member.id])]);
                        onFriendActionToggle('');
                      }}>删除</button>
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
