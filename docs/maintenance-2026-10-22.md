# Maintenance notes — 2026-10-22

## Electron CI packaging

- **Symptom:** The CI run for commit `0a063fcc` failed during the Ubuntu Electron package step. Its log reports that `GH_TOKEN` is missing. The Windows job skipped its Electron packaging step because the matrix uses `windows-2022` while the condition checked `windows-latest`; macOS was cancelled after the Linux failure.
- **Root cause:** The CI workflow invoked `electron-builder` with the configured GitHub publisher enabled, although CI only needs build artifacts. Its Windows matrix condition also did not match the configured runner label.
- **Fix:** Run Electron packaging on all configured matrix platforms with `--publish never`, and remove the separate Vite build step because `npm run electron-build` already runs it.
- **Verification:** Fix commit `79e0bec` passed [GitHub Actions run 39725830767](https://github.com/Satulalala/photo-map/actions/runs/39725830767): tests, type checking, ESLint, and Electron packaging/artifact upload on Windows, Linux, and macOS all succeeded. The logs confirm Windows installer/portable packages and Linux AppImage/deb/rpm packages were generated. A local Windows packaging attempt was blocked by resource download; the remote Windows build succeeded. Existing local `dist/` artifacts were left untouched. This verifies CI packaging, not installation or application runtime on each platform.
- **Resume draft:** Fixed PhotoMap's cross-platform Electron CI by disabling automatic publishing during CI and correcting the Windows matrix condition. Verified tests, type checking, lint, and successful Windows/Linux/macOS package builds and artifact uploads through GitHub Actions.
