import { useState, useMemo, useCallback, useRef } from 'react';
import { formatLastSeen } from '../utils/mapUtils.js';

export function useVillage(markers, user, showToast) {
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [villageReady, setVillageReady] = useState(false);
  const [villageRect, setVillageRect] = useState(null);
  const [villageTransitioning, setVillageTransitioning] = useState(false);
  const [villageClosing, setVillageClosing] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [pendingFriendId, setPendingFriendId] = useState('');
  const [manualFriends, setManualFriends] = useState([]);
  const [hiddenFriendIds, setHiddenFriendIds] = useState([]);
  const [pinnedFriendIds, setPinnedFriendIds] = useState([]);
  const [friendActionMenu, setFriendActionMenu] = useState('');
  const globeVillageBtnRef = useRef(null);

  const villageMembers = useMemo(() => {
    if (!user) return [];

    const byUser = new Map();
    markers.forEach(marker => {
      const ownerId = marker.userId || marker.ownerId || marker.createdBy || marker.username || marker.authorId;
      if (!ownerId || ownerId === user.id || ownerId === user.username || ownerId === user.email || hiddenFriendIds.includes(ownerId)) return;
      const prev = byUser.get(ownerId) || {
        id: ownerId,
        avatar: String(ownerId).slice(0, 1).toUpperCase(),
        online: false,
        lastSeenAt: 0,
        markers: 0,
        photos: 0,
      };
      prev.markers += 1;
      prev.photos += marker.photoCount ?? marker.photos?.length ?? 0;
      prev.lastSeenAt = Math.max(prev.lastSeenAt, marker.updatedAt || marker.createdAt || 0);
      byUser.set(ownerId, prev);
    });

    manualFriends.forEach(fid => {
      if (!fid || hiddenFriendIds.includes(fid)) return;
      if (!byUser.has(fid)) {
        byUser.set(fid, {
          id: fid,
          avatar: String(fid).slice(0, 1).toUpperCase(),
          online: false,
          lastSeenAt: 0,
          markers: 0,
          photos: 0,
        });
      }
    });

    return Array.from(byUser.values())
      .map(m => ({
        ...m,
        online: Date.now() - m.lastSeenAt < 10 * 60 * 1000,
        lastSeen: formatLastSeen(m.lastSeenAt),
      }))
      .sort((a, b) => {
        const ap = pinnedFriendIds.includes(a.id) ? 1 : 0;
        const bp = pinnedFriendIds.includes(b.id) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return b.lastSeenAt - a.lastSeenAt;
      });
  }, [markers, user, manualFriends, hiddenFriendIds, pinnedFriendIds]);

  const hasVillage = villageMembers.length > 0;

  const villageStats = useMemo(() => {
    const countrySet = new Set();
    const provinceSet = new Set();
    let villageMarkers = 0;
    let villagePhotos = 0;

    markers.forEach(m => {
      const ownerId = m.userId || m.ownerId || m.createdBy || m.username || m.authorId;
      if (!ownerId || ownerId === user?.id || ownerId === user?.username || ownerId === user?.email) return;

      villageMarkers += 1;
      villagePhotos += m.photoCount ?? m.photos?.length ?? 0;

      const name = m.name || m.placeName || '';
      if (!name) return;
      const provinces = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];
      const countries = ['美国','日本','韩国','英国','法国','德国','意大利','西班牙','澳大利亚','加拿大','新加坡','泰国','越南','马来西亚','印尼','新西兰','葡萄牙','瑞士','荷兰','巴西','墨西哥','阿联酋','印度','俄罗斯'];
      const p = provinces.find(i => name.includes(i));
      const c = countries.find(i => name.includes(i));
      if (p) provinceSet.add(p);
      if (c) countrySet.add(c);
    });

    return {
      markers: villageMarkers,
      photos: villagePhotos,
      countries: countrySet.size,
      regions: provinceSet.size,
    };
  }, [markers, user]);

  const villageFeeds = useMemo(() => {
    return markers
      .filter(m => {
        const ownerId = m.userId || m.ownerId || m.createdBy || m.username || m.authorId;
        return ownerId && ownerId !== user?.id && ownerId !== user?.username && ownerId !== user?.email;
      })
      .map(m => {
        const ownerId = m.userId || m.ownerId || m.createdBy || m.username || m.authorId;
        return {
          id: m.id,
          actorId: ownerId,
          place: m.name || m.placeName || `${m.lat?.toFixed?.(2) || ''}, ${m.lng?.toFixed?.(2) || ''}`,
          markerDelta: 1,
          photoDelta: m.photoCount ?? m.photos?.length ?? 0,
          time: formatLastSeen(m.updatedAt || m.createdAt || 0),
          at: m.updatedAt || m.createdAt || 0,
        };
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, 10);
  }, [markers, user]);

  const filteredVillageMembers = useMemo(() => {
    const q = friendSearchQuery.trim().toLowerCase();
    if (!q) return villageMembers;
    return villageMembers.filter(m => m.id.toLowerCase().includes(q));
  }, [villageMembers, friendSearchQuery]);

  const handleAddFriend = useCallback(() => {
    const val = pendingFriendId.trim();
    if (!val) return;
    if (manualFriends.includes(val) || villageMembers.some(m => m.id === val)) {
      setPendingFriendId('');
      return;
    }
    setManualFriends(prev => [...prev, val]);
    setPendingFriendId('');
  }, [pendingFriendId, manualFriends, villageMembers]);

  const handleChatFriend = useCallback(friendId => {
    showToast('info', `暂未接入聊天服务：${friendId}`);
  }, [showToast]);

  return {
    showVillageModal, villageReady, villageRect, villageTransitioning, villageClosing,
    friendSearchQuery, pendingFriendId, manualFriends, hiddenFriendIds, pinnedFriendIds,
    friendActionMenu, globeVillageBtnRef,
    villageMembers, hasVillage, villageStats, villageFeeds, filteredVillageMembers,
    setShowVillageModal, setVillageReady, setVillageRect, setVillageTransitioning, setVillageClosing,
    setFriendSearchQuery, setPendingFriendId, setManualFriends, setHiddenFriendIds, setPinnedFriendIds,
    setFriendActionMenu,
    handleAddFriend, handleChatFriend,
  };
}
