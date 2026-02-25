import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPE_META = { gi: { emoji: '🥋', color: '#7b2d8e' }, nogi: { emoji: '🩳', color: '#6ec6ff' }, open_mat: { emoji: '🤼', color: '#ff8a65' }, comp_class: { emoji: '🏆', color: '#ffd700' }, private: { emoji: '🎯', color: '#a5d6a7' } };

function MiniBar({ value, max = 100, color = 'var(--accent)', height = 6 }) {
  return (
    <div style={{ width: '100%', height, background: 'rgba(255,255,255,.06)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width .6s ease' }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user, gym, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user && gym) loadDashboard(); }, [user, gym]);

  async function loadDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek); weekStart.setHours(0, 0, 0, 0);

    // This month's checkins (completed)
    const { data: monthCheckins } = await supabase.from('checkins').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id)
      .not('checked_out_at', 'is', null)
      .gte('checked_in_at', monthStart)
      .order('checked_in_at', { ascending: false });

    // All-time checkins
    const { data: allCheckins } = await supabase.from('checkins').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id)
      .not('checked_out_at', 'is', null)
      .order('checked_in_at', { ascending: false });

    // Rounds this month
    const { data: monthRounds } = await supabase.from('rounds').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id)
      .not('ended_at', 'is', null)
      .gte('started_at', monthStart);

    // All-time rounds
    const { data: allRounds } = await supabase.from('rounds').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id)
      .not('ended_at', 'is', null);

    // Badges
    const { data: badges } = await supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id).eq('gym_id', gym.id);

    // Compute stats
    const mc = monthCheckins || [];
    const ac = allCheckins || [];
    const mr = monthRounds || [];
    const ar = allRounds || [];
    const bd = badges || [];

    const monthSessions = mc.length;
    const monthMinutes = mc.reduce((s, c) => s + (c.duration_minutes || 0), 0);
    const monthRoundCount = mr.length;
    const avgRoundDuration = mr.length > 0 ? Math.round(mr.reduce((s, r) => s + (r.duration_seconds || 0), 0) / mr.length) : 0;

    const allTimeSessions = ac.length;
    const allTimeMinutes = ac.reduce((s, c) => s + (c.duration_minutes || 0), 0);
    const allTimeRounds = ar.length;

    // Session type breakdown
    const typeBreakdown = {};
    mc.forEach(c => { typeBreakdown[c.session_type] = (typeBreakdown[c.session_type] || 0) + 1; });

    // Weekly data
    const weekly = DAY_LABELS.map((label, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const daySessions = mc.filter(c => c.checked_in_at.startsWith(ds));
      const totalMin = daySessions.reduce((s, c) => s + (c.duration_minutes || 0), 0);
      return { label, sessions: daySessions.length, minutes: totalMin };
    });

    // Time of day distribution
    const hourBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    mc.forEach(c => {
      const h = new Date(c.checked_in_at).getHours();
      if (h >= 6 && h < 12) hourBuckets.morning++;
      else if (h >= 12 && h < 17) hourBuckets.afternoon++;
      else if (h >= 17 && h < 21) hourBuckets.evening++;
      else hourBuckets.night++;
    });

    // Streak calculation
    let streak = 0;
    const checkinDates = [...new Set(ac.map(c => c.checked_in_at.split('T')[0]))].sort().reverse();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (checkinDates[0] === today || checkinDates[0] === yesterday) {
      let checkDate = new Date(checkinDates[0]);
      for (const d of checkinDates) {
        if (d === checkDate.toISOString().split('T')[0]) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
        else break;
      }
    }

    // Recent 8 sessions
    const recent = ac.slice(0, 8);

    // Energy average
    const withEnergy = mc.filter(c => c.energy_rating);
    const avgEnergy = withEnergy.length > 0 ? (withEnergy.reduce((s, c) => s + c.energy_rating, 0) / withEnergy.length).toFixed(1) : null;

    // Monthly history (last 6 months)
    const monthlyHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = ac.filter(c => c.checked_in_at.startsWith(prefix)).length;
      const mins = ac.filter(c => c.checked_in_at.startsWith(prefix)).reduce((s, c) => s + (c.duration_minutes || 0), 0);
      monthlyHistory.push({ label: MONTH_NAMES[d.getMonth()], sessions: count, minutes: mins });
    }

    setStats({
      monthSessions, monthMinutes, monthRoundCount, avgRoundDuration,
      allTimeSessions, allTimeMinutes, allTimeRounds,
      typeBreakdown, weekly, hourBuckets, streak, recent, avgEnergy, badges: bd, monthlyHistory,
    });
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading dashboard...</div>;
  if (!stats) return null;

  const maxWeekMin = Math.max(...stats.weekly.map(d => d.minutes), 1);
  const maxMonthSessions = Math.max(...stats.monthlyHistory.map(m => m.sessions), 1);
  const maxType = Math.max(...Object.values(stats.typeBreakdown), 1);
  const totalHourBuckets = Object.values(stats.hourBuckets).reduce((a, b) => a + b, 1);

  return (
    <div className="wide-container" style={{ paddingTop: 24, paddingBottom: 100 }}>

      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>{profile?.avatar_emoji || '🥋'}</span>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 400, color: '#f0ece2' }}>{profile?.display_name}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 10, borderRadius: 3, background: BELT_COLORS[profile?.belt] || '#888', border: profile?.belt === 'white' ? '1px solid #555' : 'none', boxShadow: `0 0 8px ${BELT_COLORS[profile?.belt]}33` }} />
            <span style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{profile?.belt} — {profile?.stripes} stripe{profile?.stripes !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{gym?.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Streak</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: stats.streak > 0 ? '#ff6b35' : 'var(--text-muted)' }}>
              {stats.streak > 0 ? `🔥 ${stats.streak}d` : '—'}
            </div>
          </div>
          {stats.avgEnergy && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Avg Energy</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: 'var(--pink)' }}>{stats.avgEnergy}/5</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Sessions', value: stats.monthSessions, sub: 'this month', color: 'var(--blue)' },
          { label: 'Hours', value: (stats.monthMinutes / 60).toFixed(1), sub: 'this month', color: 'var(--pink)' },
          { label: 'Rounds', value: stats.monthRoundCount, sub: stats.avgRoundDuration > 0 ? `avg ${Math.floor(stats.avgRoundDuration / 60)}m${stats.avgRoundDuration % 60}s` : 'this month', color: 'var(--success)' },
          { label: 'All Time', value: stats.allTimeSessions, sub: `${(stats.allTimeMinutes / 60).toFixed(0)}h total`, color: '#f0ece2' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '18px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 32, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── TWO COLUMN ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Weekly chart */}
        <div className="card">
          <div className="section-title">This Week</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {stats.weekly.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {d.minutes > 0 && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Math.round(d.minutes)}m</span>}
                <div style={{
                  width: '100%', maxWidth: 32,
                  height: d.minutes > 0 ? `${(d.minutes / maxWeekMin) * 70}px` : 3,
                  background: d.minutes > 0 ? 'linear-gradient(to top, #5a1f6e, #7b2d8e)' : 'rgba(255,255,255,.05)',
                  borderRadius: 5, transition: 'height .4s ease',
                }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Session type breakdown */}
        <div className="card">
          <div className="section-title">Session Types</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(stats.typeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const meta = TYPE_META[type] || { emoji: '❓', color: '#888' };
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#ccc' }}>{meta.emoji} {type.replace('_', ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{count}</span>
                  </div>
                  <MiniBar value={count} max={maxType} color={meta.color} />
                </div>
              );
            })}
            {Object.keys(stats.typeBreakdown).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sessions this month yet</div>}
          </div>
        </div>
      </div>

      {/* ─── THREE COLUMN ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Monthly history */}
        <div className="card">
          <div className="section-title">6-Month Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {stats.monthlyHistory.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {m.sessions > 0 && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{m.sessions}</span>}
                <div style={{
                  width: '100%',
                  height: m.sessions > 0 ? `${(m.sessions / maxMonthSessions) * 55}px` : 3,
                  background: i === stats.monthlyHistory.length - 1 ? 'linear-gradient(to top, #1a5fb4, #6ec6ff)' : 'rgba(255,255,255,.08)',
                  borderRadius: 4,
                }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time of day */}
        <div className="card">
          <div className="section-title">When You Train</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: '🌅 Morning', key: 'morning', color: '#ffd700' },
              { label: '☀️ Afternoon', key: 'afternoon', color: '#ff8a65' },
              { label: '🌆 Evening', key: 'evening', color: '#ce93d8' },
              { label: '🌙 Night', key: 'night', color: '#6ec6ff' },
            ].map(t => (
              <div key={t.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: '#ccc' }}>{t.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{stats.hourBuckets[t.key]}</span>
                </div>
                <MiniBar value={stats.hourBuckets[t.key]} max={totalHourBuckets} color={t.color} height={4} />
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="card">
          <div className="section-title">Badges</div>
          {stats.badges.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.badges.map((b, i) => (
                <div key={i} className="badge-pill">
                  <span>{b.badges?.emoji}</span>
                  <span>{b.badges?.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No badges yet. Keep training!</div>
          )}
        </div>
      </div>

      {/* ─── RECENT SESSIONS ─── */}
      <div className="card">
        <div className="section-title">Recent Sessions</div>
        {stats.recent.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 20 }}>No sessions yet. Hit that Check In button!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.recent.map((c, i) => {
              const meta = TYPE_META[c.session_type] || {};
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,.02)', borderRadius: 8, borderLeft: `3px solid ${meta.color || '#555'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{meta.emoji}</span>
                    <div>
                      <span style={{ fontSize: 13, color: '#ddd', textTransform: 'capitalize' }}>{c.session_type.replace('_', ' ')}</span>
                      {c.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.note}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, color: '#ccc', fontFamily: 'var(--font-d)' }}>
                      {c.duration_minutes ? `${Math.round(c.duration_minutes)}m` : '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      {c.energy_rating && <span style={{ fontSize: 12 }}>{['', '😵', '😮‍💨', '😐', '😊', '🔥'][c.energy_rating]}</span>}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {new Date(c.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
