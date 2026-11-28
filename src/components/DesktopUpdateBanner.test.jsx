import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DesktopUpdateBanner from './DesktopUpdateBanner.jsx';
import SettingsContent from './panels/SettingsContent.jsx';

function makeUpdater(stateOverrides = {}, fnOverrides = {}) {
  return {
    isDesktop: true,
    bannerVisible: true,
    state: {
      status: 'available',
      currentVersion: '1.3.1',
      version: '1.3.2',
      releaseNotes: '优化桌面更新与登录体验',
      percent: 0,
      bytesPerSecond: 0,
      message: '',
      ...stateOverrides,
    },
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    dismissBanner: vi.fn(),
    ...fnOverrides,
  };
}

describe('DesktopUpdateBanner', () => {
  it('renders available update, triggers download, and allows dismissing', () => {
    const updater = makeUpdater();
    render(<DesktopUpdateBanner updater={updater} />);

    expect(screen.getByText('发现新版本 v1.3.2')).toBeInTheDocument();
    expect(screen.getByText('优化桌面更新与登录体验')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '立即更新' }));
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '稍后' }));
    expect(updater.dismissBanner).toHaveBeenCalledTimes(1);
  });

  it('renders downloading progress bar and downloaded restart button', () => {
    const { rerender } = render(
      <DesktopUpdateBanner updater={makeUpdater({ status: 'downloading', percent: 64, bytesPerSecond: 2 * 1024 * 1024 })} />
    );

    expect(screen.getByText('正在下载 v1.3.2')).toBeInTheDocument();
    expect(screen.getByText('64% · 2.0 MB/s')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '64');

    const installedUpdater = makeUpdater({ status: 'downloaded', percent: 100 });
    rerender(<DesktopUpdateBanner updater={installedUpdater} />);

    expect(screen.getByText('v1.3.2 已下载完成')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '立即重启安装' }));
    expect(installedUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

});

describe('SettingsContent about tab software update section', () => {
  it('shows desktop current version and check/download controls', () => {
    const updater = makeUpdater({ status: 'idle', version: '' });
    const baseSettings = { antialias: true, dragRotate: false, renderWorldCopies: false, minZoom: 1, maxZoom: 18 };
    const { rerender } = render(
      <SettingsContent
        settingsTab="about"
        user={null}
        mapSettings={baseSettings}
        tempSettings={baseSettings}
        cacheStats={{ tiles: 0 }}
        markersCount={0}
        totalPhotos={0}
        isOnline
        syncConflictCount={0}
        cloudSyncEnabled={false}
        guestImportDone
        syncingNow={false}
        syncApiBase=""
        updater={updater}
        onLogout={vi.fn()}
        onOpenLogin={vi.fn()}
        onTempSettingsChange={vi.fn()}
        onSaveSettings={vi.fn()}
        onCloseSettings={vi.fn()}
        onCloudSyncChange={vi.fn()}
        onSyncApiBaseChange={vi.fn()}
        onRunCloudSync={vi.fn()}
        onImportGuestData={vi.fn()}
        onClearTileCache={vi.fn()}
      />
    );

    expect(screen.getByText('v1.3.1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '检查更新' }));
    expect(updater.checkForUpdates).toHaveBeenCalledWith({ silent: false });

    const downloadedUpdater = makeUpdater({ status: 'downloaded', version: '1.3.2', percent: 100 });
    rerender(
      <SettingsContent
        settingsTab="about"
        user={null}
        mapSettings={baseSettings}
        tempSettings={baseSettings}
        cacheStats={{ tiles: 0 }}
        markersCount={0}
        totalPhotos={0}
        isOnline
        syncConflictCount={0}
        cloudSyncEnabled={false}
        guestImportDone
        syncingNow={false}
        syncApiBase=""
        updater={downloadedUpdater}
        onLogout={vi.fn()}
        onOpenLogin={vi.fn()}
        onTempSettingsChange={vi.fn()}
        onSaveSettings={vi.fn()}
        onCloseSettings={vi.fn()}
        onCloudSyncChange={vi.fn()}
        onSyncApiBaseChange={vi.fn()}
        onRunCloudSync={vi.fn()}
        onImportGuestData={vi.fn()}
        onClearTileCache={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '立即重启安装' }));
    expect(downloadedUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });
});
