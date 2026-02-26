// SVG line chart for weight tracking
export default function WeightChart({ data = [], goal = null }) {
  if (data.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>Log your weight in Settings</div>;

  const vals = data.map(d => d.weight_kg);
  const dates = data.map(d => d.logged_at);
  const min = Math.min(...vals, goal?.target_kg || Infinity) - 1;
  const max = Math.max(...vals, goal?.target_kg || -Infinity) + 1;
  const range = max - min || 1;

  const W = 280, H = 120, PX = 30, PY = 10;
  const plotW = W - PX * 2, plotH = H - PY * 2;

  const points = data.map((d, i) => ({
    x: PX + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: PY + plotH - ((d.weight_kg - min) / range) * plotH,
    kg: d.weight_kg,
    date: d.logged_at,
  }));

  // Smooth curve through points
  const pathD = points.length === 1
    ? `M${points[0].x},${points[0].y}`
    : points.reduce((acc, p, i) => {
        if (i === 0) return `M${p.x},${p.y}`;
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        return `${acc} C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
      }, '');

  // Area fill
  const areaD = points.length > 1
    ? `${pathD} L${points[points.length - 1].x},${PY + plotH} L${points[0].x},${PY + plotH} Z`
    : '';

  // Goal line Y
  const goalY = goal?.target_kg ? PY + plotH - ((goal.target_kg - min) / range) * plotH : null;

  // Y axis labels (3 ticks)
  const ticks = [min, min + range / 2, max].map(v => ({
    val: Math.round(v * 10) / 10,
    y: PY + plotH - ((v - min) / range) * plotH,
  }));

  // Current & diff
  const current = vals[vals.length - 1];
  const prev = vals.length >= 2 ? vals[vals.length - 2] : null;
  const diff = prev !== null ? current - prev : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: 32, color: '#f0ece2' }}>{current}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>kg</span>
        {diff !== null && diff !== 0 && (
          <span style={{ fontSize: 13, color: diff > 0 ? '#ef5350' : '#66bb6a', fontWeight: 600 }}>
            {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}
          </span>
        )}
        {goal && (
          <span style={{ fontSize: 11, color: '#64b5f6', marginLeft: 'auto' }}>
            Goal: {goal.target_kg}kg{goal.target_date ? ` by ${goal.target_date}` : ''}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PX} y1={t.y} x2={W - PX} y2={t.y} stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
            <text x={PX - 4} y={t.y + 3} textAnchor="end" fill="#666" fontSize="8">{t.val}</text>
          </g>
        ))}

        {/* Goal line */}
        {goalY !== null && (
          <g>
            <line x1={PX} y1={goalY} x2={W - PX} y2={goalY} stroke="#64b5f6" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.6" />
            <text x={W - PX + 4} y={goalY + 3} fill="#64b5f6" fontSize="7">Goal</text>
          </g>
        )}

        {/* Area */}
        {areaD && <path d={areaD} fill="url(#weightGrad)" opacity="0.15" />}

        {/* Curve */}
        <path d={pathD} fill="none" stroke="#9b4dca" strokeWidth="2" strokeLinecap="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? '#9b4dca' : '#7b2d8e'} stroke="#131320" strokeWidth="1" />
            {/* Show date for first, last, and every ~5th */}
            {(i === 0 || i === points.length - 1 || (points.length > 10 && i % Math.ceil(points.length / 5) === 0)) && (
              <text x={p.x} y={PY + plotH + 10} textAnchor="middle" fill="#666" fontSize="7">
                {new Date(p.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
              </text>
            )}
          </g>
        ))}

        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9b4dca" />
            <stop offset="100%" stopColor="#9b4dca" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
