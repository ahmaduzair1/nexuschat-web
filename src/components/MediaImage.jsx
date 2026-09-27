import { useEffect, useState } from 'react';
import { isRemoteHttpUrl } from '../lib/media';
import { loadMediaBlob } from '../services/database';

export default function MediaImage({ url, alt = '', className }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!url) return;
      if (isRemoteHttpUrl(url)) {
        setSrc(url);
        return;
      }
      try {
        const resolved = await loadMediaBlob(url);
        if (!cancelled) setSrc(resolved || '');
      } catch {
        if (!cancelled) setSrc('');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-graphite-light text-xs text-silver-muted ${className || ''}`}
      >
        Media
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
