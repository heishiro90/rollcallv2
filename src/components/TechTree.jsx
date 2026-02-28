import { useState } from 'react';

const PHASE_COLORS = ['#64b5f6', '#ce93d8', '#66bb6a', '#ffd54f'];
const PHASE_LABELS = ['DEBOUT', 'GARDE', 'DOMINATION', 'FINISH'];

const NODE_DEF = {
  'Standing':     { col: 0 },
  'Closed Guard': { col: 1 }, 'Open Guard':  { col: 1 }, 'Half Guard':   { col: 1 },
  'Deep Half':    { col: 1 }, 'Lasso':       { col: 1 }, 'Spider':       { col: 1 },
  'De La Riva':   { col: 1 }, 'X-Guard':     { col: 1 }, 'Butterfly':    { col: 1 },
  'Side Control': { col: 2 }, 'Mount':       { col: 2 }, 'Back':         { col: 2 },
  'Leg Entangle': { col: 2 }, 'Turtle':      { col: 2 },
  'Finish':       { col: 3 },
};

const TECH_FLOW = {
  'Single Leg':      { from: 'Standing',     to: 'Side Control' },
  'Double Leg':      { from: 'Standing',     to: 'Side Control' },
  'Arm Drag':        { from: 'Standing',     to: 'Back' },
  'Snap Down':       { from: 'Standing',     to: 'Turtle' },
  'Guard Pull':      { from: 'Standing',     to: 'Closed Guard' },
  'Hip Throw':       { from: 'Standing',     to: 'Side Control' },
  'Foot Sweep':      { from: 'Standing',     to: 'Side Control' },
  'Body Lock Takedown': { from: 'Standing',  to: 'Side Control' },
  'Ankle Pick':      { from: 'Standing',     to: 'Side Control' },
  'Scissor Sweep':   { from: 'Closed Guard', to: 'Mount' },
  'Hip Bump':        { from: 'Closed Guard', to: 'Mount' },
  'Flower Sweep':    { from: 'Closed Guard', to: 'Mount' },
  'Pendulum':        { from: 'Closed Guard', to: 'Mount' },
  'Over-Under':      { from: 'Closed Guard', to: 'Side Control' },
  'Stack Pass':      { from: 'Closed Guard', to: 'Side Control' },
  'Butterfly Sweep': { from: 'Butterfly',    to: 'Mount' },
  'Hook Sweep':      { from: 'Butterfly',    to: 'Mount' },
  'Back Take':       { from: 'Butterfly',    to: 'Back' },
  'X-Guard Sweep':   { from: 'X-Guard',      to: 'Mount' },
  'Back Roll':       { from: 'X-Guard',      to: 'Side Control' },
  'Berimbolo':       { from: 'Open Guard',   to: 'Back' },
  'Toreando':        { from: 'Open Guard',   to: 'Side Control' },
  'Leg Drag':        { from: 'Open Guard',   to: 'Side Control' },
  'Body Lock Pass':  { from: 'Open Guard',   to: 'Side Control' },
  'Backstep':        { from: 'Open Guard',   to: 'Leg Entangle' },
  'Lasso Sweep':     { from: 'Lasso',        to: 'Side Control' },
  'Spider Sweep':    { from: 'Spider',       to: 'Mount' },
  'Tomahawk':        { from: 'Spider',       to: 'Mount' },
  'DLR Back Take':   { from: 'De La Riva',   to: 'Back' },
  'DLR Sweep':       { from: 'De La Riva',   to: 'Side Control' },
  'Elevator Sweep':  { from: 'Half Guard',   to: 'Mount' },
  'Waiter Sweep':    { from: 'Deep Half',    to: 'Mount' },
  'Homer Simpson':   { from: 'Deep Half',    to: 'Side Control' },
  'Knee Slice':      { from: 'Half Guard',   to: 'Side Control' },
  'Smash Pass':      { from: 'Half Guard',   to: 'Side Control' },
  'Knee on Belly':   { from: 'Side Control', to: 'Mount' },
  'Step Over':       { from: 'Side Control', to: 'Mount' },
  'Harness':         { from: 'Turtle',       to: 'Back' },
  'Seatbelt':        { from: 'Turtle',       to: 'Back' },
};

const POS_TO_NODE = {
  'Mount': 'Mount', 'Back': 'Back', 'Closed Guard': 'Closed Guard',
  'Open Guard': 'Open Guard', 'Half Guard': 'Half Guard',
  'Side Control': 'Side Control', 'Standing': 'Standing',
  'Turtle': 'Turtle', 'Leg Entangle': 'Leg Entangle',
  'Deep Half': 'Deep Half', 'Lasso': 'Lasso', 'Spider': 'Spider',
  'De La Riva': 'De La Riva', 'X-Guard': 'X-Guard', 'Butterfly': 'Butterfly',
};

function bezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
}

export default function TechTree({ events = [] }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Build flow map
  const flowMap = {};
  events.filter(e => e.direction === 'offensive').forEach(e => {
    let from, to;
    if (e.event_type === 'submission' && e.position) {
      from = POS_TO_NODE[e.position] || 'Side Control';
      to = 'Finish';
    } else {
      const m = TECH_FLOW[e.technique];
      if (!m) return;
      from = m.from; to = m.to;
    }
    const key = `${from}→${to}`;
    if (!flowMap[key]) flowMap[key] = { from, to, techs: {} };
    flowMap[key].techs[e.technique] = (flowMap[key].techs[e.technique] || 0) + 1;
  });

  const flows = Object.values(flowMap);
  if (flows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
        Log des événements offensifs pendant tes rounds pour voir ton game flow.
      </div>
    );
  }

  // Active nodes per column
  const activeNodes = new Set(flows.flatMap(f => [f.from, f.to]));
  const colNodes = { 0: [], 1: [], 2: [], 3: [] };
  Object.entries(NODE_DEF).forEach(([name, nd]) => {
    if (activeNodes.has(name)) colNodes[nd.col].push(name);
  });

  // SVG dimensions
  const SVG_W = 560;
  const TOP_PAD = 30;
  const NODE_R = 8;
  const NODE_VGAP = 36;
  const BOTTOM_PAD = 20;
  const maxRows = Math.max(...Object.values(colNodes).map(a => a.length), 1);
  const SVG_H = TOP_PAD + maxRows * NODE_VGAP + BOTTOM_PAD;
  const COL_X = [55, 185, 385, 510];

  // Node positions (centered per column)
  const nodePos = {};
  Object.entries(colNodes).forEach(([col, nodes]) => {
    if (!nodes.length) return;
    const cx = COL_X[col];
    const color = PHASE_COLORS[col];
    const totalH = (nodes.length - 1) * NODE_VGAP;
    const startY = TOP_PAD + (SVG_H - TOP_PAD - BOTTOM_PAD - totalH) / 2;
    nodes.forEach((name, i) => {
      nodePos[name] = { x: cx, y: startY + i * NODE_VGAP, color };
    });
  });

  const vols = flows.map(f => Object.values(f.techs).reduce((s, v) => s + v, 0));
  const maxVol = Math.max(...vols, 1);

  const laneRanges = [[6, 120], [130, 290], [305, 455], [464, SVG_W - 4]];

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id="tfGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {flows.map((flow, fi) => {
            const from = nodePos[flow.from], to = nodePos[flow.to];
            if (!from || !to) return null;
            return [
              <linearGradient key={`g${fi}`} id={`tfg${fi}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={from.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={to.color} stopOpacity="0.22" />
              </linearGradient>,
              <linearGradient key={`gh${fi}`} id={`tfgh${fi}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={from.color} stopOpacity="1" />
                <stop offset="100%" stopColor={to.color} stopOpacity="0.9" />
              </linearGradient>,
            ];
          })}
        </defs>

        {/* Lane backgrounds */}
        {laneRanges.map(([x1, x2], i) => (
          <g key={i}>
            <rect x={x1} y={4} width={x2 - x1} height={SVG_H - 8}
              fill={PHASE_COLORS[i]} fillOpacity="0.04" rx={8} />
            <text x={(x1 + x2) / 2} y={17} textAnchor="middle"
              fill={PHASE_COLORS[i]} fontSize="6" fontWeight="700"
              letterSpacing="1.5" fillOpacity="0.45">
              {PHASE_LABELS[i]}
            </text>
          </g>
        ))}

        {/* Curves */}
        {flows.map((flow, fi) => {
          const from = nodePos[flow.from], to = nodePos[flow.to];
          if (!from || !to) return null;
          const vol = Object.values(flow.techs).reduce((s, v) => s + v, 0);
          const thickness = 1.5 + (vol / maxVol) * 6;
          const key = `${flow.from}→${flow.to}`;
          const isHov = hovered === key;

          const x1 = from.x + NODE_R, y1 = from.y;
          const x2 = to.x - NODE_R, y2 = to.y;
          const cx1 = x1 + (x2 - x1) * 0.44;
          const cx2 = x2 - (x2 - x1) * 0.44;
          const d = `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
          const mx = bezier(x1, cx1, cx2, x2, 0.5);
          const my = bezier(y1, y1, y2, y2, 0.5);
          const topTech = Object.entries(flow.techs).sort((a, b) => b[1] - a[1])[0][0];
          const extra = Object.keys(flow.techs).length > 1 ? ` +${Object.keys(flow.techs).length - 1}` : '';

          return (
            <g key={fi} style={{ cursor: 'pointer' }}
              onMouseEnter={e => { setHovered(key); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
              onMouseLeave={() => setHovered(null)}
              onMouseMove={e => setTooltipPos({ x: e.clientX, y: e.clientY })}
            >
              {vol >= 3 && (
                <path d={d} stroke={to.color} strokeWidth={thickness + 6}
                  strokeOpacity="0.05" fill="none" strokeLinecap="round" />
              )}
              <path d={d}
                stroke={isHov ? `url(#tfgh${fi})` : `url(#tfg${fi})`}
                strokeWidth={isHov ? thickness + 2 : thickness}
                fill="none" strokeLinecap="round"
                filter={isHov ? 'url(#tfGlow)' : undefined}
              />
              <path d={d} stroke="transparent" strokeWidth={18} fill="none" />
              {isHov && (
                <g>
                  <rect x={mx - 36} y={my - 10} width={72} height={13} fill="#141418" rx={4} />
                  <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="#fff" fontSize="7.5" fontWeight="600" style={{ pointerEvents: 'none' }}>
                    {topTech}{extra}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {Object.entries(nodePos).map(([name, n]) => {
          const col = NODE_DEF[name]?.col ?? 0;
          const side = col <= 1 ? -1 : 1;
          const lx = n.x + side * (NODE_R + 6);
          return (
            <g key={name}>
              <circle cx={n.x} cy={n.y} r={NODE_R + 4} fill={n.color} fillOpacity="0.07" />
              <circle cx={n.x} cy={n.y} r={NODE_R} fill="#141418"
                stroke={n.color} strokeWidth={name === 'Finish' ? 2 : 1.2} />
              {name === 'Finish' && (
                <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fontSize="9">🏆</text>
              )}
              <text x={lx} y={n.y}
                textAnchor={side === -1 ? 'end' : 'start'} dominantBaseline="middle"
                fill={name === 'Finish' ? '#ffd54f' : '#c8c4bc'}
                fontSize={name === 'Finish' ? '8' : '7.5'} fontWeight="600"
                fillOpacity={name === 'Finish' ? '1' : '0.8'}>
                {name === 'Finish' ? 'FINISH' : name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && flowMap[hovered] && (
        <div style={{
          position: 'fixed', left: tooltipPos.x + 14, top: tooltipPos.y - 8,
          background: '#1c1c26', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 10, padding: '10px 14px',
          boxShadow: '0 10px 28px rgba(0,0,0,.7)',
          zIndex: 999, pointerEvents: 'none', minWidth: 160,
        }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 9, letterSpacing: 1.5, color: '#666', textTransform: 'uppercase', marginBottom: 8 }}>
            {flowMap[hovered].from} → {flowMap[hovered].to}
          </div>
          {Object.entries(flowMap[hovered].techs).sort((a, b) => b[1] - a[1]).map(([tech, count], i) => (
            <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: i === 0 ? '#fff' : '#ccc', fontWeight: i === 0 ? 600 : 400 }}>{tech}</span>
              <span style={{ fontFamily: 'var(--font-d)', fontWeight: 700, color: i === 0 ? '#ffd54f' : '#9b4dca' }}>{count}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
