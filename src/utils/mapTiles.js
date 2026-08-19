export function supportsWebP() {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  if (!canvas || !canvas.getContext) return false;

  const context = canvas.getContext('2d');
  if (!context) return false;

  return canvas.toDataURL('image/webp').indexOf('image/webp') > -1;
}

export function getMapTileUrlTemplate(urlTemplate, prefersWebP = supportsWebP()) {
  if (!urlTemplate || !urlTemplate.endsWith('.png')) return urlTemplate;

  return prefersWebP ? urlTemplate.replace(/\.png$/i, '.webp') : urlTemplate;
}
