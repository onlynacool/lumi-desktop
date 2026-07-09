import React, { useState, useEffect, useRef, useCallback } from 'react';

type CatState = 'sitting' | 'walking' | 'running' | 'sleeping';

const GIF: Record<CatState, string> = {
  sitting:  './cat/sitting.gif',
  walking:  './cat/walking.gif',
  running:  './cat/running.gif',
  sleeping: './cat/sleeping.gif',
};

// How long (ms) the cat stays in each state [min, max]
const DURATION: Record<CatState, [number, number]> = {
  sitting:  [3000,  8000],
  sleeping: [10000, 22000],
  walking:  [3000,  7000],
  running:  [2000,  5000],
};

// Weighted next-state transitions
const TRANSITIONS: Record<CatState, { next: CatState; w: number }[]> = {
  sitting:  [{ next: 'sleeping', w: 2 }, { next: 'walking', w: 5 }, { next: 'running', w: 1 }, { next: 'sitting', w: 2 }],
  sleeping: [{ next: 'sitting', w: 6 }, { next: 'walking', w: 3 }, { next: 'running', w: 1 }],
  walking:  [{ next: 'sitting', w: 3 }, { next: 'running', w: 2 }, { next: 'walking', w: 2 }, { next: 'sleeping', w: 1 }],
  running:  [{ next: 'walking', w: 4 }, { next: 'sitting', w: 3 }, { next: 'running', w: 1 }],
};

const CAT_W = 150;
const CAT_H = 150;
const NOW_PLAYING_BAR_H = 80; // keep cat above the bar

const randBetween = (a: number, b: number) => Math.random() * (b - a) + a;

function pickNext(from: CatState): CatState {
  const pool = TRANSITIONS[from];
  const total = pool.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * total;
  for (const c of pool) { r -= c.w; if (r <= 0) return c.next; }
  return pool[0].next;
}

function clamp(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(window.innerWidth  - CAT_W, x)),
    y: Math.max(0, Math.min(window.innerHeight - CAT_H - NOW_PLAYING_BAR_H, y)),
  };
}

export default function CatPet() {
  // Start in a random position along the bottom
  const [pos,        setPos]        = useState(() => clamp(randBetween(80, window.innerWidth - 180), window.innerHeight - CAT_H - NOW_PLAYING_BAR_H - 10));
  const [state,      setState]      = useState<CatState>('sitting');
  const [faceRight,  setFaceRight]  = useState(true);
  const [dragging,   setDragging]   = useState(false);
  const [tooltip,    setTooltip]    = useState<string | null>(null);

  // Refs so callbacks never capture stale closure values
  const posRef      = useRef(pos);
  const stateRef    = useRef(state);
  const faceRef     = useRef(faceRight);
  const draggingRef = useRef(dragging);
  const dragOff     = useRef({ x: 0, y: 0 });
  const animTimer   = useRef<ReturnType<typeof setTimeout>>();
  const moveTimer   = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => { posRef.current = pos; },         [pos]);
  useEffect(() => { stateRef.current = state; },     [state]);
  useEffect(() => { faceRef.current = faceRight; },  [faceRight]);
  useEffect(() => { draggingRef.current = dragging; },[dragging]);

  const stopMoving = useCallback(() => {
    if (moveTimer.current) { clearInterval(moveTimer.current); moveTimer.current = undefined; }
  }, []);

  const startMoving = useCallback((speed: number) => {
    stopMoving();
    // Pick a random direction — bias toward horizontal (cats walk sideways)
    let dx = (Math.random() > 0.5 ? 1 : -1) * speed;
    let dy = (Math.random() - 0.5) * speed * 0.25;
    setFaceRight(dx > 0);

    moveTimer.current = setInterval(() => {
      if (draggingRef.current) return; // pause movement while being dragged
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

  const TOOLTIPS: Partial<Record<CatState, string[]>> = {
  sleeping: ['Zzz...', "Shh, I'm dreaming...", '*purring softly*', 'Dont wake me...'],
  sitting:  ['Meow! I am Lumi 🐾', 'Enjoy the music~', '*blinks slowly*', 'So peaceful...', 'Pet me?'],
  running:  ['Zoomies!', '*chasing a note*', 'Speed!'],
  walking:  ['Patrolling the app...', 'Searching for vibes...', 'Catch me...!'],
  };

  const scheduleNext = useCallback(() => {
    if (animTimer.current) clearTimeout(animTimer.current);
    const current = stateRef.current;
    const [minMs, maxMs] = DURATION[current];

    // Occasionally pop a tooltip
    const tips = TOOLTIPS[current];
    if (tips && Math.random() < 0.4) {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      setTooltip(tip);
      setTimeout(() => setTooltip(null), 2000);
    }

    animTimer.current = setTimeout(() => {
      if (draggingRef.current) { scheduleNext(); return; }
      stopMoving();
      const next = pickNext(current);
      setState(next);
      stateRef.current = next;
      if (next === 'walking') startMoving(1.8);
      if (next === 'running') startMoving(4.5);
      scheduleNext();
    }, randBetween(minMs, maxMs));
  }, [startMoving, stopMoving]);

  // Boot the state machine once
  useEffect(() => {
    scheduleNext();
    return () => {
      if (animTimer.current) clearTimeout(animTimer.current);
      stopMoving();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag handlers ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    draggingRef.current = true;
    stopMoving();
    dragOff.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, [stopMoving]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setPos(clamp(e.clientX - dragOff.current.x, e.clientY - dragOff.current.y));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      setDragging(false);
      draggingRef.current = false;
      // Resume auto-movement if the current state calls for it
      const cur = stateRef.current;
      if (cur === 'walking') startMoving(1.8);
      if (cur === 'running') startMoving(4.5);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [startMoving]);

  return (
    <div
      style={{
        position:   'fixed',
        left:        pos.x,
        top:         pos.y,
        width:       CAT_W,
        height:      CAT_H,
        zIndex:      45,            // above content, below full-screen player (z-50)
        cursor:      dragging ? 'grabbing' : 'grab',
        userSelect:  'none',
        transform:  `scaleX(${faceRight ? 1 : -1})`,
        transition:  dragging ? 'none' : 'transform 0.15s',
      }}
      onMouseDown={onMouseDown}
    >
      {/* Tooltip bubble (always flips back to readable direction) */}
      {tooltip && (
        <div style={{
          position:        'absolute',
          bottom:           CAT_H + 6,
          left:             '50%',
          transform:       `translateX(-50%) scaleX(${faceRight ? 1 : -1})`,
          background:       'rgba(0,0,0,0.75)',
          color:            '#fff',
          fontSize:         11,
          padding:          '4px 8px',
          borderRadius:     8,
          whiteSpace:       'nowrap',
          pointerEvents:    'none',
          backdropFilter:   'blur(4px)',
          border:           '1px solid rgba(255,255,255,0.15)',
        }}>
          {tooltip}
        </div>
      )}

      <img
        src={GIF[state]}
        alt={`cat ${state}`}
        draggable={false}
        style={{
          width:          '100%',
          height:         '100%',
          objectFit:      'contain',
          pointerEvents:  'none',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
