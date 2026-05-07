package com.photomap.sync;

import java.util.ArrayList;
import java.util.List;

public class AiDtos {

    public static class SearchRequest {
        public String query;
        public Integer topK = 8;
    }

    public static class SearchHit {
        public String markerId;
        public String name;
        public Double lat;
        public Double lng;
        public String preview;
        public int score;
    }

    public static class SearchResponse {
        public boolean ok;
        public String query;
        public List<SearchHit> hits = new ArrayList<>();

        public SearchResponse(boolean ok, String query, List<SearchHit> hits) {
            this.ok = ok;
            this.query = query;
            this.hits = hits;
        }
    }

    public static class AskRequest {
        public String question;
        public Integer topK = 6;
    }

    public static class AskResponse {
        public boolean ok;
        public String question;
        public String answer;
        public List<SearchHit> references = new ArrayList<>();

        public AskResponse(boolean ok, String question, String answer, List<SearchHit> references) {
            this.ok = ok;
            this.question = question;
            this.answer = answer;
            this.references = references;
        }
    }

    public static class SummarizeRequest {
        public String scope; // all | recent
        public Integer days = 30;
    }

    public static class SummaryStats {
        public int markerCount;
        public int photoCount;
        public int placeNameCount;
    }

    public static class SummarizeResponse {
        public boolean ok;
        public String summary;
        public SummaryStats stats;

        public SummarizeResponse(boolean ok, String summary, SummaryStats stats) {
            this.ok = ok;
            this.summary = summary;
            this.stats = stats;
        }
    }
}
