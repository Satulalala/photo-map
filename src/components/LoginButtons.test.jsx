import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginButtons from './LoginButtons.jsx';
import * as authApi from '../api/auth.js';

vi.mock('../api/auth.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getAuthProviders: vi.fn(),
  getSessionUser: vi.fn(),
  githubLoginUrl: vi.fn(returnTo => `https://photomap.satula.top/api/v1/auth/github?return_to=${encodeURIComponent(returnTo)}`),
}));

function renderLoginButtons(props = {}) {
  return render(
    <LoginButtons
      onLogin={vi.fn()}
      onSkip={vi.fn()}
      onLogout={vi.fn()}
      isLoggedIn={false}
      showButtons
      landingLayout
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authApi.getAuthProviders.mockResolvedValue({ github: true, passwordRecovery: false });
  delete window.electronAPI;
});

afterEach(() => {
  delete window.electronAPI;
});

describe('LoginButtons GitHub OAuth flow', () => {
  it('completes desktop GitHub login through openGitHubAuth and calls onLogin', async () => {
    const onLogin = vi.fn();
    const account = { id: 7, email: 'dev@example.com', username: 'octocat' };
    const openGitHubAuth = vi.fn().mockResolvedValue({ status: 'github-success', reason: '' });
    window.electronAPI = { openGitHubAuth };
    authApi.getSessionUser.mockResolvedValue(account);

    renderLoginButtons({ onLogin });
    fireEvent.click(screen.getByRole('button', { name: /GitHub 登录/ }));

    await waitFor(() => {
      expect(openGitHubAuth).toHaveBeenCalledWith(
        'https://photomap.satula.top/api/v1/auth/github?return_to=photomap%3A%2F%2Fapp%2Findex.html'
      );
      expect(authApi.getSessionUser).toHaveBeenCalledTimes(1);
      expect(onLogin).toHaveBeenCalledWith({ ...account, type: 'github' });
    });
  });

  it('stays closed silently when desktop auth popup is manually closed', async () => {
    const onLogin = vi.fn();
    window.electronAPI = {
      openGitHubAuth: vi.fn().mockResolvedValue({ status: 'closed', reason: '' }),
    };

    renderLoginButtons({ onLogin });
    fireEvent.click(screen.getByRole('button', { name: /GitHub 登录/ }));

    await waitFor(() => {
      expect(window.electronAPI.openGitHubAuth).toHaveBeenCalledTimes(1);
    });
    expect(authApi.getSessionUser).not.toHaveBeenCalled();
    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows mapped error message when desktop GitHub auth returns an error reason', async () => {
    window.electronAPI = {
      openGitHubAuth: vi.fn().mockResolvedValue({ status: 'error', reason: 'account_conflict' }),
    };

    renderLoginButtons();
    fireEvent.click(screen.getByRole('button', { name: /GitHub 登录/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('此 GitHub 账号无法关联，请使用原账号登录。');
    });
  });

  it('falls back to full-page redirect on Web when electronAPI.openGitHubAuth is absent', async () => {
    const assignMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'https://photomap.satula.top/',
        origin: 'https://photomap.satula.top',
        protocol: 'https:',
        pathname: '/',
        search: '',
        hash: '',
        assign: assignMock,
      },
    });

    try {
      renderLoginButtons();
      fireEvent.click(screen.getByRole('button', { name: /GitHub 登录/ }));

      expect(assignMock).toHaveBeenCalledWith(
        'https://photomap.satula.top/api/v1/auth/github?return_to=https%3A%2F%2Fphotomap.satula.top%2F'
      );
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
