import React, { memo } from 'react';
import { ArtFallback } from './ArtThumb';

// Pre-computed groove radii — defined outside component so the array is never
// re-allocated on render (memo still needs stable props to skip re-renders).
const GROOVE_RADII = [19, 22, 24.5, 26.5, 28.5, 30.5, 32.5, 34, 35.5,
                      37, 38.5, 40, 41.5, 43, 44.5, 46, 47.5];

interface VinylRecordProps {
  cover: string | null;
  isPlaying: boolean;
}

/**
 * Renders a vinyl LP with:
 *  - CSS-animated rotation (animationPlayState: running | paused)
 *  - SVG concentric groove rings (1 DOM element instead of 17 divs)
 *  - Tonearm that pivots in/out on play/pause with a CSS transition
 *
 * Wrapped in memo so it only re-renders when cover or isPlaying changes —
 * not on every timeupdate tick from the parent.
 */
const VinylRecord = memo(({ cover, isPlaying }: VinylRecordProps) => (
  <div style={{
    position: 'relative', width: '100%', aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {/* ── Spinning disc ── */}
    <div style={{
      width: '100%', height: '100%', borderRadius: '50%',
      background: `radial-gradient(circle at 50%,
        #111 28%, #1c1c1c 30%, #1a1a1a 36%,
        #252525 39%, #1c1c1c 42%, #1e1e1e 50%,
        #1a1a1a 55%, #2a2a2a 60%, #111 90%)`,
      boxShadow: '0 0 60px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      animation: 'vinyl-spin 3.5s linear infinite',
      animationPlayState: isPlaying ? 'running' : 'paused',
    }}>
      {/* Groove rings — single SVG is far lighter than 17 separate divs */}
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {GROOVE_RADII.map(r => (
          <circle key={r} cx="50" cy="50" r={r}
            fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.35" />
        ))}
      </svg>

      {/* Centre label with album art (does NOT spin relative to the disc) */}
      <div style={{
        width: '34%', height: '34%', borderRadius: '50%', overflow: 'hidden',
        position: 'relative', zIndex: 2,
        border: '2px solid #333', boxShadow: '0 0 10px rgba(0,0,0,0.8)', flexShrink: 0,
      }}>
        {cover
          ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ArtFallback />}
      </div>

      {/* Spindle hole */}
      <div style={{
        position: 'absolute', width: '3%', height: '3%',
        borderRadius: '50%', background: '#0a0a0a', zIndex: 3,
      }} />
    </div>

    {/* ── Tonearm — pivots, does not spin with the disc ── */}
    <div style={{
      position: 'absolute', top: '-4%', right: '2%',
      width: '38%', height: '70%', pointerEvents: 'none',
      transformOrigin: '90% 8%',
      transform: isPlaying ? 'rotate(22deg)' : 'rotate(12deg)',
      transition: 'transform 0.8s ease',
    }}>
      {/* Pivot cap */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%',
        background: 'radial-gradient(circle, #d4d4d4, #888)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
      }} />
      {/* Arm shaft */}
      <div style={{
        position: 'absolute', top: 7, right: 7, width: 3, height: '85%', borderRadius: 4,
        background: 'linear-gradient(to bottom, #ccc, #999)',
        transformOrigin: 'top center', transform: 'rotate(-10deg)',
        boxShadow: '1px 1px 4px rgba(0,0,0,0.5)',
      }} />
      {/* Headshell */}
      <div style={{
        position: 'absolute', bottom: 0, right: 2, width: 10, height: 16, borderRadius: 3,
        background: 'linear-gradient(to bottom, #aaa, #777)',
        boxShadow: '1px 1px 4px rgba(0,0,0,0.6)',
      }} />
    </div>
  </div>
));
VinylRecord.displayName = 'VinylRecord';

export default VinylRecord;
