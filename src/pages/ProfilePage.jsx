import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BeltSVG } from '../components/Belt';

const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const AVATARS = ['🥋', '🦁', '🐍', '🦅', '🐙', '🦈', '🐺', '🦍', '🔥', '💀', '👊', '⚡'];
const GOAL_TYPES = [
  { id: 'manual', label: 'Manual' },
  { id: 'mat_hours', label: 'Mat Hours' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'techniques', label: 'Techniques Drilled' },
];
const PERIODS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'semester', label: 'This Semester' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

export default function ProfilePage() {
  const { user, profile, gym, gymRole, signOut, refreshData } = useAuth();
  const [dn, setDn] = useState(profile?.display_name || '');
  const [belt, setBelt] = useState(profile?.belt || 'white');
  const [stripes, setStripes] = useState(profile?.stripes || 0);
  const [emoji, setEmoji] = useState(profile?.avatar_emoji || '🥋');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goals, setGoals] = useState([]);
  const [beltHist, setBeltHist] = useState([]);
  const [badges, setBadges] = useState([]);
  const [members, setMembers] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [weights, setWeights] = useState([]);

  // Goal form
  const [gTitle, setGTitle] = useState('');
  const [gType, setGType] = useState('manual');
  const [gTarget, setGTarget] = useState('');
  const [gPeriod, setGPeriod] = useState('semester');
  const [gTechFilter, setGTechFilter] = useState('');

  // Belt form
  const [bhBelt, setBhBelt] = useState('white');
  const [bhDate, setBhDate] = useState('');

  // Weight form
  const [wKg, setWKg] = useState('');
  const [wDate, setWDate] = useState(new Date().toISOString().split('T')[0]);

  // Badge form
  const [newBadge, setNewBadge] = useState('');
  const [newBadgeE, setNewBadgeE] = useState('🏅');
  const [awardB, setAwardB] = useState('');
  const [awardU, setAwardU] = useState('');

  const isOwner = gymRole === 'owner';

  useEffect(() => { loadAll(); }, [user, gym]);

  async function loadAll() {
    if (!user || !gym) return;
    const [{ data: g }, { data: bh }, { data: inj }, { data: w }] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at'),
      supabase.from('belt_history').select('*').eq('user_id', user.id).order('promoted_at'),
      supabase.from('injuries').select('*').eq('user_id', user.id).is('resolved_at', null).order('started_at', { ascending: false }),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10),
    ]);
    setGoals(g || []); setBeltHist(bh || []); setInjuries(inj || []); setWeights(w || []);
    if (isOwner) {
      const [{ data: b }, { data: m }] = await Promise.all([
        supabase.from('badges').select('*').eq('gym_id', gym.id),
        supabase.from('gym_members').select('user_id, role, profiles(display_name, avatar_emoji)').eq('gym_id', gym.id),
      ]);
      setBadges(b || []); setMembers(m || []);
    }
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true);
    await supabase.from('profiles').update({ display_name: dn, belt, stripes: parseInt(stripes), avatar_emoji: emoji }).eq('id', user.id);
    await refreshData(); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  // Goals
  async function addGoal(e) {
    e.preventDefault();
    const title = gTitle.trim() || `${GOAL_TYPES.find(t => t.id === gType)?.label} goal`;
    await supabase.from('goals').insert({
      user_id: user.id, gym_id: gym.id, title,
      goal_type: gType, target_value: gType !== 'manual' ? parseFloat(gTarget) || 0 : null,
      period: gType !== 'manual' ? gPeriod : 'all',
      technique_filter: gType === 'submissions' && gTechFilter.trim() ? gTechFilter.trim() : null,
    });
    setGTitle(''); setGTarget(''); setGTechFilter(''); setGType('manual'); loadAll();
  }
  async function updateGoalProgress(id, progress) { await supabase.from('goals').update({ progress, completed: progress >= 100 }).eq('id', id); loadAll(); }
  async function deleteGoal(id) { await supabase.from('goals').delete().eq('id', id); loadAll(); }

  // Belt
  async function addBeltHistory(e) { e.preventDefault(); if (!bhDate) return; await supabase.from('belt_history').insert({ user_id: user.id, belt: bhBelt, promoted_at: bhDate }); setBhBelt('white'); setBhDate(''); loadAll(); }
  async function deleteBeltHistory(id) { await supabase.from('belt_history').delete().eq('id', id); loadAll(); }

  // Weight
  async function addWeight(e) { e.preventDefault(); if (!wKg) return; await supabase.from('weight_logs').insert({ user_id: user.id, weight_kg: parseFloat(wKg), logged_at: wDate }); setWKg(''); loadAll(); }

  // Injuries
  async function resolveInjury(id) { await supabase.from('injuries').update({ resolved_at: new Date().toISOString().split('T')[0] }).eq('id', id); loadAll(); }
  async function deleteInjury(id) { await supabase.from('injuries').delete().eq('id', id); loadAll(); }

  // Badges
  async function createBadge(e) { e.preventDefault(); if (!newBadge.trim()) return; await supabase.from('badges').insert({ gym_id: gym.id, name: newBadge.trim(), emoji: newBadgeE, created_by: user.id }); setNewBadge(''); setNewBadgeE('🏅'); loadAll(); }
  async function awardBadge(e) { e.preventDefault(); if (!awardB || !awardU) return; await supabase.from('user_badges').insert({ badge_id: awardB, user_id: awardU, gym_id: gym.id, awarded_by: user.id }); setAwardB(''); setAwardU(''); }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, marginBottom: 20 }}>Settings</h2>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Profile</div>
        <div style={{ marginBottom: 10 }}><label className="label">Name</label><input className="input" value={dn} onChange={e => setDn(e.target.value)} required /></div>
        <div style={{ marginBottom: 10 }}>
          <label className="label">Avatar</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{AVATARS.map(e => <button key={e} type="button" onClick={() => setEmoji(e)} style={{ width: 34, height: 34, fontSize: 16, background: emoji === e ? 'var(--accent)' : 'rgba(255,255,255,.03)', border: emoji === e ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><label className="label">Belt</label><select className="input" value={belt} onChange={e => setBelt(e.target.value)}>{BELTS.map(b => <option key={b} value={b}>{b[0].toUpperCase() + b.slice(1)}</option>)}</select></div>
          <div><label className="label">Stripes</label><select className="input" value={stripes} onChange={e => setStripes(e.target.value)}>{[0,1,2,3,4].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 10 }}><BeltSVG belt={belt} stripes={parseInt(stripes)} width={140} height={28} /></div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saved ? 'Saved ✓' : saving ? '...' : 'Save'}</button>
      </form>

      {/* Weight */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Weight</div>
        {weights.length > 0 && (
          <div style={{ marginBottom: 10 }}>{weights.slice(0, 5).map((w, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: 'var(--text-dim)' }}>
              <span>{w.logged_at}</span><span style={{ color: '#f0ece2', fontFamily: 'var(--font-d)' }}>{w.weight_kg} kg</span>
            </div>
          ))}</div>
        )}
        <form onSubmit={addWeight} style={{ display: 'flex', gap: 6 }}>
          <input className="input" type="number" step="0.1" placeholder="kg" value={wKg} onChange={e => setWKg(e.target.value)} required style={{ width: 80 }} />
          <input className="input" type="date" value={wDate} onChange={e => setWDate(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-small" type="submit">+ Log</button>
        </form>
      </div>

      {/* Goals */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Goals</div>
        {goals.map(g => (
          <div key={g.id} style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <span style={{ fontSize: 13, color: g.completed ? '#66bb6a' : '#ddd' }}>{g.completed ? '✓ ' : ''}{g.title}</span>
                {g.goal_type !== 'manual' && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{g.goal_type} · {g.period}{g.technique_filter ? ` · ${g.technique_filter}` : ''}</span>}
              </div>
              <button onClick={() => deleteGoal(g.id)} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>×</button>
            </div>
            {g.goal_type === 'manual' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min="0" max="100" step="5" value={g.progress} onChange={e => updateGoalProgress(g.id, parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 11, color: '#ce93d8', fontWeight: 600, minWidth: 30 }}>{g.progress}%</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-tracked · Target: {g.target_value}</div>
            )}
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            {GOAL_TYPES.map(t => <button key={t.id} type="button" onClick={() => setGType(t.id)} style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', background: gType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: gType === t.id ? '#fff' : 'var(--text-dim)' }}>{t.label}</button>)}
          </div>
          <form onSubmit={addGoal} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input className="input" placeholder={gType === 'manual' ? 'Goal title' : `e.g. Hit ${gType === 'mat_hours' ? '100 hours' : gType === 'sessions' ? '50 sessions' : '200 rounds'}...`} value={gTitle} onChange={e => setGTitle(e.target.value)} />
            {gType !== 'manual' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="number" placeholder="Target" value={gTarget} onChange={e => setGTarget(e.target.value)} style={{ width: 80 }} required />
                <select className="input" value={gPeriod} onChange={e => setGPeriod(e.target.value)} style={{ flex: 1 }}>{PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
                {gType === 'submissions' && <input className="input" placeholder="e.g. Armbar (optional)" value={gTechFilter} onChange={e => setGTechFilter(e.target.value)} style={{ flex: 1 }} />}
              </div>
            )}
            <button className="btn btn-secondary btn-small" type="submit">+ Add Goal</button>
          </form>
        </div>
      </div>

      {/* Injuries */}
      {injuries.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ color: '#ef5350' }}>Active Injuries</div>
          {injuries.map(inj => (
            <div key={inj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <span style={{ fontSize: 13, color: '#ddd' }}>🩹 {inj.body_part} — {inj.injury_type} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({inj.severity})</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => resolveInjury(inj.id)} style={{ background: 'none', border: 'none', color: '#66bb6a', cursor: 'pointer', fontSize: 11 }}>Healed ✓</button>
                <button onClick={() => deleteInjury(inj.id)} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Belt History */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Belt History</div>
        {beltHist.map(b => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BeltSVG belt={b.belt} stripes={b.stripes || 0} width={60} height={12} /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.promoted_at}</span></div>
            <button onClick={() => deleteBeltHistory(b.id)} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>×</button>
          </div>
        ))}
        <form onSubmit={addBeltHistory} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select className="input" value={bhBelt} onChange={e => setBhBelt(e.target.value)} style={{ flex: 1 }}>{BELTS.map(b => <option key={b} value={b}>{b[0].toUpperCase() + b.slice(1)}</option>)}</select>
          <input className="input" type="date" value={bhDate} onChange={e => setBhDate(e.target.value)} style={{ flex: 1 }} required />
          <button className="btn btn-secondary btn-small" type="submit">+</button>
        </form>
      </div>

      {/* Gym Admin */}
      {isOwner && (
        <>
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, margin: '12px 0' }}>Gym Admin</div>
          <form onSubmit={createBadge} className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">Create Badge</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" placeholder="Badge name" value={newBadge} onChange={e => setNewBadge(e.target.value)} style={{ flex: 1 }} required />
              <input className="input" value={newBadgeE} onChange={e => setNewBadgeE(e.target.value)} style={{ width: 44, textAlign: 'center', fontSize: 16 }} />
              <button className="btn btn-secondary btn-small" type="submit">+</button>
            </div>
          </form>
          {badges.length > 0 && members.length > 0 && (
            <form onSubmit={awardBadge} className="card" style={{ marginBottom: 12 }}>
              <div className="section-title">Award Badge</div>
              <select className="input" value={awardB} onChange={e => setAwardB(e.target.value)} style={{ marginBottom: 6 }} required><option value="">Badge...</option>{badges.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}</select>
              <select className="input" value={awardU} onChange={e => setAwardU(e.target.value)} style={{ marginBottom: 6 }} required><option value="">Member...</option>{members.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.avatar_emoji} {m.profiles?.display_name}</option>)}</select>
              <button className="btn btn-secondary btn-small" type="submit">Award</button>
            </form>
          )}
        </>
      )}
      <button className="btn btn-danger" onClick={signOut} style={{ marginTop: 8 }}>Sign Out</button>
    </div>
  );
}
