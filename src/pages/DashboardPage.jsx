import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BeltSVG } from '../components/Belt';
import { CategoryBadge, CAT_STYLE } from '../components/Icons';
import TechTree from '../components/TechTree';
import WeightChart from '../components/WeightChart';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };

function Bar({ value, max, color = 'var(--accent)', h = 5 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ width: '100%', height: h, background: 'rgba(255,255,255,.05)', borderRadius: h / 2, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: h / 2, transition: 'width .5s ease' }} /></div>;
}

function Av({ p, size = 28 }) {
  if (p?.avatar_url) return <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return <span style={{ fontSize: size * 0.7 }}>{p?.avatar_emoji || '🥋'}</span>;
}

function getPeriodStart(period) {
  const now = new Date();
  if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'semester') return new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return new Date(0);
}

export default function DashboardPage() {
  const { user, gym, profile } = useAuth();
  const [tab, setTab] = useState('overview');
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user && gym) load(); }, [user, gym]);

  async function load() {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [
      { data: mc }, { data: ac }, { data: mr }, { data: ar },
      { data: mt }, { data: at }, { data: goals }, { data: bh },
      { data: mev }, { data: aev },
      { data: weights }, { data: wGoal }, { data: injAll }, { data: roundsOpp }
    ] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).gte('checked_in_at', ms).order('checked_in_at', { ascending: false }),
      supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).order('checked_in_at', { ascending: false }),
      supabase.from('rounds').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null).gte('started_at', ms),
      supabase.from('rounds').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null),
      supabase.from('techniques').select('*').eq('user_id', user.id).eq('gym_id', gym.id).gte('created_at', ms).order('created_at', { ascending: false }),
      supabase.from('techniques').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at'),
      supabase.from('belt_history').select('*').eq('user_id', user.id).order('promoted_at'),
      supabase.from('round_events').select('*').eq('user_id', user.id).eq('gym_id', gym.id).gte('created_at', ms),
      supabase.from('round_events').select('*').eq('user_id', user.id).eq('gym_id', gym.id),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at').limit(60),
      supabase.from('weight_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('injuries').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
      supabase.from('rounds').select('*, profiles!rounds_opponent_id_fkey(display_name, avatar_emoji, avatar_url, belt)').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null).not('opponent_id', 'is', null),
    ]);

    const M = mc || [], A = ac || [], MR = mr || [], AR = ar || [], MT = mt || [], AT = at || [];
    const MEV = mev || [], AEV = aev || [], W = weights || [], INJ = injAll || [], RAll = roundsOpp || [];

    // Weekly
    const dow = (now.getDay() + 6) % 7;
    const ws = new Date(now); ws.setDate(now.getDate() - dow); ws.setHours(0,0,0,0);
    const weekly = DAY_LABELS.map((l, i) => { const dd = new Date(ws); dd.setDate(ws.getDate() + i); const ds = dd.toISOString().split('T')[0]; return { label: l, minutes: M.filter(c => c.checked_in_at.startsWith(ds)).reduce((s, c) => s + (c.duration_minutes || 0), 0) }; });

    // Subs
    const subMap = {};
    AEV.filter(e => e.event_type === 'submission').forEach(e => { subMap[e.technique] = subMap[e.technique] || { off: 0, def: 0 }; subMap[e.technique][e.direction === 'offensive' ? 'off' : 'def']++; });
    const submissions = Object.entries(subMap).map(([n, v]) => ({ name: n, ...v })).sort((a, b) => b.off - a.off).slice(0, 8);

    // Off/def
    const offMap = {}, defMap = {};
    AEV.filter(e => e.direction === 'offensive').forEach(e => { offMap[e.technique] = (offMap[e.technique] || 0) + 1; });
    AEV.filter(e => e.direction === 'defensive').forEach(e => { defMap[`${e.event_type}:${e.technique}`] = (defMap[`${e.event_type}:${e.technique}`] || 0) + 1; });
    const topOffense = Object.entries(offMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topWeaknesses = Object.entries(defMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, c]) => { const [t, n] = k.split(':'); return { type: t, name: n, count: c }; });

    const evBreak = {};
    MEV.forEach(e => { evBreak[e.event_type] = evBreak[e.event_type] || { off: 0, def: 0 }; evBreak[e.event_type][e.direction === 'offensive' ? 'off' : 'def']++; });

    // Streak
    let streak = 0;
    const dates = [...new Set(A.map(c => c.checked_in_at.split('T')[0]))].sort().reverse();
    const td = now.toISOString().split('T')[0], yd = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dates[0] === td || dates[0] === yd) { let cd = new Date(dates[0]); for (const x of dates) { if (x === cd.toISOString().split('T')[0]) { streak++; cd.setDate(cd.getDate() - 1); } else break; } }

    const techCats = {}; MT.forEach(t => techCats[t.category] = (techCats[t.category] || 0) + 1);
    const wE = M.filter(c => c.energy_rating); const avgE = wE.length ? (wE.reduce((s, c) => s + c.energy_rating, 0) / wE.length).toFixed(1) : null;
    const history = []; for (let i = 5; i >= 0; i--) { const dd = new Date(now.getFullYear(), now.getMonth() - i, 1); const pf = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`; history.push({ label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dd.getMonth()], sessions: A.filter(c => c.checked_in_at.startsWith(pf)).length }); }
    const avgRound = MR.length ? Math.round(MR.reduce((s, r) => s + (r.duration_seconds || 0), 0) / MR.length) : 0;

    // Auto-goals
    const autoGoals = (goals || []).map(g => {
      if (g.goal_type === 'manual') return g;
      const ps = getPeriodStart(g.period || 'all');
      let current = 0;
      if (g.goal_type === 'mat_hours') current = A.filter(c => new Date(c.checked_in_at) >= ps).reduce((s, c) => s + (c.duration_minutes || 0), 0) / 60;
      else if (g.goal_type === 'sessions') current = A.filter(c => new Date(c.checked_in_at) >= ps).length;
      else if (g.goal_type === 'rounds') current = AR.filter(r => new Date(r.started_at) >= ps).length;
      else if (g.goal_type === 'submissions') {
        const f = AEV.filter(e => e.direction === 'offensive' && e.event_type === 'submission' && new Date(e.created_at) >= ps);
        current = g.technique_filter ? f.filter(e => e.technique === g.technique_filter).length : f.length;
      }
      else if (g.goal_type === 'techniques') current = AT.filter(t => new Date(t.created_at) >= ps).length;
      const prog = g.target_value > 0 ? Math.min(Math.round((current / g.target_value) * 100), 100) : 0;
      return { ...g, progress: prog, _current: Math.round(current * 10) / 10, completed: prog >= 100 };
    });

    // Opponents
    const oppMap = {};
    RAll.forEach(r => {
      if (!r.opponent_id || !r.profiles) return;
      if (!oppMap[r.opponent_id]) oppMap[r.opponent_id] = { name: r.profiles.display_name, emoji: r.profiles.avatar_emoji, avatar_url: r.profiles.avatar_url, belt: r.profiles.belt, rounds: 0 };
      oppMap[r.opponent_id].rounds++;
    });
    const oppEvents = {};
    AEV.forEach(e => {
      const rd = AR.find(r => r.id === e.round_id);
      if (rd?.opponent_id) { oppEvents[rd.opponent_id] = oppEvents[rd.opponent_id] || { off: 0, def: 0 }; oppEvents[rd.opponent_id][e.direction === 'offensive' ? 'off' : 'def']++; }
    });
    const opponents = Object.entries(oppMap).map(([id, v]) => ({ id, ...v, off: oppEvents[id]?.off || 0, def: oppEvents[id]?.def || 0 })).sort((a, b) => b.rounds - a.rounds).slice(0, 8);

    // Techniques drilled grouped by day
    const techByDay = {};
    AT.slice(0, 30).forEach(t => {
      const day = t.created_at.split('T')[0];
      if (!techByDay[day]) techByDay[day] = [];
      techByDay[day].push(t);
    });

    setD({
      monthSessions: M.length, monthMin: M.reduce((s, c) => s + (c.duration_minutes || 0), 0), monthRounds: MR.length, avgRound, streak, avgE,
      weekly, submissions, topOffense, topWeaknesses, evBreak, techCats, techByDay, history,
      goals: autoGoals, beltHistory: bh || [], allRounds: AR.length, allEvents: AEV.length, allEventsData: AEV,
      weights: W, weightGoal: wGoal, activeInj: INJ.filter(i => !i.resolved_at), pastInj: INJ.filter(i => i.resolved_at).slice(0, 5), opponents,
    });
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  if (!d) return null;

  const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'training', label: 'Training' }, { id: 'rounds', label: 'Rounds' }, { id: 'body', label: 'Body' }];

  return (
    <div style={{ paddingTop: 20, paddingBottom: 100 }}>
      {/* HEADER */}
      <div className="wide-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Av p={profile} size={36} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, color: '#f0ece2' }}>{profile?.display_name}</h1>
            <div style={{ marginTop: 4 }}><BeltSVG belt={profile?.belt} stripes={profile?.stripes || 0} width={100} height={20} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{gym?.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {d.streak > 0 && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Streak</div><div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: '#ff6b35' }}>🔥{d.streak}d</div></div>}
          {d.avgE && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Energy</div><div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: '#26a69a' }}>{d.avgE}/5</div></div>}
        </div>
      </div>

      {/* TABS */}
      <div className="wide-container" style={{ borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>{TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 0', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: tab === t.id ? '#f0ece2' : 'var(--text-dim)', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.label}</button>)}</div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[{ l: 'Sessions', v: d.monthSessions, s: 'this month', c: '#64b5f6' }, { l: 'Hours', v: (d.monthMin / 60).toFixed(1), s: 'this month', c: '#ce93d8' }, { l: 'Rounds', v: d.monthRounds, s: 'this month', c: '#66bb6a' }, { l: 'Drilled', v: Object.values(d.techByDay).flat().length, s: 'techniques', c: '#ffb74d' }].map((s, i) => (
              <div key={i} className="card" style={{ padding: 16 }}><div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.l}</div><div style={{ fontFamily: 'var(--font-d)', fontSize: 28, color: s.c }}>{s.v}</div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.s}</div></div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="section-title">This Week</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>{d.weekly.map((w, i) => { const mx = Math.max(...d.weekly.map(x => x.minutes), 1); return (<div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>{w.minutes > 0 && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Math.round(w.minutes)}m</span>}<div style={{ width: '75%', height: w.minutes > 0 ? `${(w.minutes / mx) * 70}px` : 2, background: w.minutes > 0 ? 'linear-gradient(to top, #5a1f6e, #9b4dca)' : 'rgba(255,255,255,.04)', borderRadius: 4 }} /><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{w.label}</span></div>); })}</div>
            </div>
            <div className="card">
              <div className="section-title">Submissions</div>
              {d.submissions.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Log round events</div> : d.submissions.slice(0, 5).map((s, i) => (
                <div key={i} style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontSize: 12, color: '#ddd' }}>{s.name}</span><span style={{ fontSize: 11 }}><span style={{ color: '#66bb6a' }}>{s.off}</span>{s.def > 0 && <span style={{ color: '#ef5350', marginLeft: 4 }}>{s.def}</span>}</span></div><Bar value={s.off} max={d.submissions[0]?.off || 1} color={i === 0 ? '#9b4dca' : 'rgba(255,255,255,.12)'} /></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="section-title">Belt Journey</div>
              {d.beltHistory.length === 0 ? <div><BeltSVG belt={profile?.belt} stripes={profile?.stripes || 0} width={80} height={16} /><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Add in Settings</div></div> : d.beltHistory.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderLeft: `3px solid ${BELT_COLORS[b.belt]}`, paddingLeft: 8, marginBottom: 2 }}><BeltSVG belt={b.belt} stripes={b.stripes || 0} width={50} height={10} /><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{b.promoted_at}</span></div>
              ))}
            </div>
            <div className="card">
              <div className="section-title">Goals</div>
              {d.goals.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Set in Settings</div> : d.goals.map((g, i) => (
                <div key={i} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontSize: 12, color: g.completed ? '#66bb6a' : '#ccc' }}>{g.completed ? '✓ ' : ''}{g.title}</span><span style={{ fontSize: 11, color: g.completed ? '#66bb6a' : '#ce93d8' }}>{g._current !== undefined ? `${g._current}/${g.target_value}` : `${g.progress}%`}</span></div><Bar value={g.progress} max={100} color={g.completed ? '#66bb6a' : '#ce93d8'} /></div>
              ))}
            </div>
            <div className="card">
              <div className="section-title">6-Month Trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>{d.history.map((m, i) => { const mx = Math.max(...d.history.map(x => x.sessions), 1); return <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>{m.sessions > 0 && <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>{m.sessions}</span>}<div style={{ width: '100%', height: m.sessions > 0 ? `${(m.sessions / mx) * 50}px` : 2, background: i === d.history.length - 1 ? 'linear-gradient(to top, #1a5fb4, #64b5f6)' : 'rgba(255,255,255,.06)', borderRadius: 3 }} /><span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{m.label}</span></div>; })}</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TRAINING ═══ */}
      {tab === 'training' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="section-title">Techniques Drilled</div>
              {Object.keys(d.techByDay).length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16, textAlign: 'center' }}>Log techniques at checkout</div> : Object.entries(d.techByDay).slice(0, 7).map(([day, techs]) => (
                <div key={day} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, fontWeight: 600 }}>{new Date(day + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{techs.map((t, i) => (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, background: CAT_STYLE[t.category]?.bg || 'rgba(255,255,255,.04)', color: CAT_STYLE[t.category]?.color || '#aaa', border: `1px solid ${CAT_STYLE[t.category]?.color || '#444'}20` }}>{t.name}</span>
                  ))}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card">
                <div className="section-title">Categories</div>
                {Object.keys(d.techCats).length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</div> : Object.entries(d.techCats).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                  <div key={c} style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontSize: 11, color: CAT_STYLE[c]?.color }}>{CAT_STYLE[c]?.label || c}</span><span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{n}</span></div><Bar value={n} max={Math.max(...Object.values(d.techCats))} color={CAT_STYLE[c]?.color} /></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ROUNDS ═══ */}
      {tab === 'rounds' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[{ l: 'Total Rounds', v: d.allRounds, c: '#f0ece2' }, { l: 'Avg Duration', v: d.avgRound > 0 ? `${Math.floor(d.avgRound / 60)}:${String(d.avgRound % 60).padStart(2, '0')}` : '—', c: '#64b5f6' }, { l: 'Events', v: d.allEvents, c: '#ce93d8' }].map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}><div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{s.l}</div><div style={{ fontFamily: 'var(--font-d)', fontSize: 26, color: s.c }}>{s.v}</div></div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="section-title">Offense vs Defense</div>
              {Object.keys(d.evBreak).length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</div> : Object.entries(d.evBreak).map(([t, { off, def }]) => (
                <div key={t} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 12, color: CAT_STYLE[t]?.color }}>{CAT_STYLE[t]?.label || t}</span><span style={{ fontSize: 11 }}><span style={{ color: '#66bb6a' }}>+{off}</span> <span style={{ color: '#ef5350' }}>-{def}</span></span></div><div style={{ display: 'flex', gap: 3, height: 6 }}><div style={{ flex: off || 0.3, background: '#66bb6a', borderRadius: 3 }} /><div style={{ flex: def || 0.3, background: '#ef5350', borderRadius: 3 }} /></div></div>
              ))}
            </div>
            <div className="card" style={{ borderColor: 'rgba(239,83,80,.15)' }}>
              <div className="section-title" style={{ color: '#ef5350' }}>Work On</div>
              {d.topWeaknesses.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Log defensive events</div> : d.topWeaknesses.map((w, i) => (
                <div key={i} style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CategoryBadge category={w.type} size="small" /><span style={{ fontSize: 12, color: '#ddd' }}>{w.name}</span></div><span style={{ fontSize: 12, color: '#ef5350', fontFamily: 'var(--font-d)' }}>{w.count}×</span></div><Bar value={w.count} max={d.topWeaknesses[0]?.count || 1} color="#ef5350" /></div>
              ))}
            </div>
          </div>
          {d.opponents.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title">Sparring Partners</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {d.opponents.map((o, i) => (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <Av p={{ avatar_url: o.avatar_url, avatar_emoji: o.emoji }} size={24} />
                    <div style={{ fontSize: 12, color: '#ddd', margin: '4px 0' }}>{o.name?.split(' ')[0]}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{o.belt} · {o.rounds} rds</div>
                    <div style={{ fontSize: 11 }}><span style={{ color: '#66bb6a' }}>+{o.off}</span> <span style={{ color: '#ef5350' }}>-{o.def}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-title">Game Flow</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Thicker = more used. Tap a path for details. Submissions map from the position you picked during logging.</p>
            <TechTree events={d.allEventsData || []} />
          </div>
          {d.topOffense.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ color: '#66bb6a' }}>Best Moves</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>{d.topOffense.map(([n, c], i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: 10, border: i === 0 ? '1px solid rgba(102,187,106,.3)' : '1px solid var(--border)' }}><div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: i === 0 ? '#66bb6a' : '#f0ece2' }}>{c}</div><div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>{n}</div></div>
              ))}</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ BODY ═══ */}
      {tab === 'body' && (
        <div className="wide-container fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Weight</div>
            <WeightChart data={d.weights} goal={d.weightGoal} />
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ color: d.activeInj.length > 0 ? '#ef5350' : '#ccc' }}>
              {d.activeInj.length > 0 ? `🩹 Active Injuries (${d.activeInj.length})` : 'No Active Injuries'}
            </div>
            {d.activeInj.map((inj, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: inj.severity === 'serious' ? '#ef5350' : inj.severity === 'moderate' ? '#ffb74d' : '#66bb6a' }} />
                <div><div style={{ fontSize: 13, color: '#ddd' }}>{inj.body_part} — {inj.injury_type}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Since {inj.started_at} · {inj.severity}</div></div>
              </div>
            ))}
            {d.pastInj.length > 0 && (
              <div style={{ marginTop: 10 }}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Resolved</div>
                {d.pastInj.map((inj, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '2px 0' }}>{inj.body_part} — {inj.injury_type} ({inj.started_at} → {inj.resolved_at})</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
