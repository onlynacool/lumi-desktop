import React, { useState, useEffect, useRef, useCallback } from 'react';

type CatState = 'sitting' | 'walking' | 'running' | 'sleeping';

const CACHE_BUST = Date.now();
const BASE = import.meta.env.BASE_URL;
const GIF: Record<CatState, string> = {
  sitting:  `${BASE}cat/sitting.gif?v=${CACHE_BUST}`,
  walking:  `${BASE}cat/walking.gif?v=${CACHE_BUST}`,
  running:  `${BASE}cat/running.gif?v=${CACHE_BUST}`,
  sleeping: `${BASE}cat/sleeping.gif?v=${CACHE_BUST}`,
};

const DURATION: Record<CatState, [number, number]> = {
  sitting:  [3000,  8000],
  sleeping: [10000, 22000],
  walking:  [3000,  7000],
  running:  [2000,  5000],
};

const TRANSITIONS: Record<CatState, { next: CatState; w: number }[]> = {
  sitting:  [{ next: 'sleeping', w: 2 }, { next: 'walking', w: 5 }, { next: 'running', w: 1 }, { next: 'sitting', w: 2 }],
  sleeping: [{ next: 'sitting',  w: 6 }, { next: 'walking', w: 3 }, { next: 'running', w: 1 }],
  walking:  [{ next: 'sitting',  w: 3 }, { next: 'running', w: 2 }, { next: 'walking', w: 2 }, { next: 'sleeping', w: 1 }],
  running:  [{ next: 'walking',  w: 4 }, { next: 'sitting', w: 3 }, { next: 'running', w: 1 }],
};

// Cat is smaller on mobile to fit the screen comfortably
const CAT_W = 90;
const CAT_H = 90;
const NOW_PLAYING_BAR_H = 80;

const randBetween = (a: number, b: number) => Math.random() * (b - a) + a;

function pickNext(from: CatState): CatState {
  const pool = TRANSITIONS[from];
  const total = pool.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * total;
  for (const c of pool) { r -= c.w; if (r <= 0) return c.next; }
  return pool[0].next;
}

function clamp(x: number, y: number) {
  return {
    x: Math.max(0, Math.min(window.innerWidth  - CAT_W, x)),
    y: Math.max(0, Math.min(window.innerHeight - CAT_H - NOW_PLAYING_BAR_H, y)),
  };
}

const TOOLTIPS: Partial<Record<CatState, string[]>> = {
  sleeping: ['Zzz...', "Shh, I'm dreaming...", '*purring softly*', 'Dont wake me...'],
  sitting:  ['Meow! I am Lumi 🐾', 'Enjoy the music~', '*blinks slowly*', 'So peaceful...', 'Pet me?'],
  running:  ['Zoomies!', '*chasing a note*', 'Speed!'],
  walking:  ['Patrolling the app...', 'Searching for vibes...', 'Catch me...!']
};

export default function CatPet() {
  const [pos,       setPos]       = useState(() => clamp(randBetween(40, window.innerWidth - 130), window.innerHeight - CAT_H - NOW_PLAYING_BAR_H - 10));
  const [catState,  setCatState]  = useState<CatState>('sitting');
  const [faceRight, setFaceRight] = useState(true);
  const [dragging,  setDragging]  = useState(false);
  const [tooltip,   setTooltip]   = useState<string | null>(null);

  const posRef      = useRef(pos);
  const stateRef    = useRef(catState);
  const draggingRef = useRef(false);
  const dragOff     = useRef({ x: 0, y: 0 });
  const animTimer   = useRef<ReturnType<typeof setTimeout>>();
  const moveTimer   = useRef<ReturnType<typeof setInterval>>();

  const catContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { posRef.current = pos; },         [pos]);
  useEffect(() => { stateRef.current = catState; },  [catState]);
  useEffect(() => { draggingRef.current = dragging; },[dragging]);

  const stopMoving = useCallback(() => {
    if (moveTimer.current) { clearInterval(moveTimer.current); moveTimer.current = undefined; }
  }, []);

  const startMoving = useCallback((speed: number) => {
    stopMoving();
    let dx = (Math.random() > 0.5 ? 1 : -1) * speed;
    let dy = (Math.random() - 0.5) * speed * 0.2;
    setFaceRight(dx > 0);

    moveTimer.current = setInterval(() => {
      if (draggingRef.current) return;
      setPos(prev => {
        const nx = prev.x + dx;
        const ny = prev.y + dy;
        const clamped = clamp(nx, ny);
        if (clamped.x !== nx) { dx = -dx; setFaceRight(dx > 0); }
        if (clamped.y !== ny) dy = -dy;
        return clamped;
      });
    }, 50);
  }, [stopMoving]);

  const scheduleNext = useCallback(() => {
    if (animTimer.current) clearTimeout(animTimer.current);
    const current = stateRef.current;
    const [minMs, maxMs] = DURATION[current];

    const tips = TOOLTIPS[current];
    if (tips && Math.random() < 0.35) {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      setTooltip(tip);
      setTimeout(() => setTooltip(null), 2200);
    }

    animTimer.current = setTimeout(() => {
      if (draggingRef.current) { scheduleNext(); return; }
      stopMoving();
      const next = pickNext(current);
      setCatState(next);
      stateRef.current = next;
      if (next === 'walking') startMoving(1.5);
      if (next === 'running') startMoving(4);
      scheduleNext();
    }, randBetween(minMs, maxMs));
  }, [startMoving, stopMoving]);

  useEffect(() => {
    scheduleNext();
    return () => {
      if (animTimer.current) clearTimeout(animTimer.current);
      stopMoving();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag Logic ──
  const onDragStart = useCallback((clientX: number, clientY: number) => {
    setDragging(true);
    draggingRef.current = true;
    stopMoving();
    dragOff.current = { x: clientX - posRef.current.x, y: clientY - posRef.current.y };
  }, [stopMoving]);

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    setPos(clamp(clientX - dragOff.current.x, clientY - dragOff.current.y));
  }, []);

  const onDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    setDragging(false);
    draggingRef.current = false;
    const cur = stateRef.current;
    if (cur === 'walking') startMoving(1.5);
    if (cur === 'running') startMoving(4);
  }, [startMoving]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (draggingRef.current) {
        e.preventDefault();
        const t = e.touches[0];
        onDragMove(t.clientX, t.clientY);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        onDragMove(e.clientX, e.clientY);
      }
    };

    const handleUp = () => onDragEnd();

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onDragMove, onDragEnd]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1000, // Above everything but transparent
        overflow: 'hidden'
      }}
    >
      <div
        ref={catContainerRef}
        onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); }}
        onTouchStart={(e) => { onDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
        style={{
          position:      'absolute',
          left:           pos.x,
          top:            pos.y,
          width:          CAT_W,
          height:         CAT_H,
          cursor:         dragging ? 'grabbing' : 'grab',
          userSelect:     'none',
          touchAction:    'none',
          transform:     `scaleX(${faceRight ? 1 : -1})`,
          transition:     dragging ? 'none' : 'transform 0.15s',
          pointerEvents:  'auto', // Cat is solid, everything else is transparent
        }}
      >
        {tooltip && (
          <div style={{
            position:       'absolute',
            bottom:          CAT_H + 6,
            left:            '50%',
            transform:      `translateX(-50%) scaleX(${faceRight ? 1 : -1})`,
            background:      'rgba(0,0,0,0.85)',
            color:           '#fff',
            fontSize:         11,
            fontWeight:      'bold',
            padding:         '6px 10px',
            borderRadius:     10,
            whiteSpace:      'nowrap',
            pointerEvents:   'none',
            backdropFilter:  'blur(4px)',
            border:          '1px solid rgba(255,255,255,0.2)',
            boxShadow:       '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            {tooltip}
          </div>
        )}

        <img
          src={GIF[catState]}
          alt={`cat ${catState}`}
          draggable={false}
          style={{
            width:           '100%',
            height:          '100%',
            objectFit:       'contain',
            pointerEvents:   'none',
            imageRendering:  'pixelated',
          }}
        />
      </div>
    </div>
  );
}
