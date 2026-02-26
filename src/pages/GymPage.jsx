import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const SORTS = [{ id: 'total_sessions', label: 'Sessions' },{ id: 'total_minutes', label: 'Hours' },{ id: 'unique_days', label: 'Days' }];

function Avatar({ entry, size = 36 }) {
  const s = { width: size, height: size, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: `2px solid ${BELT_COLORS[entry.belt]||'#333'}` };
  if (entry.avatar_url) return <div style={s}><img src={entry.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>;
  const init = (entry.display_name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  return <div style={{ ...s, fontSize: size*0.38, fontWeight: 700, color: 'var(--text-dim)' }}>{init}</div>;
}

export default function GymPage() {
  const { user, gym } = useAuth();
  const [lb, setLb] = useState([]);
  const [sort, setSort] = useState('total_sessions');
  const [members, setMembers] = useState([]);
  const [live, setLive] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (gym) loadData(); }, [gym, sort]);

  async function loadData() {
    const { data: l } = await supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id);
    setLb((l||[]).sort((a,b) => (b[sort]||0)-(a[sort]||0)));
    const { data: m } = await supabase.from('gym_members').select('user_id').eq('gym_id', gym.id);
    setMembers(m||[]);
    const { data: li } = await supabase.from('checkins').select('id').eq('gym_id', gym.id).is('checked_out_at', null);
    setLive((li||[]).length);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400 }}>{gym?.name}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>
          <span>{members.length} member{members.length!==1?'s':''}</span>
          {live > 0 && <span style={{ color: 'var(--success)' }}>● {live} training now</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Invite Code</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: showCode ? '#f0ece2' : 'var(--text-muted)', marginTop: 4 }}>
            {showCode ? gym?.invite_code : '••••••'}
          </div>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => { if(showCode) navigator.clipboard?.writeText(gym?.invite_code); setShowCode(!showCode); }}>
          {showCode ? 'Copy' : 'Show'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {SORTS.map(o => (
          <button key={o.id} onClick={() => setSort(o.id)} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: sort===o.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
            color: sort===o.id ? '#fff' : 'var(--text-dim)', fontSize: 12, fontWeight: 600,
          }}>{o.label}</button>
        ))}
      </div>

      <div className="section-title">{new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>

      {lb.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No sessions this month yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lb.map((e,i) => {
            const isMe = e.user_id === user.id;
            const val = sort==='total_minutes' ? `${(e.total_minutes/60).toFixed(1)}h` : sort==='unique_days' ? `${e.unique_days} days` : `${e.total_sessions} sessions`;
            return (
              <div key={e.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: isMe ? 'rgba(123,45,142,.08)' : 'rgba(255,255,255,.015)',
                border: isMe ? '1px solid rgba(123,45,142,.3)' : '1px solid var(--border)',
                borderRadius: 12,
              }}>
                <div style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 700, color: i===0 ? 'var(--gold)' : i===1 ? '#c0c0c0' : i===2 ? '#cd7f32' : 'var(--text-muted)' }}>
                  {i + 1}
                </div>
                <Avatar entry={e} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: isMe ? '#f0ece2' : '#ccc' }}>
                    {e.display_name} {isMe && <span style={{ fontSize: 11, color: 'var(--accent)' }}>you</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {e.gi_sessions} gi · {e.nogi_sessions} no-gi · {e.open_mat_sessions} open mat
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontFamily: 'var(--font-d)', color: '#f0ece2' }}>{val}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
