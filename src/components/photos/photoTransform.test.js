import { describe, expect, it } from 'vitest';
import { fitPhoto, cropToPixels, normalizeRotation } from './photoTransform.js';

describe('photo export geometry', () => {
  it('fits a portrait rotated sideways without cropping or stretching', () => {
    const fit = fitPhoto(1200, 2400, -90, 600, 600);
    expect(fit).toEqual({ width: 600, height: 300, imageWidth: 300, imageHeight: 600 });
    expect(normalizeRotation(-450)).toBe(270);
  });
  it('maps the visible crop to the rotated image pixels, excluding surrounding space', () => {
    expect(
      cropToPixels(
        { x: 150, y: 75, width: 300, height: 150 },
        { width: 600, height: 300 },
        2400,
        1200
      )
    ).toEqual({ x: 600, y: 300, width: 1200, height: 600 });
  });
  it('clamps rounding near the image edges to avoid exporting blank pixels', () => {
    expect(
      cropToPixels({ x: 299, y: 199, width: 2, height: 2 }, { width: 300, height: 200 }, 600, 400)
    ).toEqual({ x: 598, y: 398, width: 2, height: 2 });
  });
});
