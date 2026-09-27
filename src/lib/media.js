const MEDIA_PREFIX = 'nexus://media/';

export function mediaUrlFor(id) {
  return `${MEDIA_PREFIX}${id}`;
}

export function mediaIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith(MEDIA_PREFIX)) return url.slice(MEDIA_PREFIX.length);
  return null;
}

export function isRemoteHttpUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

const cache = new Map();

export function getCachedMedia(url) {
  return cache.get(url) || null;
}

export function setCachedMedia(url, objectUrl) {
  if (cache.size > 80) {
    const first = cache.keys().next().value;
    const old = cache.get(first);
    if (old?.startsWith?.('blob:')) URL.revokeObjectURL(old);
    cache.delete(first);
  }
  cache.set(url, objectUrl);
}
