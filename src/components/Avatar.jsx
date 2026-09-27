import { useEffect, useState } from 'react';
import { cn, defaultAvatarUrl } from '../lib/utils';
import { isRemoteHttpUrl, mediaIdFromUrl } from '../lib/media';
import { canSeeProfilePhoto } from '../lib/privacy';
import { loadMediaBlob } from '../services/database';

/**
 * @param {{ name?: string, src?: string, size?: number, online?: boolean, className?: string, ring?: boolean, owner?: object, viewerId?: string, hidePhoto?: boolean }} props
 * Pass owner + viewerId to enforce profile-photo privacy (initials only when hidden).
 */
export default function Avatar({
  name = '',
  src = '',
  size = 48,
  online,
  className,
  ring,
  owner,
  viewerId,
  hidePhoto = false,
}) {
  const [resolved, setResolved] = useState('');
  const fallback = defaultAvatarUrl(name);

  const privacyBlocked =
    hidePhoto ||
    (owner && viewerId != null && owner.id !== viewerId && !canSeeProfilePhoto(owner, viewerId));

  const effectiveSrc = privacyBlocked ? '' : src;

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!effectiveSrc) {
        setResolved(fallback);
        return;
      }
      if (isRemoteHttpUrl(effectiveSrc)) {
        setResolved(effectiveSrc);
        return;
      }
      if (mediaIdFromUrl(effectiveSrc)) {
        try {
          const url = await loadMediaBlob(effectiveSrc);
          if (!cancelled) setResolved(url || fallback);
        } catch {
          if (!cancelled) setResolved(fallback);
        }
        return;
      }
      setResolved(effectiveSrc || fallback);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [effectiveSrc, fallback]);

  const dim = `${size}px`;
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';

  const showInitialsOnly = privacyBlocked || !effectiveSrc;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: dim, height: dim }}
    >
      <div
        className={cn(
          'h-full w-full overflow-hidden rounded-full bg-graphite-light',
          ring && 'p-[2px] bg-story-ring',
        )}
      >
        {showInitialsOnly && privacyBlocked ? (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center rounded-full bg-graphite-light font-semibold text-emerald-primary',
              ring && 'border-2 border-navy-bg',
            )}
            style={{ fontSize: Math.max(12, size * 0.32) }}
            aria-label={name || 'avatar'}
          >
            {initials}
          </div>
        ) : (
          <img
            src={resolved || fallback}
            alt={name || 'avatar'}
            className={cn(
              'h-full w-full rounded-full object-cover',
              ring && 'border-2 border-navy-bg',
            )}
            onError={(e) => {
              e.currentTarget.src = fallback;
            }}
          />
        )}
      </div>
      {online != null && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-navy-bg',
            online ? 'bg-emerald-primary' : 'bg-silver-faint',
          )}
        />
      )}
    </div>
  );
}
