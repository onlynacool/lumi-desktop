// ── Starry Night aqua-blue accent tokens ─────────────────────────────────────
export const A = {
  text:        'text-sky-400',
  bg:          'bg-sky-500',
  border:      'border-sky-400',
  borderFaded: 'border-sky-400/40',
  hoverText:   'hover:text-sky-400',
  activeBg:    'bg-sky-500/10',
} as const;

export const formatTime = (sec: number): string => {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
