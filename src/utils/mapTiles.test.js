import { describe, expect, it } from 'vitest';
import { getMapTileUrlTemplate } from './mapTiles';

describe('getMapTileUrlTemplate', () => {
  it('prefers webp when browser support is available', () => {
    expect(
      getMapTileUrlTemplate('https://{s}.tile.example.com/{z}/{x}/{y}.png', true)
    ).toBe('https://{s}.tile.example.com/{z}/{x}/{y}.webp');
  });

  it('falls back to png when browser support is unavailable', () => {
    expect(
      getMapTileUrlTemplate('https://{s}.tile.example.com/{z}/{x}/{y}.png', false)
    ).toBe('https://{s}.tile.example.com/{z}/{x}/{y}.png');
  });
});
