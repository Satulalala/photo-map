package com.photomap.sync;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/search")
    public AiDtos.SearchResponse search(@RequestBody AiDtos.SearchRequest request) {
        return aiService.search(request);
    }

    @PostMapping("/ask")
    public AiDtos.AskResponse ask(@RequestBody AiDtos.AskRequest request) {
        return aiService.ask(request);
    }

    @PostMapping("/summarize")
    public AiDtos.SummarizeResponse summarize(@RequestBody AiDtos.SummarizeRequest request) {
        return aiService.summarize(request);
    }
}
