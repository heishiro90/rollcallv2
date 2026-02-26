// Clean SVG icons replacing emojis throughout the app
// Usage: <Icon name="submission" size={16} color="#fff" />

const paths = {
  // Submission = choke/tap hand
  submission: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
  // Better: hand tap
  sub: 'M9 3a1 1 0 011 1v4.5a.5.5 0 001 0V4a1 1 0 112 0v4.5a.5.5 0 001 0V5a1 1 0 112 0v3.5a.5.5 0 001 0V6a1 1 0 112 0v7c0 3.5-2.5 6-6 6h-1c-3 0-5.5-2-6-5l-1.5-4a1 1 0 011.7-.7L8 11V4a1 1 0 011-1z',
  sweep: 'M4 12h3l2-4h6l2 4h3M7 12l5 6 5-6',
  pass: 'M5 12h14m-4-4l4 4-4 4',
  takedown: 'M12 3v10m0 0l-4-4m4 4l4-4M8 21h8',
  escape: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9',
  offensive: 'M13 10V3L4 14h7v7l9-11h-7z',
  defensive: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  fire: 'M12 23c-3.5 0-8-2.5-8-8.5C4 9 8 4 12 1c4 3 8 8 8 13.5 0 6-4.5 8.5-8 8.5zm0-18c-2.5 2.5-5 6-5 9.5 0 4 2.5 5.5 5 5.5s5-1.5 5-5.5c0-3.5-2.5-7-5-9.5z',
  energy: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  timer: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z',
  check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  cross: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  guard: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z',
};

export default function Icon({ name, size = 18, color = 'currentColor', style = {} }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
      <path d={d} />
    </svg>
  );
}

// Category labels with proper styling instead of emojis
export const CAT_STYLE = {
  submission: { label: 'Submission', color: '#e57373', bg: 'rgba(229,115,115,.12)' },
  sweep: { label: 'Sweep', color: '#64b5f6', bg: 'rgba(100,181,246,.12)' },
  pass: { label: 'Pass', color: '#ffb74d', bg: 'rgba(255,183,77,.12)' },
  takedown: { label: 'Takedown', color: '#ffd54f', bg: 'rgba(255,213,79,.12)' },
  escape: { label: 'Escape', color: '#81c784', bg: 'rgba(129,199,132,.12)' },
  guard: { label: 'Guard', color: '#ce93d8', bg: 'rgba(206,147,216,.12)' },
  passing: { label: 'Passing', color: '#ffb74d', bg: 'rgba(255,183,77,.12)' },
  other: { label: 'Other', color: '#90a4ae', bg: 'rgba(144,164,174,.12)' },
};

export function CategoryBadge({ category, size = 'normal' }) {
  const s = CAT_STYLE[category] || CAT_STYLE.other;
  const isSmall = size === 'small';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: isSmall ? '2px 8px' : '3px 10px',
      borderRadius: 6,
      background: s.bg,
      color: s.color,
      fontSize: isSmall ? 10 : 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>{s.label}</span>
  );
}
