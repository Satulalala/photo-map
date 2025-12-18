import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// 组件抛出错误
const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  // 抑制 console.error
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/出错了/)).toBeInTheDocument();
  });
});
