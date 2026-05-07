package com.photomap.sync;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiService {

    private final SyncStoreService syncStoreService;

    public AiService(SyncStoreService syncStoreService) {
        this.syncStoreService = syncStoreService;
    }

    public AiDtos.SearchResponse search(AiDtos.SearchRequest request) {
        String query = request.query == null ? "" : request.query.trim().toLowerCase();
        int topK = request.topK == null ? 8 : Math.max(1, Math.min(30, request.topK));

        List<AiDtos.SearchHit> hits = syncStoreService.listAll().stream()
                .map(marker -> toHit(marker, query))
                .filter(hit -> hit.score > 0)
                .sorted(Comparator.comparingInt((AiDtos.SearchHit h) -> h.score).reversed())
                .limit(topK)
                .collect(Collectors.toList());

        return new AiDtos.SearchResponse(true, request.query, hits);
    }

    public AiDtos.AskResponse ask(AiDtos.AskRequest request) {
        AiDtos.SearchRequest searchRequest = new AiDtos.SearchRequest();
        searchRequest.query = request.question;
        searchRequest.topK = request.topK == null ? 6 : request.topK;
        List<AiDtos.SearchHit> refs = search(searchRequest).hits;

        String answer;
        if (refs.isEmpty()) {
            answer = "当前还没有足够的匹配数据。你可以继续添加标记与照片备注后再试一次。";
        } else {
            String topPlaces = refs.stream()
                    .limit(3)
                    .map(h -> h.name == null || h.name.isBlank() ? "未命名地点" : h.name)
                    .collect(Collectors.joining("、"));
            int total = refs.size();
            answer = "根据你当前数据，最相关的位置是：" + topPlaces + "。"
                    + "共检索到 " + total + " 个相关地点，建议先查看这些地点的照片与备注。";
        }

        return new AiDtos.AskResponse(true, request.question, answer, refs);
    }

    public AiDtos.SummarizeResponse summarize(AiDtos.SummarizeRequest request) {
        List<SyncDtos.SyncMarker> markers = syncStoreService.listAll();
        long now = System.currentTimeMillis();

        if ("recent".equalsIgnoreCase(request.scope)) {
            int days = request.days == null ? 30 : Math.max(1, request.days);
            long threshold = now - days * 24L * 60L * 60L * 1000L;
            markers = markers.stream()
                    .filter(m -> (m.updatedAt != null ? m.updatedAt : 0L) >= threshold)
                    .collect(Collectors.toList());
        }

        int markerCount = markers.size();
        int photoCount = markers.stream()
                .mapToInt(m -> m.photoCount != null ? m.photoCount : (m.photos == null ? 0 : m.photos.size()))
                .sum();

        Set<String> placeNames = markers.stream()
                .map(m -> m.name == null ? "" : m.name.trim())
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());

        AiDtos.SummaryStats stats = new AiDtos.SummaryStats();
        stats.markerCount = markerCount;
        stats.photoCount = photoCount;
        stats.placeNameCount = placeNames.size();

        String summary = "你当前共记录 " + markerCount + " 个地点、" + photoCount + " 张照片，"
                + "覆盖 " + stats.placeNameCount + " 个命名地点。"
                + (markerCount == 0 ? "先去地图里添加一些回忆吧。" : "建议优先回顾照片数较多的地点，方便生成更完整的旅行故事。");

        return new AiDtos.SummarizeResponse(true, summary, stats);
    }

    private AiDtos.SearchHit toHit(SyncDtos.SyncMarker marker, String query) {
        AiDtos.SearchHit hit = new AiDtos.SearchHit();
        hit.markerId = marker.id;
        hit.name = marker.name;
        hit.lat = marker.lat;
        hit.lng = marker.lng;

        int score = 0;
        StringBuilder preview = new StringBuilder();

        String name = marker.name == null ? "" : marker.name.toLowerCase();
        if (!query.isBlank() && name.contains(query)) {
            score += 70;
            preview.append("地点名匹配; ");
        }

        int noteHits = 0;
        if (marker.photos != null) {
            for (SyncDtos.SyncPhoto photo : marker.photos) {
                String note = photo.note == null ? "" : photo.note.toLowerCase();
                if (!query.isBlank() && note.contains(query)) {
                    noteHits++;
                    score += 20;
                }
            }
        }

        if (marker.photoCount != null) {
            score += Math.min(10, marker.photoCount);
        }

        if (noteHits > 0) {
            preview.append("备注命中 ").append(noteHits).append(" 次; ");
        }

        if (query.isBlank()) {
            score = Math.max(score, 1);
        }

        hit.score = score;
        hit.preview = preview.length() == 0 ? "基础相关" : preview.toString();
        return hit;
    }
}
