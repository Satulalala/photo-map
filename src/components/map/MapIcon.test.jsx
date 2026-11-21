import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import MapIcon, { ICON_NAMES } from './MapIcon.jsx';

it('renders all named icons with stroke paths and preserves duotone tone layers', () => {
  expect(ICON_NAMES.length).toBeGreaterThanOrEqual(47);

  for (const name of ICON_NAMES) {
    const { container, unmount } = render(<MapIcon name={name} />);
    const svg = container.querySelector(`svg.map-icon[data-icon="${name}"]`);
    expect(svg).toBeTruthy();
    expect(svg.querySelector('.map-icon-stroke')?.getAttribute('d')).toBeTruthy();
    unmount();
  }

  for (const duotoneName of ['pin', 'photo', 'settings', 'life', 'globe', 'heatmap', 'mail']) {
    const { container, unmount } = render(<MapIcon name={duotoneName} />);
    expect(container.querySelector('.map-icon-tone')?.getAttribute('d')).toBeTruthy();
    unmount();
  }
});

it('falls back to pin path when an unknown icon name is passed', () => {
  const { container } = render(<MapIcon name="unknown-icon" />);
  const svg = container.querySelector('svg[data-icon="unknown-icon"]');
  expect(svg?.querySelector('.map-icon-stroke')).toBeTruthy();
  expect(svg?.querySelector('.map-icon-tone')).toBeTruthy();
});
