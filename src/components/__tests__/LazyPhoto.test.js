import { render, screen, waitFor } from '@testing-library/react';
import LazyPhoto from '../LazyPhoto';

describe('LazyPhoto', () => {
  it('renders skeleton when no photo', () => {
    const { container } = render(<LazyPhoto photo={null} className="test-photo" />);
    expect(container.firstChild).toHaveClass('test-photo');
  });

  it('renders image when photo is base64 string', async () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgo=';
    render(<LazyPhoto photo={base64} className="test-photo" alt="test" />);
    
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', base64);
    });
  });

  it('renders image when photo has data property', async () => {
    const photo = { data: 'data:image/png;base64,iVBORw0KGgo=' };
    render(<LazyPhoto photo={photo} className="test-photo" alt="test" />);
    
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', photo.data);
    });
  });

  it('calls electronAPI for photo with id', async () => {
    const photo = { id: 'test-id.jpg' };
    window.electronAPI.getThumbnailUrl.mockResolvedValue('http://test.com/thumb.jpg');
    
    render(<LazyPhoto photo={photo} className="test-photo" useThumbnail={true} />);
    
    await waitFor(() => {
      expect(window.electronAPI.getThumbnailUrl).toHaveBeenCalledWith('test-id.jpg');
    });
  });
});
