# Maintenance notes — 2026-10-22

## Electron CI packaging

- **Symptom:** The CI run for commit `0a063fcc` failed during the Ubuntu Electron package step. Its log reports that `GH_TOKEN` is missing. The Windows job skipped its Electron packaging step because the matrix uses `windows-2022` while the condition checked `windows-latest`; macOS was cancelled after the Linux failure.
- **Root cause:** The CI workflow invoked `electron-builder` with the configured GitHub publisher enabled, although CI only needs build artifacts. Its Windows matrix condition also did not match the configured runner label.
- **Fix:** Run Electron packaging on all configured matrix platforms with `--publish never`, and remove the separate Vite build step because `npm run electron-build` already runs it.
- **Verification:** Confirmed against GitHub Actions run `39530486287` and Ubuntu job `118995363041`; `git diff --check` passed. The local Vite build passed. A Windows Electron package retry downloaded Electron but stalled during a GitHub resource download, so it was stopped before producing an installer. Existing `dist/` artifacts were left untouched. The updated workflow has not yet run in GitHub Actions.
- **Resume draft:** Updated PhotoMap's cross-platform Electron CI to disable automatic publishing for CI packages and correct the Windows matrix condition. Local Windows packaging remains unverified because resource download stalled; remote Actions validation is pending.
