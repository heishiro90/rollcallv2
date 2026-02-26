import { useState, useEffect, useRef } from 'react';

// Simplified technique tree - shows paths from position to position
// Thicker = more used in sparring
const POSITIONS = [
  { id: 'standing', label: 'Standing', x: 50, y: 10 },
  { id: 'closed_guard', label: 'Closed Guard', x: 20, y: 35 },
  { id: 'open_guard', label: 'Open Guard', x: 50, y: 35 },
  { id: 'half_guard', label: 'Half Guard', x: 80, y: 35 },
  { id: 'mount', label: 'Mount', x: 20, y: 60 },
  { id: 'side_control', label: 'Side Control', x: 50, y: 60 },
  { id: 'back', label: 'Back', x: 80, y: 60 },
  { id: 'submission', label: 'Finish', x: 50, y: 85 },
];

// Map techniques to position transitions
const TECH_TO_FLOW = {
  // Takedowns → guard positions
  'Single Leg': { from: 'standing', to: 'side_control' },
  'Double Leg': { from: 'standing', to: 'side_control' },
  'Arm Drag': { from: 'standing', to: 'back' },
  'Osoto Gari': { from: 'standing', to: 'side_control' },
  'Seoi Nage': { from: 'standing', to: 'side_control' },
  // Sweeps
  'Scissor Sweep': { from: 'closed_guard', to: 'mount' },
  'Hip Bump': { from: 'closed_guard', to: 'mount' },
  'Flower Sweep': { from: 'closed_guard', to: 'mount' },
  'Butterfly Sweep': { from: 'open_guard', to: 'mount' },
  'X-Guard Sweep': { from: 'open_guard', to: 'side_control' },
  'Berimbolo': { from: 'open_guard', to: 'back' },
  'Elevator Sweep': { from: 'half_guard', to: 'mount' },
  // Passes
  'Knee Slice': { from: 'open_guard', to: 'side_control' },
  'Toreando': { from: 'open_guard', to: 'side_control' },
  'Over-Under': { from: 'closed_guard', to: 'side_control' },
  'Smash Pass': { from: 'half_guard', to: 'side_control' },
  'Leg Drag': { from: 'open_guard', to: 'side_control' },
  'Body Lock Pass': { from: 'open_guard', to: 'side_control' },
  // Transitions
  // Submissions
  'Armbar': { from: 'mount', to: 'submission' },
  'Triangle': { from: 'closed_guard', to: 'submission' },
  'RNC': { from: 'back', to: 'submission' },
  'Kimura': { from: 'side_control', to: 'submission' },
  'Guillotine': { from: 'standing', to: 'submission' },
  'Darce': { from: 'side_control', to: 'submission' },
  'Americana': { from: 'mount', to: 'submission' },
  'Bow & Arrow': { from: 'back', to: 'submission' },
  'Cross Collar': { from: 'mount', to: 'submission' },
  'Omoplata': { from: 'closed_guard', to: 'submission' },
  'Heel Hook': { from: 'open_guard', to: 'submission' },
  'Knee Bar': { from: 'open_guard', to: 'submission' },
  'Ezekiel': { from: 'mount', to: 'submission' },
};

export default function TechTree({ events = [] }) {
  const canvasRef = useRef(null);

  // Build flow data from events
  const flows = {};
  events.filter(e => e.direction === 'offensive').forEach(e => {
    const mapping = TECH_TO_FLOW[e.technique];
    if (mapping) {
      const key = `${mapping.from}→${mapping.to}`;
      flows[key] = (flows[key] || { from: mapping.from, to: mapping.to, count: 0, techniques: [] });
      flows[key].count++;
      if (!flows[key].techniques.includes(e.technique)) flows[key].techniques.push(e.technique);
    }
  });
  const flowList = Object.values(flows).sort((a, b) => b.count - a.count);
  const maxFlow = Math.max(...flowList.map(f => f.count), 1);

  if (flowList.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        Log more offensive events in sparring to see your game flow develop
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '80%' }}>
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {/* Flow lines */}
        {flowList.map((f, i) => {
          const from = POSITIONS.find(p => p.id === f.from);
          const to = POSITIONS.find(p => p.id === f.to);
          if (!from || !to) return null;
          const thickness = 1 + (f.count / maxFlow) * 6;
          const opacity = 0.2 + (f.count / maxFlow) * 0.6;
          return (
            <g key={i}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="url(#flowGrad)" strokeWidth={thickness} strokeOpacity={opacity}
                strokeLinecap="round" />
              {/* Count label at midpoint */}
              <text x={(from.x + to.x) / 2 + 2} y={(from.y + to.y) / 2 - 1}
                fill="#fff" fontSize="3" fontWeight="600" opacity={0.6}>
                {f.count}
              </text>
            </g>
          );
        })}

        {/* Gradient */}
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9b4dca" />
            <stop offset="100%" stopColor="#66bb6a" />
          </linearGradient>
        </defs>

        {/* Position nodes */}
        {POSITIONS.map(p => {
          const hasFlow = flowList.some(f => f.from === p.id || f.to === p.id);
          if (!hasFlow) return null;
          const totalOut = flowList.filter(f => f.from === p.id).reduce((s, f) => s + f.count, 0);
          const totalIn = flowList.filter(f => f.to === p.id).reduce((s, f) => s + f.count, 0);
          const size = 4 + Math.min((totalOut + totalIn) / maxFlow, 1) * 3;
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={size} fill="#1a1a2e" stroke={p.id === 'submission' ? '#66bb6a' : '#9b4dca'} strokeWidth="0.8" />
              <text x={p.x} y={p.y + size + 3.5} textAnchor="middle" fill="#aaa" fontSize="2.8" fontWeight="500">{p.label}</text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {flowList.slice(0, 4).map((f, i) => (
          <div key={i} style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            <span style={{ color: '#9b4dca' }}>{POSITIONS.find(p => p.id === f.from)?.label}</span>
            <span style={{ margin: '0 3px' }}>→</span>
            <span style={{ color: '#66bb6a' }}>{POSITIONS.find(p => p.id === f.to)?.label}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 3 }}>({f.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
