export const LEAGUE_NAME = 'La Liga Matilda';

/** Pelota de pádel: el logo de la liga. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo">
      <circle cx="20" cy="20" r="18" fill="var(--ball)" />
      <path d="M6 12c7 3 7 13 0 16M34 12c-7 3-7 13 0 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const AVATAR_COLORS = ['#2563eb', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#16a34a', '#be123c', '#ca8a04', '#4f46e5', '#0f766e', '#9333ea', '#475569'];

function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/** Círculo con las iniciales; el color sale del id para que cada jugador tenga siempre el mismo. */
export function Avatar({ id, name }: { id: string; name: string }) {
  return (
    <span className="avatar" style={{ background: AVATAR_COLORS[hash(id) % AVATAR_COLORS.length] }} title={name} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
