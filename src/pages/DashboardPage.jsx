import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_META = { gi: { emoji: '🥋', color: '#7b2d8e', label: 'Gi' }, nogi: { emoji: '🩳', color: '#6ec6ff', label: 'No-Gi' }, open_mat: { emoji: '🤼', color: '#ff8a65', label: 'Open Mat' } };
const TECH_COLORS = { guard: '#ce93d8', passing: '#ff8a65', takedown: '#ffd700', submission: '#f44336', escape: '#a5d6a7', sweep: '#6ec6ff', other: '#888' };
const TECH_LABELS = { guard: '🛡️ Guard', passing: '🚀 Passing', takedown: '🤼 Takedown', submission: '🔒 Submission', escape: '🏃 Escape', sweep: '🔄 Sweep', other: '❓ Other' };

function Bar({ value, max, color = 'var(--accent)', h = 6 }) {
  return (
    <div style={{ width: '100%', height: h, background: 'rgba(255,255,255,.06)', borderRadius: h / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / (max || 1)) * 100, 100)}%`, height: '100%', background: color, borderRadius: h / 2, transition: 'width .6s ease' }} />
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
      { data: mt }, { data: at }, { data: goals }, { data: bh }, { data: badges }
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
    ]);

    const M = mc || [], A = ac || [], MR = mr || [], AR = ar || [], MT = mt || [], AT = at || [];

    // Stats
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
      const ss = M.filter(c => c.checked_in_at.startsWith(ds));
      return { label: l, minutes: ss.reduce((s, c) => s + (c.duration_minutes || 0), 0), sessions: ss.length };
    });

    // Submissions
    const subMap = {};
    AR.forEach(r => {
      if (r.submission_name) {
        const key = r.submission_name;
        subMap[key] = (subMap[key] || { got: 0, gave: 0 });
        if (r.result === 'submission') subMap[key].got++;
        else if (r.result === 'got_submitted') subMap[key].gave++;
      }
    });
    const submissions = Object.entries(subMap).map(([name, v]) => ({ name, ...v, total: v.got + v.gave })).sort((a, b) => b.total - a.total).slice(0, 8);

    // Guard game (from techniques in guard/sweep categories)
    const guardTechs = {};
    AT.filter(t => t.category === 'guard' || t.category === 'sweep').forEach(t => {
      guardTechs[t.name] = (guardTechs[t.name] || 0) + 1;
    });
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

    // Type breakdown
    const types = {};
    M.forEach(c => { types[c.session_type] = (types[c.session_type] || 0) + 1; });

    // Technique categories
    const techCats = {};
    MT.forEach(t => { techCats[t.category] = (techCats[t.category] || 0) + 1; });
    const techList = MT;

    // Energy
    const withE = M.filter(c => c.energy_rating);
    const avgE = withE.length ? (withE.reduce((s, c) => s + c.energy_rating, 0) / withE.length).toFixed(1) : null;

    // 6mo history
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pf = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`;
      const cnt = A.filter(c => c.checked_in_at.startsWith(pf)).length;
      history.push({ label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dd.getMonth()], sessions: cnt });
    }

    // Round results
    const roundResults = { submission: 0, got_submitted: 0, sweep: 0, got_swept: 0, positional: 0 };
    MR.forEach(r => { if (r.result && roundResults[r.result] !== undefined) roundResults[r.result]++; });

    setD({
      monthSessions, monthMin, monthRounds, avgRound, streak, avgE, weekly, submissions, guardGame, guardTotal,
      types, techCats, techList, history, roundResults, goals: goals || [], beltHistory: bh || [], badges: badges || [],
      allSessions: A.length, allMin: A.reduce((s, c) => s + (c.duration_minutes || 0), 0), allRounds: AR.length,
    });
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  if (!d) return null;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'training', label: 'Training' },
    { id: 'competition', label: 'Rounds' },
  ];

  return (
    <div style={{ paddingTop: 20, paddingBottom: 100 }}>
      {/* ═══ HEADER ═══ */}
      <div className="wide-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{profile?.avatar_emoji || '🥋'}</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, color: '#f0ece2' }}>{profile?.display_name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ width: 50, height: 8, borderRadius: 3, background: BELT_COLORS[profile?.belt] || '#888', boxShadow: `0 0 8px ${BELT_COLORS[profile?.belt]}33` }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2, padding: '1px 3px' }}>
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
              color: tab === t.id ? '#f0ece2' : 'var(--text-dim)', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all .2s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="wide-container fade-in">
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Sessions / Month', value: d.monthSessions, sub: `+${d.monthSessions} vs last`, color: 'var(--blue)' },
              { label: 'Hours', value: (d.monthMin / 60).toFixed(1), sub: 'this month', color: 'var(--pink)' },
              { label: 'Sparring Rounds', value: d.monthRounds, sub: 'this month', color: 'var(--success)' },
              { label: 'Techniques', value: d.techList?.length || 0, sub: 'drilled this month', color: 'var(--orange)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 36, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Two column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Weekly chart */}
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
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Log submissions in your rounds to see stats here</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {d.submissions.slice(0, 5).map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#ddd' }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.total} ({Math.round((s.total / (d.submissions.reduce((a, b) => a + b.total, 0) || 1)) * 100)}%)</span>
                      </div>
                      <Bar value={s.total} max={d.submissions[0]?.total || 1} color={i === 0 ? 'var(--accent)' : i === 1 ? 'var(--blue)' : 'rgba(255,255,255,.15)'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Three column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Belt progression */}
            <div className="card">
              <div className="section-title">Belt Progression</div>
              {d.beltHistory.length === 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <div style={{ width: 36, height: 10, borderRadius: 3, background: BELT_COLORS[profile?.belt], border: profile?.belt === 'white' ? '1px solid #555' : 'none' }} />
                    <span style={{ fontSize: 13, color: '#ccc', textTransform: 'capitalize' }}>{profile?.belt}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>current</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Add your belt history in Settings</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.beltHistory.map((b, i) => {
                    const next = d.beltHistory[i + 1];
                    const months = next ? Math.round((new Date(next.promoted_at) - new Date(b.promoted_at)) / (1000 * 60 * 60 * 24 * 30)) : null;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderLeft: `3px solid ${BELT_COLORS[b.belt]}`, paddingLeft: 10 }}>
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
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Drill guard techniques to build your profile</div>
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
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add goals in Settings to track your progress</div>
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

      {/* ═══ TRAINING TAB ═══ */}
      {tab === 'training' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Techniques list */}
            <div className="card">
              <div className="section-title">Recently Drilled Techniques</div>
              {d.techList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>Techniques you log after sessions will appear here</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.techList.slice(0, 12).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,.02)', borderRadius: 8, borderLeft: `3px solid ${TECH_COLORS[t.category] || '#555'}` }}>
                      <div>
                        <span style={{ fontSize: 14, color: '#ddd' }}>{t.name}</span>
                        <span style={{ fontSize: 11, color: TECH_COLORS[t.category], marginLeft: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>{t.category}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tech categories */}
              <div className="card">
                <div className="section-title">Technique Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(d.techCats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: '#ccc' }}>{TECH_LABELS[cat] || cat}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{count}</span>
                      </div>
                      <Bar value={count} max={Math.max(...Object.values(d.techCats))} color={TECH_COLORS[cat] || '#888'} />
                    </div>
                  ))}
                  {Object.keys(d.techCats).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No techniques logged yet</div>}
                </div>
              </div>

              {/* Session types */}
              <div className="card">
                <div className="section-title">Session Types</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(d.types).sort((a, b) => b[1] - a[1]).map(([t, c]) => {
                    const m = TYPE_META[t] || {};
                    return (
                      <div key={t}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: '#ccc' }}>{m.emoji} {m.label || t}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c}</span>
                        </div>
                        <Bar value={c} max={Math.max(...Object.values(d.types))} color={m.color || '#888'} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6 month trend */}
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

      {/* ═══ ROUNDS TAB ═══ */}
      {tab === 'competition' && (
        <div className="wide-container fade-in">
          {/* Round stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Rounds', value: d.allRounds, color: '#f0ece2' },
              { label: 'Submissions', value: d.roundResults.submission, color: 'var(--success)' },
              { label: 'Got Submitted', value: d.roundResults.got_submitted, color: '#ff6b6b' },
              { label: 'Avg Duration', value: d.avgRound > 0 ? `${Math.floor(d.avgRound / 60)}m${d.avgRound % 60}s` : '—', color: 'var(--blue)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 32, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Submission stats */}
            <div className="card">
              <div className="section-title">Submission Breakdown</div>
              {d.submissions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>End rounds with submission details to build your stats</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                  {d.submissions.map((s, i) => (
                    <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 10px', border: i === 0 ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                      <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, color: i === 0 ? 'var(--success)' : '#f0ece2' }}>{s.total}</div>
                      <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>🔒{s.got} 😤{s.gave}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Round results breakdown */}
            <div className="card">
              <div className="section-title">Round Results (This Month)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: '🔒 I Submitted', val: d.roundResults.submission, color: 'var(--success)' },
                  { label: '😤 Got Submitted', val: d.roundResults.got_submitted, color: '#ff6b6b' },
                  { label: '🔄 I Swept', val: d.roundResults.sweep, color: 'var(--blue)' },
                  { label: '🔄 Got Swept', val: d.roundResults.got_swept, color: 'var(--orange)' },
                  { label: '♟️ Positional', val: d.roundResults.positional, color: 'var(--text-dim)' },
                ].map((r, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#ccc' }}>{r.label}</span>
                      <span style={{ fontSize: 13, color: r.color, fontFamily: 'var(--font-d)' }}>{r.val}</span>
                    </div>
                    <Bar value={r.val} max={Math.max(...Object.values(d.roundResults), 1)} color={r.color} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
