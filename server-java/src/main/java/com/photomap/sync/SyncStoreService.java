package com.photomap.sync;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SyncStoreService {

    private final Map<String, SyncDtos.SyncMarker> markerStore = new ConcurrentHashMap<>();
    private volatile long lastUpdatedAt = 0L;

    public int upsert(List<SyncDtos.SyncMarker> markers) {
        int accepted = 0;
        if (markers == null) return accepted;

        for (SyncDtos.SyncMarker incoming : markers) {
            if (incoming == null || incoming.id == null || incoming.id.isBlank()) {
                continue;
            }
            SyncDtos.SyncMarker existing = markerStore.get(incoming.id);
            long incomingTime = incoming.updatedAt != null ? incoming.updatedAt : System.currentTimeMillis();
            long existingTime = existing != null && existing.updatedAt != null ? existing.updatedAt : 0L;

            if (existing == null || incomingTime >= existingTime) {
                if (incoming.updatedAt == null) incoming.updatedAt = incomingTime;
                if (incoming.createdAt == null) incoming.createdAt = incoming.updatedAt;
                markerStore.put(incoming.id, incoming);
                accepted++;
                lastUpdatedAt = Math.max(lastUpdatedAt, incoming.updatedAt);
            }
        }

        return accepted;
    }

    public List<SyncDtos.SyncMarker> pullSince(long since) {
        List<SyncDtos.SyncMarker> result = new ArrayList<>();
        for (SyncDtos.SyncMarker marker : markerStore.values()) {
            long t = marker.updatedAt != null ? marker.updatedAt : 0L;
            if (t > since) {
                result.add(marker);
            }
        }
        return result;
    }

    public long currentServerTime() {
        return Math.max(System.currentTimeMillis(), lastUpdatedAt);
    }

    public List<SyncDtos.SyncMarker> listAll() {
        return new ArrayList<>(markerStore.values());
    }
}
