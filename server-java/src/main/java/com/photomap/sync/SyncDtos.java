package com.photomap.sync;

import java.util.ArrayList;
import java.util.List;

public class SyncDtos {

    public static class SyncMarker {
        public String id;
        public Double lat;
        public Double lng;
        public String name;
        public Long createdAt;
        public Long updatedAt;
        public Integer photoCount;
        public List<SyncPhoto> photos = new ArrayList<>();
    }

    public static class SyncPhoto {
        public String id;
        public String note;
        public Long createdAt;
    }

    public static class PushRequest {
        public String deviceId;
        public Long happenedAt;
        public List<SyncMarker> markers = new ArrayList<>();
    }

    public static class PushResponse {
        public boolean ok;
        public long serverTime;
        public int accepted;

        public PushResponse(boolean ok, long serverTime, int accepted) {
            this.ok = ok;
            this.serverTime = serverTime;
            this.accepted = accepted;
        }
    }

    public static class PullResponse {
        public boolean ok;
        public long serverTime;
        public List<SyncMarker> markers;

        public PullResponse(boolean ok, long serverTime, List<SyncMarker> markers) {
            this.ok = ok;
            this.serverTime = serverTime;
            this.markers = markers;
        }
    }
}
