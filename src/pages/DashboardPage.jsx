import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_META = { gi: { emoji: '🥋', color: '#7b2d8e', label: 'Gi' }, nogi: { emoji: '🩳', color: '#6ec6ff', label: 'No-Gi' }, open_mat: { emoji: '🤼', color: '#ff8a65', label: 'Open Mat' } };
const TECH_COLORS = { guard: '#ce93d8', passing: '#ff8a65', takedown: '#ffd700', submission: '#f44336', escape: '#a5d6a7', sweep: '#6ec6ff', other: '#888' };
const TECH_LABELS = { guard: '🛡️ Guard', passing: '🚀 Passing', takedown: '🤼 Takedown', submission: '🔒 Submission', escape: '🏃 Escape', sweep: '🔄 Sweep', other: '❓ Other' };

function Bar({ value, max, color = 'var(--accent)', h = 6 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: '100%', height: h, background: 'rgba(255,255,255,.06)', borderRadius: h / 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: h / 2, transition: 'width .6s ease' }} />
    </div>
  );
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
      { data: mt }, { data: at }, { data: goals }, { data: bh }, { data: badges },
      { data: mev }, { data: aev }
    ] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).gte('checked_in_at', ms).order('checked_in_at', { ascending: false }),
      supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).order('checked_in_at', { ascending: false }),
      supabase.from('rounds').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null).gte('started_at', ms),
      supabase.from('rounds').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null).order('started_at', { ascending: false }),
      supabase.from('techniques').select('*').eq('user_id', user.id).eq('gym_id', gym.id).gte('created_at', ms),
      supabase.from('techniques').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at'),
      supabase.from('belt_history').select('*').eq('user_id', user.id).order('promoted_at'),
      supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id).eq('gym_id', gym.id),
      supabase.from('round_events').select('*').eq('user_id', user.id).eq('gym_id', gym.id).gte('created_at', ms),
      supabase.from('round_events').select('*').eq('user_id', user.id).eq('gym_id', gym.id),
    ]);

    const M = mc || [], A = ac || [], MR = mr || [], AR = ar || [], MT = mt || [], AT = at || [];
    const MEV = mev || [], AEV = aev || [];

    const monthSessions = M.length;
    const monthMin = M.reduce((s, c) => s + (c.duration_minutes || 0), 0);
    const monthRounds = MR.length;
    const avgRound = MR.length ? Math.round(MR.reduce((s, r) => s + (r.duration_seconds || 0), 0) / MR.length) : 0;

    // Weekly
    const dow = (now.getDay() + 6) % 7;
    const ws = new Date(now); ws.setDate(now.getDate() - dow); ws.setHours(0, 0, 0, 0);
    const weekly = DAY_LABELS.map((l, i) => {
      const dd = new Date(ws); dd.setDate(ws.getDate() + i);
      const ds = dd.toISOString().split('T')[0];
      return { label: l, minutes: M.filter(c => c.checked_in_at.startsWith(ds)).reduce((s, c) => s + (c.duration_minutes || 0), 0) };
    });

    // Submissions from round_events (all time)
    const offSubs = AEV.filter(e => e.event_type === 'submission' && e.direction === 'offensive');
    const defSubs = AEV.filter(e => e.event_type === 'submission' && e.direction === 'defensive');
    const subMap = {};
    offSubs.forEach(e => { subMap[e.technique] = subMap[e.technique] || { got: 0, gave: 0 }; subMap[e.technique].got++; });
    defSubs.forEach(e => { subMap[e.technique] = subMap[e.technique] || { got: 0, gave: 0 }; subMap[e.technique].gave++; });
    const submissions = Object.entries(subMap).map(([name, v]) => ({ name, ...v, total: v.got + v.gave })).sort((a, b) => b.got - a.got).slice(0, 8);

    // Top offensive (what I do best)
    const offenseMap = {};
    AEV.filter(e => e.direction === 'offensive').forEach(e => {
      const key = `${e.event_type}:${e.technique}`;
      offenseMap[key] = (offenseMap[key] || 0) + 1;
    });
    const topOffense = Object.entries(offenseMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key, count]) => {
      const [type, tech] = key.split(':');
      return { type, technique: tech, count };
    });

    // Top defensive (what I get hit with = what to work on)
    const defenseMap = {};
    AEV.filter(e => e.direction === 'defensive').forEach(e => {
      const key = `${e.event_type}:${e.technique}`;
      defenseMap[key] = (defenseMap[key] || 0) + 1;
    });
    const topWeaknesses = Object.entries(defenseMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key, count]) => {
      const [type, tech] = key.split(':');
      return { type, technique: tech, count };
    });

    // Event type breakdown (this month)
    const evBreakdown = { submission: { off: 0, def: 0 }, sweep: { off: 0, def: 0 }, pass: { off: 0, def: 0 }, takedown: { off: 0, def: 0 }, escape: { off: 0, def: 0 } };
    MEV.forEach(e => {
      if (evBreakdown[e.event_type]) evBreakdown[e.event_type][e.direction === 'offensive' ? 'off' : 'def']++;
    });

    // Guard game
    const guardTechs = {};
    AT.filter(t => t.category === 'guard' || t.category === 'sweep').forEach(t => { guardTechs[t.name] = (guardTechs[t.name] || 0) + 1; });
    const guardGame = Object.entries(guardTechs).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const guardTotal = guardGame.reduce((s, [, v]) => s + v, 0) || 1;

    // Streak
    let streak = 0;
    const dates = [...new Set(A.map(c => c.checked_in_at.split('T')[0]))].sort().reverse();
    const td = now.toISOString().split('T')[0];
    const yd = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dates[0] === td || dates[0] === yd) {
      let cd = new Date(dates[0]);
      for (const x of dates) { if (x === cd.toISOString().split('T')[0]) { streak++; cd.setDate(cd.getDate() - 1); } else break; }
    }

    // Types
    const types = {};
    M.forEach(c => { types[c.session_type] = (types[c.session_type] || 0) + 1; });

    // Tech categories
    const techCats = {};
    MT.forEach(t => { techCats[t.category] = (techCats[t.category] || 0) + 1; });

    // Energy
    const withE = M.filter(c => c.energy_rating);
    const avgE = withE.length ? (withE.reduce((s, c) => s + c.energy_rating, 0) / withE.length).toFixed(1) : null;

    // 6mo
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pf = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`;
      history.push({ label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dd.getMonth()], sessions: A.filter(c => c.checked_in_at.startsWith(pf)).length });
    }

    setD({
      monthSessions, monthMin, monthRounds, avgRound, streak, avgE, weekly, submissions,
      topOffense, topWeaknesses, evBreakdown,
      types, techCats, techList: MT, guardGame, guardTotal, history,
      goals: goals || [], beltHistory: bh || [], badges: badges || [],
      allSessions: A.length, allMin: A.reduce((s, c) => s + (c.duration_minutes || 0), 0),
      allRounds: AR.length, allEvents: AEV.length,
    });
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  if (!d) return null;

  const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'training', label: 'Training' }, { id: 'rounds', label: 'Rounds' }];
  const EVT_LABELS = { submission: '🔒', sweep: '🔄', pass: '🚀', takedown: '🤼', escape: '🏃' };

  return (
    <div style={{ paddingTop: 20, paddingBottom: 100 }}>
      {/* ═══ HEADER ═══ */}
      <div className="wide-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{profile?.avatar_emoji || '🥋'}</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, color: '#f0ece2' }}>{profile?.display_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ width: 50, height: 8, borderRadius: 3, background: BELT_COLORS[profile?.belt] || '#888', position: 'relative' }}>
                <div style={{ position: 'absolute', right: 3, top: 1, display: 'flex', gap: 2 }}>
                  {[...Array(profile?.stripes || 0)].map((_, i) => <div key={i} style={{ width: 2, height: 6, background: '#f5f5f0', borderRadius: 1 }} />)}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{profile?.belt}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {gym?.name}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Streak</div><div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: d.streak > 0 ? '#ff6b35' : 'var(--text-muted)' }}>{d.streak > 0 ? `🔥${d.streak}d` : '—'}</div></div>
          {d.avgE && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Energy</div><div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: 'var(--pink)' }}>{d.avgE}</div></div>}
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="wide-container" style={{ borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 0', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? '#f0ece2' : 'var(--text-dim)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Sessions / Month', value: d.monthSessions, color: 'var(--blue)' },
              { label: 'Hours', value: (d.monthMin / 60).toFixed(1), sub: 'this month', color: 'var(--pink)' },
              { label: 'Sparring Rounds', value: d.monthRounds, sub: 'this month', color: 'var(--success)' },
              { label: 'Techniques', value: d.techList.length, sub: 'drilled this month', color: 'var(--orange)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 36, color: s.color }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Weekly */}
            <div className="card">
              <div className="section-title">Training This Week</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
                {d.weekly.map((w, i) => {
                  const mx = Math.max(...d.weekly.map(x => x.minutes), 1);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {w.minutes > 0 && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{Math.round(w.minutes)}m</span>}
                      <div style={{ width: '80%', height: w.minutes > 0 ? `${(w.minutes / mx) * 80}px` : 3, background: w.minutes > 0 ? 'linear-gradient(to top, #5a1f6e, #9b4dca)' : 'rgba(255,255,255,.05)', borderRadius: 5 }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Favorite submissions */}
            <div className="card">
              <div className="section-title">Favorite Submissions</div>
              {d.submissions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Log submissions in your rounds to see stats</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {d.submissions.slice(0, 5).map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#ddd' }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                          <span style={{ color: 'var(--success)' }}>{s.got}🔒</span>
                          {s.gave > 0 && <span style={{ color: '#ff6b6b', marginLeft: 6 }}>{s.gave}😤</span>}
                        </span>
                      </div>
                      <Bar value={s.got} max={d.submissions[0]?.got || 1} color={i === 0 ? 'var(--accent)' : i === 1 ? 'var(--blue)' : 'rgba(255,255,255,.15)'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* Belt progression */}
            <div className="card">
              <div className="section-title">Belt Progression</div>
              {d.beltHistory.length === 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <div style={{ width: 36, height: 10, borderRadius: 3, background: BELT_COLORS[profile?.belt], border: profile?.belt === 'white' ? '1px solid #555' : 'none' }} />
                    <span style={{ fontSize: 13, color: '#ccc', textTransform: 'capitalize' }}>{profile?.belt}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Add belt history in Settings →</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.beltHistory.map((b, i) => {
                    const next = d.beltHistory[i + 1];
                    const months = next ? Math.round((new Date(next.promoted_at) - new Date(b.promoted_at)) / (1000 * 60 * 60 * 24 * 30)) : null;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: `3px solid ${BELT_COLORS[b.belt]}`, paddingLeft: 10, padding: '6px 0 6px 10px' }}>
                        <div style={{ width: 30, height: 8, borderRadius: 3, background: BELT_COLORS[b.belt], border: b.belt === 'white' ? '1px solid #555' : 'none' }} />
                        <span style={{ fontSize: 13, color: '#ccc', textTransform: 'capitalize' }}>{b.belt}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.promoted_at} · {months ? `${months}mo` : 'ongoing'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Guard game */}
            <div className="card">
              <div className="section-title">Guard Game</div>
              {d.guardGame.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Log guard techniques to build your profile</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {d.guardGame.map(([name, count], i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: '#ccc' }}>{name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{Math.round((count / d.guardTotal) * 100)}%</span>
                      </div>
                      <Bar value={count} max={d.guardGame[0]?.[1] || 1} color={['#ce93d8', '#6ec6ff', '#ff6b6b', '#a5d6a7', '#ffd700', '#ff8a65'][i] || '#888'} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goals */}
            <div className="card">
              <div className="section-title">Goals</div>
              {d.goals.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add goals in Settings →</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {d.goals.map((g, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: g.completed ? 'var(--success)' : '#ccc' }}>{g.completed ? '✓ ' : ''}{g.title}</span>
                        <span style={{ fontSize: 12, color: g.completed ? 'var(--success)' : 'var(--pink)' }}>{g.progress}%</span>
                      </div>
                      <Bar value={g.progress} max={100} color={g.completed ? 'var(--success)' : 'var(--pink)'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TRAINING ═══ */}
      {tab === 'training' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card">
              <div className="section-title">Recently Drilled Techniques</div>
              {d.techList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>Log techniques at checkout to see them here</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.techList.slice(0, 12).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,.02)', borderRadius: 8, borderLeft: `3px solid ${TECH_COLORS[t.category] || '#555'}` }}>
                      <div>
                        <span style={{ fontSize: 14, color: '#ddd' }}>{t.name}</span>
                        <span style={{ fontSize: 11, color: TECH_COLORS[t.category], marginLeft: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: .5 }}>{t.category}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="section-title">Technique Breakdown</div>
                {Object.keys(d.techCats).length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(d.techCats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                      <div key={cat}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 12, color: '#ccc' }}>{TECH_LABELS[cat] || cat}</span><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{count}</span></div><Bar value={count} max={Math.max(...Object.values(d.techCats))} color={TECH_COLORS[cat] || '#888'} /></div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <div className="section-title">Session Types</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(d.types).sort((a, b) => b[1] - a[1]).map(([t, c]) => {
                    const m = TYPE_META[t] || {};
                    return <div key={t}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 12, color: '#ccc' }}>{m.emoji} {m.label || t}</span><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c}</span></div><Bar value={c} max={Math.max(...Object.values(d.types))} color={m.color || '#888'} /></div>;
                  })}
                </div>
              </div>
              <div className="card">
                <div className="section-title">6-Month Trend</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
                  {d.history.map((m, i) => {
                    const mx = Math.max(...d.history.map(x => x.sessions), 1);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        {m.sessions > 0 && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{m.sessions}</span>}
                        <div style={{ width: '100%', height: m.sessions > 0 ? `${(m.sessions / mx) * 50}px` : 3, background: i === d.history.length - 1 ? 'linear-gradient(to top, #1a5fb4, #6ec6ff)' : 'rgba(255,255,255,.08)', borderRadius: 4 }} />
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ROUNDS ═══ */}
      {tab === 'rounds' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Rounds', value: d.allRounds, color: '#f0ece2' },
              { label: 'Avg Duration', value: d.avgRound > 0 ? `${Math.floor(d.avgRound / 60)}m${d.avgRound % 60}s` : '—', color: 'var(--blue)' },
              { label: 'Events Logged', value: d.allEvents, color: 'var(--pink)' },
              { label: 'This Month', value: d.monthRounds, sub: 'rounds', color: 'var(--success)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Event type breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card">
              <div className="section-title">This Month — Offense vs Defense</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(d.evBreakdown).map(([type, { off, def }]) => (
                  <div key={type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#ddd' }}>{EVT_LABELS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}s</span>
                      <span style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--success)' }}>{off} ✅</span>
                        <span style={{ color: '#ff6b6b', marginLeft: 8 }}>{def} 😤</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, height: 8 }}>
                      <div style={{ flex: off || 0.5, background: 'var(--success)', borderRadius: 4, transition: 'flex .4s' }} />
                      <div style={{ flex: def || 0.5, background: '#ff6b6b', borderRadius: 4, transition: 'flex .4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What to work on */}
            <div className="card" style={{ border: '1px solid rgba(255,107,107,.2)' }}>
              <div className="section-title" style={{ color: '#ff6b6b' }}>⚠️ What To Work On</div>
              {d.topWeaknesses.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Log round events to see your weaknesses</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {d.topWeaknesses.map((w, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#ddd' }}>{EVT_LABELS[w.type]} {w.technique}</span>
                        <span style={{ fontSize: 13, color: '#ff6b6b', fontFamily: 'var(--font-d)' }}>{w.count}×</span>
                      </div>
                      <Bar value={w.count} max={d.topWeaknesses[0]?.count || 1} color="#ff6b6b" />
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>These are the techniques used against you most often. Focus your defense training here.</div>
                </div>
              )}
            </div>
          </div>

          {/* Best moves */}
          <div className="card">
            <div className="section-title" style={{ color: 'var(--success)' }}>💪 Your Best Moves</div>
            {d.topOffense.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Log offensive events in rounds to see your go-to moves</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {d.topOffense.map((m, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 10px', border: i === 0 ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                    <div style={{ fontSize: 20 }}>{EVT_LABELS[m.type]}</div>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, color: i === 0 ? 'var(--success)' : '#f0ece2', margin: '4px 0' }}>{m.count}</div>
                    <div style={{ fontSize: 12, color: '#ccc' }}>{m.technique}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
