package com.photomap.sync;

import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final SyncStoreService syncStoreService;

    public SyncController(SyncStoreService syncStoreService) {
        this.syncStoreService = syncStoreService;
    }

    @PostMapping("/push")
    public SyncDtos.PushResponse push(@RequestBody SyncDtos.PushRequest request) {
        int accepted = syncStoreService.upsert(request.markers);
        return new SyncDtos.PushResponse(true, syncStoreService.currentServerTime(), accepted);
    }

    @GetMapping("/pull")
    public SyncDtos.PullResponse pull(@RequestParam(defaultValue = "0") @Min(0) long since) {
        return new SyncDtos.PullResponse(
                true,
                syncStoreService.currentServerTime(),
                syncStoreService.pullSince(since)
        );
    }
}
