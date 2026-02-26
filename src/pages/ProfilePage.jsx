import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BeltSVG } from '../components/Belt';
import WeightChart from '../components/WeightChart';

const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const AVATARS = ['🥋', '🦁', '🐍', '🦅', '🐙', '🦈', '🐺', '🦍', '🔥', '💀', '👊', '⚡'];
const GOAL_TYPES = [
  { id: 'manual', label: 'Manual' }, { id: 'mat_hours', label: 'Mat Hours' },
  { id: 'sessions', label: 'Sessions' }, { id: 'rounds', label: 'Rounds' },
  { id: 'submissions', label: 'Submissions' }, { id: 'techniques', label: 'Techniques' },
];
const PERIODS = [{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'semester', label: 'Semester' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All Time' }];

export default function ProfilePage() {
  const { user, profile, gym, gymRole, signOut, refreshData } = useAuth();
  const [dn, setDn] = useState(profile?.display_name || '');
  const [belt, setBelt] = useState(profile?.belt || 'white');
  const [stripes, setStripes] = useState(profile?.stripes || 0);
  const [emoji, setEmoji] = useState(profile?.avatar_emoji || '🥋');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [goals, setGoals] = useState([]);
  const [beltHist, setBeltHist] = useState([]);
  const [badges, setBadges] = useState([]);
  const [members, setMembers] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [weights, setWeights] = useState([]);
  const [weightGoal, setWeightGoal] = useState(null);

  const [gTitle, setGTitle] = useState('');
  const [gType, setGType] = useState('manual');
  const [gTarget, setGTarget] = useState('');
  const [gPeriod, setGPeriod] = useState('semester');
  const [gTechFilter, setGTechFilter] = useState('');
  const [bhBelt, setBhBelt] = useState('white');
  const [bhDate, setBhDate] = useState('');
  const [wKg, setWKg] = useState('');
  const [wgKg, setWgKg] = useState('');
  const [wgDate, setWgDate] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newBadgeE, setNewBadgeE] = useState('🏅');
  const [awardB, setAwardB] = useState('');
  const [awardU, setAwardU] = useState('');
  const isOwner = gymRole === 'owner';

  useEffect(() => { loadAll(); }, [user, gym]);

  async function loadAll() {
    if (!user || !gym) return;
    const [{ data: g }, { data: bh }, { data: inj }, { data: w }, { data: wg }] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at'),
      supabase.from('belt_history').select('*').eq('user_id', user.id).order('promoted_at'),
      supabase.from('injuries').select('*').eq('user_id', user.id).is('resolved_at', null).order('started_at', { ascending: false }),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at').limit(60),
      supabase.from('weight_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setGoals(g || []); setBeltHist(bh || []); setInjuries(inj || []); setWeights(w || []); setWeightGoal(wg);
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
    await supabase.from('profiles').update({ display_name: dn, belt, stripes: parseInt(stripes), avatar_emoji: emoji, avatar_url: avatarUrl.trim() || null }).eq('id', user.id);
    await refreshData(); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  // Goals
  async function addGoal(e) {
    e.preventDefault();
    const title = gTitle.trim() || `${GOAL_TYPES.find(t => t.id === gType)?.label} goal`;
    await supabase.from('goals').insert({ user_id: user.id, gym_id: gym.id, title, goal_type: gType, target_value: gType !== 'manual' ? parseFloat(gTarget) || 0 : null, period: gType !== 'manual' ? gPeriod : 'all', technique_filter: gType === 'submissions' && gTechFilter.trim() ? gTechFilter.trim() : null });
    setGTitle(''); setGTarget(''); setGTechFilter(''); loadAll();
  }
  async function updateGoalProgress(id, progress) { await supabase.from('goals').update({ progress, completed: progress >= 100 }).eq('id', id); loadAll(); }
  async function deleteGoal(id) { await supabase.from('goals').delete().eq('id', id); loadAll(); }

  // Belt
  async function addBeltHistory(e) { e.preventDefault(); if (!bhDate) return; await supabase.from('belt_history').insert({ user_id: user.id, belt: bhBelt, promoted_at: bhDate }); setBhBelt('white'); setBhDate(''); loadAll(); }
  async function deleteBeltHistory(id) { await supabase.from('belt_history').delete().eq('id', id); loadAll(); }

  // Weight
  async function addWeight(e) { e.preventDefault(); if (!wKg) return; await supabase.from('weight_logs').insert({ user_id: user.id, weight_kg: parseFloat(wKg), logged_at: new Date().toISOString().split('T')[0] }); setWKg(''); loadAll(); }
  async function setWeightGoalFn(e) {
    e.preventDefault(); if (!wgKg) return;
    if (weightGoal) await supabase.from('weight_goals').delete().eq('id', weightGoal.id);
    await supabase.from('weight_goals').insert({ user_id: user.id, target_kg: parseFloat(wgKg), target_date: wgDate || null });
    setWgKg(''); setWgDate(''); loadAll();
  }
  async function removeWeightGoal() { if (weightGoal) { await supabase.from('weight_goals').delete().eq('id', weightGoal.id); loadAll(); } }

  // Injuries
  async function resolveInjury(id) { await supabase.from('injuries').update({ resolved_at: new Date().toISOString().split('T')[0] }).eq('id', id); loadAll(); }
  async function deleteInjury(id) { await supabase.from('injuries').delete().eq('id', id); loadAll(); }

  // Badges
  async function createBadge(e) { e.preventDefault(); if (!newBadge.trim()) return; await supabase.from('badges').insert({ gym_id: gym.id, name: newBadge.trim(), emoji: newBadgeE, created_by: user.id }); setNewBadge(''); setNewBadgeE('🏅'); loadAll(); }
  async function awardBadge(e) { e.preventDefault(); if (!awardB || !awardU) return; await supabase.from('user_badges').insert({ badge_id: awardB, user_id: awardU, gym_id: gym.id, awarded_by: user.id }); setAwardB(''); setAwardU(''); }

  const avatarPreview = avatarUrl.trim() ? <img src={avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} /> : <span style={{ fontSize: 36 }}>{emoji}</span>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, marginBottom: 20 }}>Settings</h2>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Profile</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          {avatarPreview}
          <div style={{ flex: 1 }}><label className="label">Name</label><input className="input" value={dn} onChange={e => setDn(e.target.value)} required /></div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="label">Avatar Emoji</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{AVATARS.map(e => <button key={e} type="button" onClick={() => { setEmoji(e); setAvatarUrl(''); }} style={{ width: 32, height: 32, fontSize: 16, background: emoji === e && !avatarUrl ? 'var(--accent)' : 'rgba(255,255,255,.03)', border: emoji === e && !avatarUrl ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>)}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="label">Or custom image URL</label>
          <input className="input" placeholder="https://..." value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} style={{ fontSize: 12 }} />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Paste a link to your photo. Overrides emoji if set.</p>
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
        <WeightChart data={weights} goal={weightGoal} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input className="input" type="number" step="0.1" placeholder="Today's weight (kg)" value={wKg} onChange={e => setWKg(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-small" onClick={addWeight} disabled={!wKg}>Log</button>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {weightGoal ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64b5f6' }}>Goal: {weightGoal.target_kg}kg{weightGoal.target_date ? ` by ${weightGoal.target_date}` : ''}</span>
              <button onClick={removeWeightGoal} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>Remove</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" type="number" step="0.1" placeholder="Target kg" value={wgKg} onChange={e => setWgKg(e.target.value)} style={{ width: 90 }} />
              <input className="input" type="date" placeholder="By date" value={wgDate} onChange={e => setWgDate(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-small" onClick={setWeightGoalFn} disabled={!wgKg}>Set Goal</button>
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Goals</div>
        {goals.map(g => (
          <div key={g.id} style={{ marginBottom: 8, padding: '8px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <div>
                <span style={{ fontSize: 13, color: g.completed ? '#66bb6a' : '#ddd' }}>{g.completed ? '✓ ' : ''}{g.title}</span>
                {g.goal_type !== 'manual' && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>{g.goal_type} · {g.period}{g.technique_filter ? ` · ${g.technique_filter}` : ''}</span>}
              </div>
              <button onClick={() => deleteGoal(g.id)} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>×</button>
            </div>
            {g.goal_type === 'manual' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min="0" max="100" step="5" value={g.progress} onChange={e => updateGoalProgress(g.id, parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 11, color: '#ce93d8', fontWeight: 600, minWidth: 30 }}>{g.progress}%</span>
              </div>
            )}
            {g.goal_type !== 'manual' && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-tracked · Target: {g.target_value}</div>}
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>{GOAL_TYPES.map(t => <button key={t.id} type="button" onClick={() => setGType(t.id)} style={{ padding: '4px 8px', fontSize: 10, borderRadius: 6, border: 'none', cursor: 'pointer', background: gType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: gType === t.id ? '#fff' : 'var(--text-dim)' }}>{t.label}</button>)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input className="input" placeholder={gType === 'manual' ? 'Goal title' : `e.g. ${gType === 'mat_hours' ? '100 hours' : '50 sessions'}...`} value={gTitle} onChange={e => setGTitle(e.target.value)} />
            {gType !== 'manual' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="number" placeholder="Target" value={gTarget} onChange={e => setGTarget(e.target.value)} style={{ width: 70 }} />
                <select className="input" value={gPeriod} onChange={e => setGPeriod(e.target.value)} style={{ flex: 1 }}>{PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
                {gType === 'submissions' && <input className="input" placeholder="Armbar..." value={gTechFilter} onChange={e => setGTechFilter(e.target.value)} style={{ flex: 1 }} />}
              </div>
            )}
            <button className="btn btn-secondary btn-small" onClick={addGoal}>+ Add Goal</button>
          </div>
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
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select className="input" value={bhBelt} onChange={e => setBhBelt(e.target.value)} style={{ flex: 1 }}>{BELTS.map(b => <option key={b} value={b}>{b[0].toUpperCase() + b.slice(1)}</option>)}</select>
          <input className="input" type="date" value={bhDate} onChange={e => setBhDate(e.target.value)} style={{ flex: 1 }} required />
          <button className="btn btn-secondary btn-small" onClick={addBeltHistory}>+</button>
        </div>
      </div>

      {/* Gym Admin */}
      {isOwner && (
        <>
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, margin: '12px 0' }}>Gym Admin</div>
          <form onSubmit={createBadge} className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">Create Badge</div>
            <div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="Badge name" value={newBadge} onChange={e => setNewBadge(e.target.value)} style={{ flex: 1 }} required /><input className="input" value={newBadgeE} onChange={e => setNewBadgeE(e.target.value)} style={{ width: 44, textAlign: 'center', fontSize: 16 }} /><button className="btn btn-secondary btn-small" type="submit">+</button></div>
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

// ============================================================
// PROFILE PAGE PATCH — add these fields to your existing ProfilePage.jsx
// ============================================================
// 
// 1. Add to your state declarations (near existing belt/display_name states):
//
const [age, setAge] = useState('');
const [weightKg, setWeightKg] = useState('');
const [instagram, setInstagram] = useState('');
const [youtube, setYoutube] = useState('');
const [tiktok, setTiktok] = useState('');

// 2. In your load/useEffect where you fetch the profile, add:
//
setAge(data.age || '');
setWeightKg(data.weight_kg || '');
setInstagram(data.instagram || '');
setYoutube(data.youtube || '');
setTiktok(data.tiktok || '');

// 3. In your save/update function, add these fields to the update object:
//
age: age ? parseInt(age) : null,
weight_kg: weightKg ? parseFloat(weightKg) : null,
instagram: instagram.trim() || null,
youtube: youtube.trim() || null,
tiktok: tiktok.trim() || null,

// 4. Add this JSX block anywhere in your form (e.g. after belt selector):

<>
  {/* Age & Weight */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
    <div>
      <div className="label">Age</div>
      <input
        className="input"
        type="number"
        min="1" max="100"
        placeholder="e.g. 28"
        value={age}
        onChange={e => setAge(e.target.value)}
      />
    </div>
    <div>
      <div className="label">Weight (kg)</div>
      <input
        className="input"
        type="number"
        min="30" max="200"
        step="0.5"
        placeholder="e.g. 80.5"
        value={weightKg}
        onChange={e => setWeightKg(e.target.value)}
      />
    </div>
  </div>

  {/* Social Links */}
  <div className="label" style={{ marginBottom: 8 }}>Social Media</div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>📷</span>
      <input
        className="input"
        placeholder="Instagram handle (without @)"
        value={instagram}
        onChange={e => setInstagram(e.target.value)}
        style={{ flex: 1 }}
      />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>▶</span>
      <input
        className="input"
        placeholder="YouTube channel (handle or URL)"
        value={youtube}
        onChange={e => setYoutube(e.target.value)}
        style={{ flex: 1 }}
      />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>🎵</span>
      <input
        className="input"
        placeholder="TikTok handle (without @)"
        value={tiktok}
        onChange={e => setTiktok(e.target.value)}
        style={{ flex: 1 }}
      />
    </div>
  </div>
</>
