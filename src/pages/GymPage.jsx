import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const SORTS = [{ id: 'total_sessions', label: 'Sessions' }, { id: 'total_minutes', label: 'Hours' }, { id: 'unique_days', label: 'Days' }];

export default function GymPage() {
  const { user, gym } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('total_sessions');
  const [members, setMembers] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (gym) loadData(); }, [gym, sortBy]);

  async function loadData() {
    const { data: lb } = await supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id);
    setLeaderboard((lb || []).sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)));
    const { data: mem } = await supabase.from('gym_members').select('user_id').eq('gym_id', gym.id);
    setMembers(mem || []);
    const { data: live } = await supabase.from('checkins').select('id').eq('gym_id', gym.id).is('checked_out_at', null);
    setLiveCount((live || []).length);
    setLoading(false);
  }

  const medals = ['🥇', '🥈', '🥉'];
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400 }}>{gym?.name}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>
          <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          {liveCount > 0 && <span style={{ color: 'var(--success)' }}>🟢 {liveCount} on the mat</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Invite Code</div>
          <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: 4, color: showCode ? '#f0ece2' : 'var(--text-muted)', marginTop: 4 }}>
            {showCode ? gym?.invite_code : '••••••'}
          </div>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => { if (showCode) navigator.clipboard?.writeText(gym?.invite_code); setShowCode(!showCode); }}>
          {showCode ? '📋 Copy' : '👁️ Show'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SORTS.map(o => (
          <button key={o.id} onClick={() => setSortBy(o.id)} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: sortBy === o.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
            color: sortBy === o.id ? '#fff' : 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{o.label}</button>
        ))}
      </div>

      <div className="section-title">Leaderboard — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>

      {leaderboard.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No sessions this month yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaderboard.map((e, i) => {
            const isMe = e.user_id === user.id;
            return (
              <div key={e.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: isMe ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 14, color: 'var(--text-dim)', fontWeight: 700 }}>{i < 3 ? medals[i] : i + 1}</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ fontSize: 28 }}>{e.avatar_emoji || '🥋'}</span>
                  <div className="belt-dot" style={{ position: 'absolute', bottom: -2, right: -2, background: BELT_COLORS[e.belt] || '#888', border: e.belt === 'white' ? '1px solid #555' : '2px solid var(--bg)', width: 12, height: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: isMe ? '#f0ece2' : '#ccc' }}>{e.display_name} {isMe && <span style={{ fontSize: 11, color: 'var(--accent)' }}>(you)</span>}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.gi_sessions}🥋 {e.nogi_sessions}🩳 {e.open_mat_sessions}🤼</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontFamily: 'var(--font-d)', color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : '#f0ece2' }}>
                    {sortBy === 'total_minutes' ? `${(e.total_minutes / 60).toFixed(1)}h` : sortBy === 'unique_days' ? `${e.unique_days}d` : e.total_sessions}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{SORTS.find(o => o.id === sortBy)?.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
