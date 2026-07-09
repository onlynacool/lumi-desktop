import React, { memo } from 'react';

// Shown whenever a song or playlist has no embedded cover art
export const ArtFallback = memo(() => (
  <img
    src="./logo.png"
    alt="Lumi"
    draggable={false}
    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
  />
));
ArtFallback.displayName = 'ArtFallback';

interface ArtThumbProps {
  cover: string | null;
  className: string;
}

export const ArtThumb = memo(({ cover, className }: ArtThumbProps) =>
  cover
    ? <img src={cover} alt="" className={`${className} object-cover flex-shrink-0`} />
    : <div className={`${className} bg-zinc-800 overflow-hidden flex-shrink-0`}><ArtFallback /></div>
);
ArtThumb.displayName = 'ArtThumb';
