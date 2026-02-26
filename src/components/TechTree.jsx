import { useState } from 'react';

const POSITIONS = [
  { id: 'standing', label: 'Standing', x: 50, y: 8 },
  { id: 'closed_guard', label: 'Closed Guard', x: 15, y: 32 },
  { id: 'open_guard', label: 'Open Guard', x: 50, y: 32 },
  { id: 'half_guard', label: 'Half Guard', x: 85, y: 32 },
  { id: 'mount', label: 'Mount', x: 15, y: 58 },
  { id: 'side_control', label: 'Side Control', x: 50, y: 58 },
  { id: 'back', label: 'Back', x: 85, y: 58 },
  { id: 'turtle', label: 'Turtle', x: 15, y: 82 },
  { id: 'finish', label: 'Finish', x: 50, y: 82 },
  { id: 'leg_entangle', label: 'Leg Lock', x: 85, y: 82 },
];

const TECH_MAP = {
  'Single Leg': { from: 'standing', to: 'side_control' },
  'Double Leg': { from: 'standing', to: 'side_control' },
  'Arm Drag': { from: 'standing', to: 'back' },
  'Snap Down': { from: 'standing', to: 'turtle' },
  'Body Lock': { from: 'standing', to: 'side_control' },
  'Ankle Pick': { from: 'standing', to: 'side_control' },
  'Osoto Gari': { from: 'standing', to: 'side_control' },
  'Seoi Nage': { from: 'standing', to: 'side_control' },
  'Tomoe Nage': { from: 'standing', to: 'closed_guard' },
  'Uchi Mata': { from: 'standing', to: 'side_control' },
  'Ko Uchi Gari': { from: 'standing', to: 'open_guard' },
  'Scissor Sweep': { from: 'closed_guard', to: 'mount' },
  'Hip Bump': { from: 'closed_guard', to: 'mount' },
  'Flower Sweep': { from: 'closed_guard', to: 'mount' },
  'Butterfly Sweep': { from: 'open_guard', to: 'mount' },
  'X-Guard Sweep': { from: 'open_guard', to: 'side_control' },
  'Berimbolo': { from: 'open_guard', to: 'back' },
  'Pendulum': { from: 'closed_guard', to: 'mount' },
  'Elevator Sweep': { from: 'half_guard', to: 'mount' },
  'Waiter Sweep': { from: 'half_guard', to: 'side_control' },
  'Knee Slice': { from: 'half_guard', to: 'side_control' },
  'Toreando': { from: 'open_guard', to: 'side_control' },
  'Over-Under': { from: 'closed_guard', to: 'side_control' },
  'Stack Pass': { from: 'closed_guard', to: 'side_control' },
  'Leg Drag': { from: 'open_guard', to: 'side_control' },
  'Smash Pass': { from: 'half_guard', to: 'side_control' },
  'Body Lock Pass': { from: 'open_guard', to: 'side_control' },
  'Backstep': { from: 'open_guard', to: 'leg_entangle' },
  'Armbar': { from: 'mount', to: 'finish' },
  'Triangle': { from: 'closed_guard', to: 'finish' },
  'RNC': { from: 'back', to: 'finish' },
  'Kimura': { from: 'side_control', to: 'finish' },
  'Guillotine': { from: 'standing', to: 'finish' },
  'Darce': { from: 'side_control', to: 'finish' },
  'Americana': { from: 'mount', to: 'finish' },
  'Bow & Arrow': { from: 'back', to: 'finish' },
  'Cross Collar': { from: 'mount', to: 'finish' },
  'Omoplata': { from: 'closed_guard', to: 'finish' },
  'Heel Hook': { from: 'leg_entangle', to: 'finish' },
  'Knee Bar': { from: 'leg_entangle', to: 'finish' },
  'Toe Hold': { from: 'leg_entangle', to: 'finish' },
  'Ezekiel': { from: 'mount', to: 'finish' },
  'Loop Choke': { from: 'open_guard', to: 'finish' },
  'Anaconda': { from: 'turtle', to: 'finish' },
  'North-South': { from: 'side_control', to: 'finish' },
  'Baseball Choke': { from: 'side_control', to: 'finish' },
  'Calf Slicer': { from: 'leg_entangle', to: 'finish' },
  'Upa (Bridge & Roll)': { from: 'mount', to: 'closed_guard' },
  'Shrimp': { from: 'side_control', to: 'open_guard' },
  'Frame & Reguard': { from: 'side_control', to: 'half_guard' },
  'Back Escape': { from: 'back', to: 'open_guard' },
  'Granby Roll': { from: 'turtle', to: 'open_guard' },
  'Trap & Roll': { from: 'mount', to: 'half_guard' },
};

export default function TechTree({ events = [] }) {
  const [hovered, setHovered] = useState(null);

  // Build flows from offensive events
  const flowMap = {};
  events.filter(e => e.direction === 'offensive').forEach(e => {
    const m = TECH_MAP[e.technique];
    if (!m) return;
    const key = `${m.from}→${m.to}`;
    if (!flowMap[key]) flowMap[key] = { from: m.from, to: m.to, count: 0, techniques: {} };
    flowMap[key].count++;
    flowMap[key].techniques[e.technique] = (flowMap[key].techniques[e.technique] || 0) + 1;
  });
  const flows = Object.values(flowMap).sort((a, b) => b.count - a.count);
  const maxFlow = Math.max(...flows.map(f => f.count), 1);

  // Which positions are active
  const activePos = new Set();
  flows.forEach(f => { activePos.add(f.from); activePos.add(f.to); });

  if (flows.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>Log offensive events in rounds to see your game flow</div>;
  }

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '85%' }}>
        <svg viewBox="0 0 100 95" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#9b4dca" /><stop offset="100%" stopColor="#66bb6a" /></linearGradient>
            <linearGradient id="fg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#64b5f6" /><stop offset="100%" stopColor="#ce93d8" /></linearGradient>
          </defs>

          {/* Flow lines */}
          {flows.map((f, i) => {
            const from = POSITIONS.find(p => p.id === f.from);
            const to = POSITIONS.find(p => p.id === f.to);
            if (!from || !to) return null;
            const thickness = 0.8 + (f.count / maxFlow) * 5;
            const opacity = 0.15 + (f.count / maxFlow) * 0.65;
            const isHov = hovered === `${f.from}→${f.to}`;
            const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
            // Curve control point offset
            const dx = to.x - from.x, dy = to.y - from.y;
            const cx = mx + dy * 0.15, cy = my - dx * 0.08;
            return (
              <g key={i} onMouseEnter={() => setHovered(`${f.from}→${f.to}`)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                <path d={`M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`} stroke={isHov ? '#fff' : 'url(#fg)'} strokeWidth={isHov ? thickness + 1 : thickness} strokeOpacity={isHov ? 0.9 : opacity} fill="none" strokeLinecap="round" />
                {/* Technique labels on thicker flows */}
                {(f.count >= 2 || flows.length <= 6) && !isHov && (
                  <text x={cx + 1} y={cy - 1} fill="#aaa" fontSize="2.2" fontWeight="500" textAnchor="middle" opacity="0.7">
                    {Object.entries(f.techniques).sort((a, b) => b[1] - a[1])[0][0]}
                    {Object.keys(f.techniques).length > 1 ? ` +${Object.keys(f.techniques).length - 1}` : ''}
                  </text>
                )}
                <text x={cx + 1} y={cy + 2} fill="#fff" fontSize="2" fontWeight="700" textAnchor="middle" opacity="0.5">{f.count}×</text>
              </g>
            );
          })}

          {/* Nodes */}
          {POSITIONS.filter(p => activePos.has(p.id)).map(p => {
            const out = flows.filter(f => f.from === p.id).reduce((s, f) => s + f.count, 0);
            const inc = flows.filter(f => f.to === p.id).reduce((s, f) => s + f.count, 0);
            const sz = 3.5 + Math.min((out + inc) / (maxFlow * 2), 1) * 3;
            const isFin = p.id === 'finish';
            return (
              <g key={p.id}>
                <circle cx={p.x} cy={p.y} r={sz} fill="#131320" stroke={isFin ? '#66bb6a' : p.id === 'standing' ? '#64b5f6' : '#9b4dca'} strokeWidth={isFin ? 1 : 0.6} />
                <text x={p.x} y={p.y + sz + 3} textAnchor="middle" fill="#999" fontSize="2.5" fontWeight="600">{p.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover detail */}
      {hovered && flowMap[hovered] && (
        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 8, marginTop: 4, fontSize: 12, color: '#ccc' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {POSITIONS.find(p => p.id === flowMap[hovered].from)?.label} → {POSITIONS.find(p => p.id === flowMap[hovered].to)?.label}
          </div>
          {Object.entries(flowMap[hovered].techniques).sort((a, b) => b[1] - a[1]).map(([tech, count]) => (
            <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>{tech}</span><span style={{ color: '#9b4dca', fontFamily: 'var(--font-d)' }}>{count}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
