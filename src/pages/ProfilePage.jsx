import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BeltSVG } from '../components/Belt';
import WeightChart from '../components/WeightChart';

const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const GOAL_TYPES = [
  { id: 'manual', label: 'Manual' }, { id: 'mat_hours', label: 'Mat hours' },
  { id: 'sessions', label: 'Sessions' }, { id: 'rounds', label: 'Rounds' },
  { id: 'submissions', label: 'Submissions' }, { id: 'techniques', label: 'Techniques' },
];
const PERIODS = [{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'semester', label: 'Semester' }, { id: 'year', label: 'Year' }, { id: 'all', label: 'All' }];
const ENERGY = [
  { val: 1, emoji: '😵' }, { val: 2, emoji: '😮‍💨' }, { val: 3, emoji: '😐' }, { val: 4, emoji: '😊' }, { val: 5, emoji: '🔥' },
];

export default function ProfilePage() {
  const { user, profile, gym, gymRole, signOut, refreshData } = useAuth();
  const [dn, setDn] = useState(profile?.display_name || '');
  const [belt, setBelt] = useState(profile?.belt || 'white');
  const [stripes, setStripes] = useState(profile?.stripes || 0);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [age, setAge] = useState(profile?.age || '');
  const [weightKg, setWeightKg] = useState(profile?.weight_kg || '');
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
  const [bhStripes, setBhStripes] = useState(0);
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
        supabase.from('gym_members').select('user_id, role, profiles(display_name)').eq('gym_id', gym.id),
      ]);
      setBadges(b || []); setMembers(m || []);
    }
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true);
    await supabase.from('profiles').update({
      display_name: dn,
      belt,
      stripes: parseInt(stripes),
      avatar_url: avatarUrl.trim() || null,
      age: age ? parseInt(age) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
    }).eq('id', user.id);
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
  async function addBeltHistory(e) { e.preventDefault(); if (!bhDate) return; await supabase.from('belt_history').insert({ user_id: user.id, belt: bhBelt, stripes: parseInt(bhStripes) || 0, promoted_at: bhDate }); setBhBelt('white'); setBhStripes(0); setBhDate(''); loadAll(); }
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

  const avatarPreview = avatarUrl.trim()
    ? <img src={avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} onError={e => e.target.style.display = 'none'} />
    : <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#222', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--text-dim)' }}>{dn?.charAt(0)?.toUpperCase() || '?'}</div>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, marginBottom: 20 }}>Réglages</h2>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Profil</div>

        {/* Avatar + Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          {avatarPreview}
          <div style={{ flex: 1 }}>
            <label className="label">Name</label>
            <input className="input" value={dn} onChange={e => setDn(e.target.value)} required />
          </div>
        </div>

        {/* Photo URL */}
        <div style={{ marginBottom: 12 }}>
          <label className="label">Profile photo (URL)</label>
          <input className="input" placeholder="https://..." value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} style={{ fontSize: 12 }} />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Collez le lien direct vers votre photo.</p>
        </div>

        {/* Belt + Stripes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label className="label">Belt</label>
            <select className="input" value={belt} onChange={e => setBelt(e.target.value)}>
              {BELTS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Stripes</label>
            <select className="input" value={stripes} onChange={e => setStripes(e.target.value)}>
              {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <BeltSVG belt={belt} stripes={parseInt(stripes)} width={140} height={28} />
        </div>

        {/* Age */}
        <div style={{ marginBottom: 14, maxWidth: '50%' }}>
          <label className="label">Age</label>
          <input className="input" type="number" min="1" max="100" placeholder="ex. 28" value={age} onChange={e => setAge(e.target.value)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>{saved ? 'Saved ✓' : saving ? '...' : 'Save'}</button>
      </form>

      {/* Weight */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Poids</div>
        <WeightChart data={weights} goal={weightGoal} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input className="input" type="number" step="0.1" placeholder="Poids aujourd'hui (kg)" value={wKg} onChange={e => setWKg(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-small" onClick={addWeight} disabled={!wKg}>Log</button>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {weightGoal ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64b5f6' }}>Objectif : {weightGoal.target_kg}kg{weightGoal.target_date ? ` avant le ${weightGoal.target_date}` : ''}</span>
              <button onClick={removeWeightGoal} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>Retirer</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" type="number" step="0.1" placeholder="Objectif kg" value={wgKg} onChange={e => setWgKg(e.target.value)} style={{ width: 90 }} />
              <input className="input" type="date" value={wgDate} onChange={e => setWgDate(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-secondary btn-small" onClick={setWeightGoalFn} disabled={!wgKg}>Définir</button>
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Objectifs</div>
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
            {g.goal_type !== 'manual' && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Suivi auto · Objectif : {g.target_value}</div>}
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
            {GOAL_TYPES.map(t => <button key={t.id} type="button" onClick={() => setGType(t.id)} style={{ padding: '4px 8px', fontSize: 10, borderRadius: 6, border: 'none', cursor: 'pointer', background: gType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: gType === t.id ? '#fff' : 'var(--text-dim)' }}>{t.label}</button>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input className="input" placeholder={gType === 'manual' ? 'Titre de l\'objectif' : `ex. ${gType === 'mat_hours' ? '100 heures' : '50 sessions'}...`} value={gTitle} onChange={e => setGTitle(e.target.value)} />
            {gType !== 'manual' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="number" placeholder="Cible" value={gTarget} onChange={e => setGTarget(e.target.value)} style={{ width: 70 }} />
                <select className="input" value={gPeriod} onChange={e => setGPeriod(e.target.value)} style={{ flex: 1 }}>{PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
                {gType === 'submissions' && <input className="input" placeholder="Armbar..." value={gTechFilter} onChange={e => setGTechFilter(e.target.value)} style={{ flex: 1 }} />}
              </div>
            )}
            <button className="btn btn-secondary btn-small" onClick={addGoal}>+ Add goal</button>
          </div>
        </div>
      </div>

      {/* Injuries */}
      {injuries.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ color: '#ef5350' }}>Active injuries</div>
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
        <div className="section-title">Belt & Stripe History</div>
        {beltHist.map(b => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BeltSVG belt={b.belt} stripes={b.stripes || 0} width={60} height={12} />
              <span style={{ fontSize: 12, color: '#ccc', fontWeight: 500 }}>
                {b.belt.charAt(0).toUpperCase() + b.belt.slice(1)}
                {b.stripes > 0 ? ` · ${b.stripes} stripe${b.stripes > 1 ? 's' : ''}` : ''}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.promoted_at}</span>
            </div>
            <button onClick={() => deleteBeltHistory(b.id)} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <select className="input" value={bhBelt} onChange={e => setBhBelt(e.target.value)} style={{ flex: 2, minWidth: 100 }}>
            {BELTS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
          </select>
          <select className="input" value={bhStripes} onChange={e => setBhStripes(e.target.value)} style={{ flex: 1, minWidth: 80 }}>
            {[0,1,2,3,4].map(n => <option key={n} value={n}>{n === 0 ? '0 stripe' : `${n} stripe${n>1?'s':''}`}</option>)}
          </select>
          <input className="input" type="date" value={bhDate} onChange={e => setBhDate(e.target.value)} style={{ flex: 2, minWidth: 120 }} required />
          <button className="btn btn-secondary btn-small" onClick={addBeltHistory}>+</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
          Add each promotion separately — white belt 1 stripe, 2 stripes, etc.
        </div>
      </div>

      {/* Gym Admin */}
      {isOwner && (
        <>
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, margin: '12px 0' }}>Admin Gym</div>
          <form onSubmit={createBadge} className="card" style={{ marginBottom: 12 }}>
            <div className="section-title">Créer un badge</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" placeholder="Badge name" value={newBadge} onChange={e => setNewBadge(e.target.value)} style={{ flex: 1 }} required />
              <input className="input" value={newBadgeE} onChange={e => setNewBadgeE(e.target.value)} style={{ width: 44, textAlign: 'center', fontSize: 16 }} />
              <button className="btn btn-secondary btn-small" type="submit">+</button>
            </div>
          </form>
          {badges.length > 0 && members.length > 0 && (
            <form onSubmit={awardBadge} className="card" style={{ marginBottom: 12 }}>
              <div className="section-title">Attribuer un badge</div>
              <select className="input" value={awardB} onChange={e => setAwardB(e.target.value)} style={{ marginBottom: 6 }} required>
                <option value="">Badge...</option>
                {badges.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
              </select>
              <select className="input" value={awardU} onChange={e => setAwardU(e.target.value)} style={{ marginBottom: 6 }} required>
                <option value="">Membre...</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name}</option>)}
              </select>
              <button className="btn btn-secondary btn-small" type="submit">Attribuer</button>
            </form>
          )}
        </>
      )}

      <button className="btn btn-danger" onClick={signOut} style={{ marginTop: 8 }}>Déconnexion</button>
    </div>
  );
}
