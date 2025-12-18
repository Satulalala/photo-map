import { render, screen } from '@testing-library/react';
import Toast from '../Toast';

describe('Toast', () => {
  it('renders success toast', () => {
    render(<Toast type="success" message="操作成功" />);
    expect(screen.getByText('操作成功')).toBeInTheDocument();
  });

  it('renders error toast', () => {
    render(<Toast type="error" message="操作失败" />);
    expect(screen.getByText('操作失败')).toBeInTheDocument();
  });

  it('renders info toast', () => {
    render(<Toast type="info" message="提示信息" />);
    expect(screen.getByText('提示信息')).toBeInTheDocument();
  });

  it('applies correct class based on type', () => {
    const { container } = render(<Toast type="success" message="test" />);
    expect(container.firstChild).toHaveClass('toast');
    expect(container.firstChild).toHaveClass('success');
  });
});
