// Realistic BJJ Belt with stripes
const BELT = {
  white: { main: '#f5f5f0', dark: '#ddd', border: '#ccc' },
  blue: { main: '#1a5fb4', dark: '#154a8a', border: '#0d3b6e' },
  purple: { main: '#7b2d8e', dark: '#5f2270', border: '#4a1a57' },
  brown: { main: '#8b5e3c', dark: '#6b472d', border: '#543620' },
  black: { main: '#1a1a1a', dark: '#111', border: '#333' },
};

export function BeltSVG({ belt = 'white', stripes = 0, width = 120, height = 24 }) {
  const c = BELT[belt] || BELT.white;
  const isWhite = belt === 'white';
  return (
    <svg width={width} height={height} viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Belt body */}
      <rect x="1" y="4" width="118" height="16" rx="3" fill={c.main} stroke={isWhite ? '#999' : c.border} strokeWidth="0.5" />
      {/* Texture line */}
      <line x1="2" y1="12" x2="118" y2="12" stroke={c.dark} strokeWidth="0.5" strokeOpacity="0.3" />
      {/* Black bar for rank */}
      <rect x="78" y="4" width="16" height="16" rx="1" fill={isWhite ? '#1a1a1a' : '#1a1a1a'} />
      {/* Stripes on black bar */}
      {[...Array(Math.min(stripes, 4))].map((_, i) => (
        <rect key={i} x={81 + i * 3} y="6" width="2" height="12" rx="0.5" fill="#f5f5f0" />
      ))}
      {/* Belt tip fold */}
      <path d="M10 4 L5 12 L10 20" stroke={c.dark} strokeWidth="0.5" fill="none" strokeOpacity="0.3" />
    </svg>
  );
}

// Compact belt dot for leaderboard etc
export function BeltDot({ belt = 'white', size = 12 }) {
  const c = BELT[belt] || BELT.white;
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: c.main, border: belt === 'white' ? '1px solid #999' : `1px solid ${c.border}`,
      boxShadow: `0 0 4px ${c.main}33`,
    }} />
  );
}
