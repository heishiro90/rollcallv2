import { useState } from 'react';

// Focused positions: where the action happens
const NODES = [
  { id: 'standing', label: 'Standing', x: 50, y: 5, color: '#64b5f6' },
  { id: 'closed_guard', label: 'Closed Guard', x: 15, y: 28, color: '#ce93d8' },
  { id: 'open_guard', label: 'Open Guard', x: 50, y: 28, color: '#ce93d8' },
  { id: 'half_guard', label: 'Half Guard', x: 85, y: 28, color: '#ce93d8' },
  { id: 'mount', label: 'Mount', x: 15, y: 52, color: '#66bb6a' },
  { id: 'side_control', label: 'Side Control', x: 50, y: 52, color: '#66bb6a' },
  { id: 'back', label: 'Back', x: 85, y: 52, color: '#66bb6a' },
  { id: 'turtle', label: 'Turtle', x: 15, y: 75, color: '#ffb74d' },
  { id: 'leg_entangle', label: 'Leg Lock', x: 85, y: 75, color: '#ffb74d' },
  { id: 'finish', label: '🏆 Finish', x: 50, y: 92, color: '#ffd54f' },
];

// Map techniques → transitions (takedowns use from:standing, subs use position field)
const TECH_FLOW = {
  // Takedowns (english names)
  'Single Leg': { from: 'standing', to: 'side_control' },
  'Double Leg': { from: 'standing', to: 'side_control' },
  'Arm Drag': { from: 'standing', to: 'back' },
  'Snap Down': { from: 'standing', to: 'turtle' },
  'Body Lock Takedown': { from: 'standing', to: 'side_control' },
  'Ankle Pick': { from: 'standing', to: 'side_control' },
  'Outside Trip': { from: 'standing', to: 'side_control' },
  'Inside Trip': { from: 'standing', to: 'side_control' },
  'Hip Throw': { from: 'standing', to: 'side_control' },
  'Shoulder Throw': { from: 'standing', to: 'side_control' },
  'Foot Sweep': { from: 'standing', to: 'side_control' },
  'Drop Throw': { from: 'standing', to: 'mount' },
  'Guard Pull': { from: 'standing', to: 'closed_guard' },
  // Sweeps
  'Scissor Sweep': { from: 'closed_guard', to: 'mount' },
  'Hip Bump': { from: 'closed_guard', to: 'mount' },
  'Flower Sweep': { from: 'closed_guard', to: 'mount' },
  'Butterfly Sweep': { from: 'open_guard', to: 'mount' },
  'X-Guard Sweep': { from: 'open_guard', to: 'side_control' },
  'Berimbolo': { from: 'open_guard', to: 'back' },
  'Pendulum': { from: 'closed_guard', to: 'mount' },
  'Elevator Sweep': { from: 'half_guard', to: 'mount' },
  'Waiter Sweep': { from: 'half_guard', to: 'side_control' },
  // Passes
  'Knee Slice': { from: 'half_guard', to: 'side_control' },
  'Toreando': { from: 'open_guard', to: 'side_control' },
  'Over-Under': { from: 'closed_guard', to: 'side_control' },
  'Stack Pass': { from: 'closed_guard', to: 'side_control' },
  'Leg Drag': { from: 'open_guard', to: 'side_control' },
  'Smash Pass': { from: 'half_guard', to: 'side_control' },
  'Body Lock Pass': { from: 'open_guard', to: 'side_control' },
  'Backstep': { from: 'open_guard', to: 'leg_entangle' },
  // Escapes
  'Bridge & Roll': { from: 'mount', to: 'closed_guard' },
  'Hip Escape': { from: 'side_control', to: 'half_guard' },
  'Frame & Reguard': { from: 'side_control', to: 'open_guard' },
  'Back Escape': { from: 'back', to: 'open_guard' },
  'Granby Roll': { from: 'turtle', to: 'open_guard' },
};

// Position name → node id mapping
const POS_TO_NODE = {
  'Mount': 'mount', 'Back': 'back', 'Closed Guard': 'closed_guard',
  'Open Guard': 'open_guard', 'Half Guard': 'half_guard',
  'Side Control': 'side_control', 'Standing': 'standing',
  'Turtle': 'turtle', 'Leg Entangle': 'leg_entangle',
};

export default function TechTree({ events = [] }) {
  const [hovered, setHovered] = useState(null);

  // Build flows
  const flowMap = {};
  events.filter(e => e.direction === 'offensive').forEach(e => {
    let from, to;
    // Submissions: use position field → finish
    if (e.event_type === 'submission' && e.position) {
      from = POS_TO_NODE[e.position] || 'side_control';
      to = 'finish';
    } else {
      const mapping = TECH_FLOW[e.technique];
      if (!mapping) return;
      from = mapping.from;
      to = mapping.to;
    }
    const key = `${from}→${to}`;
    if (!flowMap[key]) flowMap[key] = { from, to, count: 0, techniques: {} };
    flowMap[key].count++;
    flowMap[key].techniques[e.technique] = (flowMap[key].techniques[e.technique] || 0) + 1;
  });

  const flows = Object.values(flowMap).sort((a, b) => b.count - a.count);
  const maxFlow = Math.max(...flows.map(f => f.count), 1);
  const activePos = new Set();
  flows.forEach(f => { activePos.add(f.from); activePos.add(f.to); });

  if (flows.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>Log offensive events in rounds to see your game flow. For submissions, the position picker will map your paths.</div>;
  }

  // Get top technique for a flow
  const topTech = (techs) => {
    const sorted = Object.entries(techs).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '';
  };

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="flowG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#9b4dca" /><stop offset="100%" stopColor="#66bb6a" /></linearGradient>
            <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#9b4dca" opacity="0.5" /></marker>
          </defs>

          {/* Flow lines */}
          {flows.map((f, i) => {
            const from = NODES.find(n => n.id === f.from);
            const to = NODES.find(n => n.id === f.to);
            if (!from || !to) return null;
            const thickness = 0.6 + (f.count / maxFlow) * 4;
            const opacity = 0.15 + (f.count / maxFlow) * 0.6;
            const isHov = hovered === `${f.from}→${f.to}`;
            const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
            const dx = to.x - from.x, dy = to.y - from.y;
            const cx = mx + dy * 0.12, cy = my - Math.abs(dx) * 0.05;
            const tech = topTech(f.techniques);
            const techCount = Object.keys(f.techniques).length;
            return (
              <g key={i} onMouseEnter={() => setHovered(`${f.from}→${f.to}`)} onMouseLeave={() => setHovered(null)} onClick={() => setHovered(hovered === `${f.from}→${f.to}` ? null : `${f.from}→${f.to}`)} style={{ cursor: 'pointer' }}>
                <path d={`M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`} stroke={isHov ? '#fff' : 'url(#flowG)'} strokeWidth={isHov ? thickness + 1.5 : thickness} strokeOpacity={isHov ? 0.95 : opacity} fill="none" strokeLinecap="round" markerEnd="url(#arrow)" />
                {/* Label: technique name + count */}
                <text x={cx} y={cy - 1.5} fill={isHov ? '#fff' : '#bbb'} fontSize={isHov ? '2.8' : '2.3'} fontWeight={isHov ? '700' : '500'} textAnchor="middle" opacity={isHov ? 1 : 0.7}>
                  {tech}{techCount > 1 ? ` +${techCount - 1}` : ''}
                </text>
                <text x={cx} y={cy + 2} fill="#fff" fontSize="1.8" fontWeight="700" textAnchor="middle" opacity="0.4">{f.count}×</text>
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.filter(n => activePos.has(n.id)).map(n => {
            const tot = flows.filter(f => f.from === n.id || f.to === n.id).reduce((s, f) => s + f.count, 0);
            const sz = 3 + Math.min(tot / (maxFlow * 1.5), 1) * 3.5;
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={sz} fill="#131320" stroke={n.color} strokeWidth={n.id === 'finish' ? 1.2 : 0.6} />
                <text x={n.x} y={n.y + 0.8} textAnchor="middle" fill="#fff" fontSize="2" fontWeight="600">{n.id === 'finish' ? '🏆' : ''}</text>
                <text x={n.x} y={n.y + sz + 3} textAnchor="middle" fill={n.color} fontSize="2.3" fontWeight="600">{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover/click detail */}
      {hovered && flowMap[hovered] && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,.05)', borderRadius: 10, marginTop: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ece2', marginBottom: 6 }}>
            {NODES.find(n => n.id === flowMap[hovered].from)?.label} → {NODES.find(n => n.id === flowMap[hovered].to)?.label}
          </div>
          {Object.entries(flowMap[hovered].techniques).sort((a, b) => b[1] - a[1]).map(([tech, count]) => (
            <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
              <span style={{ color: '#ccc' }}>{tech}</span>
              <span style={{ color: '#9b4dca', fontFamily: 'var(--font-d)', fontWeight: 600 }}>{count}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
