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


// ─── WEIGHT CATEGORIES (IBJJF Men) ───────────────────────────────────────────
const WEIGHT_CATS = [
  { id: 'rooster',     label: 'Rooster',         max: 57.5 },
  { id: 'light_feather', label: 'Light Feather (Pluma)', max: 64 },
  { id: 'feather',     label: 'Feather (Pena)',   max: 70 },
  { id: 'light',       label: 'Light (Leve)',     max: 76 },
  { id: 'middle',      label: 'Middle (Médio)',   max: 82.3 },
  { id: 'medium_heavy',label: 'Medium Heavy',     max: 88.3 },
  { id: 'heavy',       label: 'Heavy (Pesado)',   max: 94.3 },
  { id: 'super_heavy', label: 'Super Heavy',      max: 100.5 },
  { id: 'ultra_heavy', label: 'Ultra Heavy',      max: Infinity },
];
const FEDERATIONS = ['IBJJF','UAEJJF','NAGA','Grappling Industries','CBJJ','No-Gi Worlds','Local','Autre'];
const MEDAL_EMOJI = { gold: '🥇', silver: '🥈', bronze: '🥉', fourth: '4th', none: '—' };
const FINISH_TYPES = ['Points','Advantage','Submission','Referee Decision','DQ','No contest'];
const COMP_SUBMISSIONS = ['Armbar','Triangle','RNC','Kimura','Guillotine','Darce','Omoplata','Loop Choke','Bow & Arrow','Ezekiel','Americana','Heel Hook','Knee Bar','Toe Hold','Baseball Choke','Cross Collar','Anaconda','North-South Choke','Gogoplata','Calf Slicer','Wrist Lock','Paper Cutter','Canto Choke','Pena Choke'];

function getWeightCat(kg) {
  if (!kg) return null;
  return WEIGHT_CATS.find(w => kg <= w.max) || WEIGHT_CATS[WEIGHT_CATS.length - 1];
}

function CompetitionTab({ competitions, userId, profile, onRefresh }) {
  const { gym } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showMatchForm, setShowMatchForm] = useState(null); // comp_id
  const [saving, setSaving] = useState(false);

  // Form state — competition
  const suggestedCat = getWeightCat(profile?.weight_kg);
  const [cName, setCName] = useState('');
  const [cDate, setCDate] = useState(new Date().toISOString().split('T')[0]);
  const [cFed, setCFed] = useState('IBJJF');
  const [cBelt, setCBelt] = useState(profile?.belt || 'white');
  const [cWeightCat, setCWeightCat] = useState(suggestedCat?.id || 'middle');
  const [cAbsolute, setCAbsolute] = useState(false);
  const [cMedal, setCMedal] = useState('none');

  // Form state — match
  const [mOpp, setMOpp] = useState('');
  const [mResult, setMResult] = useState('win');
  const [mFinish, setMFinish] = useState('Points');
  const [mNote, setMNote] = useState('');
  const [mSubTech, setMSubTech] = useState('');

  // Stats
  const golds   = competitions.filter(c => c.medal === 'gold').length;
  const silvers  = competitions.filter(c => c.medal === 'silver').length;
  const bronzes  = competitions.filter(c => c.medal === 'bronze').length;
  const allMatches = competitions.flatMap(c => c.competition_matches || []);
  const wins   = allMatches.filter(m => m.result === 'win').length;
  const losses = allMatches.filter(m => m.result === 'loss').length;

  async function saveComp() {
    if (!cName.trim()) return;
    setSaving(true);
    await supabase.from('competitions').insert({
      user_id: userId, gym_id: gym?.id,
      name: cName.trim(), comp_date: cDate, federation: cFed,
      belt: cBelt, weight_category: cWeightCat, is_absolute: cAbsolute, medal: cMedal,
    });
    setSaving(false);
    setShowForm(false);
    setCName(''); setCMedal('none'); setCAbsolute(false);
    onRefresh();
  }

  async function saveMatch(compId) {
    if (!mOpp.trim()) return;
    setSaving(true);
    await supabase.from('competition_matches').insert({
      competition_id: compId, user_id: userId,
      opponent_name: mOpp.trim(), result: mResult,
      finish_type: mFinish, submission_technique: mFinish === 'Submission' ? mSubTech || null : null,
      note: mNote.trim() || null,
    });
    setSaving(false);
    setShowMatchForm(null);
    setMOpp(''); setMResult('win'); setMFinish('Points'); setMNote(''); setMSubTech('');
    onRefresh();
  }

  async function deleteComp(id) {
    if (!confirm('Supprimer cette compétition ?')) return;
    await supabase.from('competitions').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="wide-container fade-in">
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { l: 'Compétitions', v: competitions.length, c: '#f0ece2' },
          { l: 'Or', v: golds,   c: '#ffd54f', e: '🥇' },
          { l: 'Argent', v: silvers, c: '#e0e0e0', e: '🥈' },
          { l: 'Bronze', v: bronzes, c: '#ff8a65', e: '🥉' },
          { l: 'Record', v: `${wins}W - ${losses}L`, c: '#66bb6a' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: s.c }}>{s.e ? `${s.e} ` : ''}{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add button */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(155,77,202,.1)', border: '1px dashed rgba(155,77,202,.4)', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', marginBottom: 16, fontWeight: 600 }}>
          + Ajouter une compétition
        </button>
      ) : (
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(155,77,202,.3)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f0ece2', marginBottom: 14 }}>Nouvelle compétition</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div className="label">Nom du tournoi</div>
              <input className="input" placeholder="IBJJF Paris Open..." value={cName} onChange={e => setCName(e.target.value)} />
            </div>
            <div>
              <div className="label">Date</div>
              <input className="input" type="date" value={cDate} onChange={e => setCDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div className="label">Fédération</div>
              <select className="input" value={cFed} onChange={e => setCFed(e.target.value)}>
                {FEDERATIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Catégorie poids</div>
              <select className="input" value={cWeightCat} onChange={e => setCWeightCat(e.target.value)}>
                {WEIGHT_CATS.map(w => <option key={w.id} value={w.id}>{w.label}{w.max !== Infinity ? ` (≤${w.max}kg)` : '+'}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div className="label">Résultat</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(MEDAL_EMOJI).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setCMedal(k)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: cMedal === k ? 'rgba(155,77,202,.25)' : 'rgba(255,255,255,.04)', color: cMedal === k ? 'var(--accent)' : 'var(--text-dim)' }}>{v}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                <input type="checkbox" checked={cAbsolute} onChange={e => setCAbsolute(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Absolute
              </label>
            </div>
          </div>
          {suggestedCat && (
            <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
              💡 Basé sur ton poids ({profile?.weight_kg}kg) → <span style={{ color: 'var(--accent)' }}>{suggestedCat.label}</span> suggéré
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-small" onClick={saveComp} disabled={saving || !cName.trim()} style={{ flex: 2 }}>{saving ? '...' : 'Sauvegarder'}</button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Competition list */}
      {competitions.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div>Aucune compétition encore. Ajoute ta première !</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {competitions.map(c => {
          const matches = c.competition_matches || [];
          const cWins = matches.filter(m => m.result === 'win').length;
          const cLosses = matches.filter(m => m.result === 'loss').length;
          const catInfo = WEIGHT_CATS.find(w => w.id === c.weight_category);
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden', borderColor: c.medal === 'gold' ? 'rgba(255,213,79,.2)' : c.medal === 'silver' ? 'rgba(224,224,224,.2)' : c.medal === 'bronze' ? 'rgba(255,138,101,.2)' : 'var(--border)' }}>
              <div onClick={() => setExpanded(isOpen ? null : c.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{MEDAL_EMOJI[c.medal] || '—'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f0ece2', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {c.comp_date} · {c.federation}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                    {catInfo?.label}{c.is_absolute ? ' + Absolute' : ''} · {c.belt}
                    {matches.length > 0 && <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>{cWins}W {cLosses}L</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); deleteComp(c.id); }} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,83,80,.08)', border: '1px solid rgba(239,83,80,.2)', color: '#ef5350', fontSize: 10, cursor: 'pointer' }}>×</button>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  {matches.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0 8px' }}>Aucun match enregistré.</div>}
                  {matches.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: m.result === 'win' ? '#66bb6a' : '#ef5350' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#ddd' }}>vs {m.opponent_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.finish_type}{m.note ? ` · ${m.note}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.result === 'win' ? '#66bb6a' : '#ef5350' }}>{m.result === 'win' ? 'V' : 'D'}</div>
                    </div>
                  ))}

                  {showMatchForm === c.id ? (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 10 }}>Ajouter un match</div>
                      <input className="input" placeholder="Adversaire" value={mOpp} onChange={e => setMOpp(e.target.value)} style={{ marginBottom: 8 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[{v:'win',l:'Victoire',c:'#66bb6a'},{v:'loss',l:'Défaite',c:'#ef5350'}].map(r => (
                            <button key={r.v} type="button" onClick={() => setMResult(r.v)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: mResult === r.v ? `${r.c}22` : 'rgba(255,255,255,.04)', color: mResult === r.v ? r.c : 'var(--text-dim)' }}>{r.l}</button>
                          ))}
                        </div>
                        <select className="input" value={mFinish} onChange={e => setMFinish(e.target.value)}>
                          {FINISH_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      {mFinish === 'Submission' && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>Soumission</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {COMP_SUBMISSIONS.map(s => (
                              <button key={s} type="button" onClick={() => setMSubTech(s === mSubTech ? '' : s)} style={{ padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: 'none', fontWeight: mSubTech === s ? 700 : 400, background: mSubTech === s ? 'rgba(229,115,115,.25)' : 'rgba(255,255,255,.05)', color: mSubTech === s ? '#e57373' : 'var(--text-dim)' }}>{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <input className="input" placeholder="Note (optionnel)" value={mNote} onChange={e => setMNote(e.target.value)} style={{ marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-small" onClick={() => saveMatch(c.id)} disabled={saving || !mOpp.trim()} style={{ flex: 2 }}>{saving ? '...' : 'Sauvegarder'}</button>
                        <button onClick={() => setShowMatchForm(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowMatchForm(c.id)} style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,255,255,.12)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>+ Ajouter un match</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
    const dow2 = (now.getDay() + 6) % 7;
    const wsDate = new Date(now); wsDate.setDate(now.getDate() - dow2); wsDate.setHours(0,0,0,0);
    const weekStart = wsDate.toISOString();
    const [
      { data: mc }, { data: ac }, { data: mr }, { data: ar },
      { data: mt }, { data: at }, { data: goals }, { data: bh },
      { data: mev }, { data: aev },
      { data: weights }, { data: wGoal }, { data: injAll }, { data: roundsOpp },
      { data: comps }
    ] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).gte('checked_in_at', ms).order('checked_in_at', { ascending: false }),
      supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).order('checked_in_at', { ascending: false }),
      supabase.from('rounds').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null).gte('started_at', ms),
      supabase.from('rounds').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null),
      supabase.from('techniques').select('*').eq('user_id', user.id).eq('gym_id', gym.id).gte('created_at', weekStart).order('created_at', { ascending: false }),
      supabase.from('techniques').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('gym_id', gym.id).order('created_at'),
      supabase.from('belt_history').select('*').eq('user_id', user.id).order('promoted_at'),
      supabase.from('round_events').select('*').eq('user_id', user.id).eq('gym_id', gym.id).gte('created_at', ms),
      supabase.from('round_events').select('*').eq('user_id', user.id).eq('gym_id', gym.id),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at').limit(60),
      supabase.from('weight_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('injuries').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
      supabase.from('rounds').select('*, profiles!rounds_opponent_id_fkey(display_name, avatar_emoji, avatar_url, belt)').eq('user_id', user.id).eq('gym_id', gym.id).not('ended_at', 'is', null).or('opponent_id.not.is.null,opponent_name.not.is.null'),
      supabase.from('competitions').select('*, competition_matches(*)').eq('user_id', user.id).order('comp_date', { ascending: false }),
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

    // Opponents — 5 most recent, with W/L/D and mat time
    const oppMap = {};
    RAll.forEach(r => {
      const key = r.opponent_id || `name:${r.opponent_name}`;
      if (!key || key === 'name:' || key === 'name:null') return;
      if (!oppMap[key]) {
        if (r.opponent_id && r.profiles) {
          oppMap[key] = { name: r.profiles.display_name, emoji: r.profiles.avatar_emoji, avatar_url: r.profiles.avatar_url, belt: r.profiles.belt, rounds: 0, wins: 0, losses: 0, draws: 0, matTime: 0, lastDate: null };
        } else if (r.opponent_name) {
          oppMap[key] = { name: r.opponent_name, emoji: null, avatar_url: null, belt: r.opponent_belt || 'white', rounds: 0, wins: 0, losses: 0, draws: 0, matTime: 0, lastDate: null };
        }
      }
      if (oppMap[key]) {
        oppMap[key].rounds++;
        if (r.result === 'win') oppMap[key].wins++;
        else if (r.result === 'loss') oppMap[key].losses++;
        else if (r.result === 'draw') oppMap[key].draws++;
        oppMap[key].matTime += (r.duration_seconds || 0);
        const d = r.started_at || r.ended_at;
        if (d && (!oppMap[key].lastDate || d > oppMap[key].lastDate)) oppMap[key].lastDate = d;
      }
    });
    const opponents = Object.entries(oppMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || '')).slice(0, 5);

    // Techniques drilled grouped by day
    const techByDay = {};
    AT.slice(0, 30).forEach(t => {
      const day = t.created_at.split('T')[0];
      if (!techByDay[day]) techByDay[day] = [];
      techByDay[day].push(t);
    });

    // Comp submission stars
    const compSubMap = {};
    (comps || []).forEach(c => (c.competition_matches || []).forEach(m => {
      if (m.finish_type === 'Submission' && m.submission_technique) {
        compSubMap[m.submission_technique] = (compSubMap[m.submission_technique] || 0) + 1;
      }
    }));

    setD({
      monthSessions: M.length, monthMin: M.reduce((s, c) => s + (c.duration_minutes || 0), 0), monthRounds: MR.length, avgRound, streak, avgE,
      weekly, submissions, topOffense, topWeaknesses, evBreak, techCats, techByDay, history,
      goals: autoGoals, beltHistory: bh || [], allRounds: AR.length, allEvents: AEV.length, allEventsData: AEV,
      weights: W, weightGoal: wGoal, activeInj: INJ.filter(i => !i.resolved_at), pastInj: INJ.filter(i => i.resolved_at).slice(0, 5), opponents,
      competitions: comps || [], compSubMap,
    });
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  if (!d) return null;

  const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'training', label: 'Training' }, { id: 'rounds', label: 'Rounds' }, { id: 'competition', label: '🏆 Compétition' }, { id: 'body', label: 'Body' }];

  return (
    <div style={{ paddingTop: 20, paddingBottom: 100 }}>
      {/* HEADER */}
      <div className="wide-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Av p={profile} size={36} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, color: '#f0ece2' }}>{profile?.display_name}</h1>
            <div style={{ marginTop: 4 }}><BeltSVG belt={profile?.belt} stripes={profile?.stripes || 0} width={100} height={20} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {gym?.name}
            {d.weights?.length > 0 && (() => {
              const lastW = d.weights[d.weights.length - 1]?.weight_kg;
              const cat = lastW ? [
                { max: 57.5, label: 'Rooster' }, { max: 64, label: 'Pluma' }, { max: 70, label: 'Pena' },
                { max: 76, label: 'Leve' }, { max: 82.3, label: 'Médio' }, { max: 88.3, label: 'Meio-Pesado' },
                { max: 94.3, label: 'Pesado' }, { max: 100.5, label: 'Super-Pesado' }, { max: Infinity, label: 'Pesadíssimo' }
              ].find(c => lastW <= c.max) : null;
              return cat ? <span style={{ marginLeft: 6, color: 'var(--accent)', fontWeight: 600 }}>· {cat.label} ({lastW}kg)</span> : null;
            })()}
          </div>
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
              {d.submissions.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Log round events</div> : d.submissions.slice(0, 5).map((s, i) => {
                const compCount = d.compSubMap?.[s.name] || 0;
                const stars = '⭐'.repeat(Math.min(compCount, 5));
                return (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#ddd', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {s.name}
                        {compCount > 0 && <span style={{ fontSize: 10, letterSpacing: -1, color: '#ffd54f' }} title={`${compCount} finish(es) en compétition`}>{'⭐'.repeat(Math.min(compCount, 5))}{compCount > 5 ? `+${compCount-5}` : ''}</span>}
                      </span>
                      <span style={{ fontSize: 11 }}><span style={{ color: '#66bb6a' }}>{s.off}</span>{s.def > 0 && <span style={{ color: '#ef5350', marginLeft: 4 }}>{s.def}</span>}</span>
                    </div>
                    <Bar value={s.off} max={d.submissions[0]?.off || 1} color={compCount > 0 ? '#ffd54f' : i === 0 ? '#9b4dca' : 'rgba(255,255,255,.12)'} />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
          </div>
          {d.activeInj.length > 0 && (
            <div className="card" style={{ marginTop: 14, borderColor: 'rgba(239,83,80,.2)', background: 'rgba(239,83,80,.04)' }}>
              <div className="section-title" style={{ color: '#ef5350', marginBottom: 10 }}>🩹 Blessures actives</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {d.activeInj.map((inj, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: inj.severity === 'serious' ? '#ef5350' : inj.severity === 'moderate' ? '#ffb74d' : '#66bb6a' }} />
                    <div style={{ fontSize: 13, color: '#ddd', flex: 1 }}>{inj.body_part} — {inj.injury_type}</div>
                    <div style={{ fontSize: 11, color: inj.severity === 'serious' ? '#ef5350' : inj.severity === 'moderate' ? '#ffb74d' : '#66bb6a', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{inj.severity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TRAINING ═══ */}
      {tab === 'training' && (
        <div className="wide-container fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="section-title">Techniques Drilled This Week</div>
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
          <div className="card" style={{ marginTop: 14 }}>
            <div className="section-title">Game Flow</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Thicker = more used. Submissions map from the position you picked during logging.</p>
            <TechTree events={d.allEventsData || []} />
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {d.opponents.map((o, i) => {
                  const matMin = Math.round((o.matTime || 0) / 60);
                  const matStr = matMin >= 60 ? `${Math.floor(matMin/60)}h${matMin%60>0?` ${matMin%60}m`:''}` : matMin > 0 ? `${matMin}m` : null;
                  return (
                  <div key={i} className="card" style={{ padding: 12, textAlign: 'center' }}>
                    <Av p={{ avatar_url: o.avatar_url, avatar_emoji: o.emoji }} size={28} />
                    <div style={{ fontSize: 13, color: '#ddd', margin: '5px 0 2px', fontWeight: 500 }}>{o.name?.split(' ')[0]}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 3 }}>
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background: BELT_COLORS[o.belt]||'#888', border: o.belt==='white'?'1px solid #999':'none' }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{o.belt}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 5 }}>{o.rounds} rds{matStr ? ` · ${matStr}` : ''}</div>
                    <div style={{ fontSize: 11, display: 'flex', justifyContent: 'center', gap: 6 }}>
                      <span style={{ color: '#66bb6a' }}>W{o.wins}</span>
                      <span style={{ color: '#ef5350' }}>L{o.losses}</span>
                      {o.draws > 0 && <span style={{ color: '#ffb74d' }}>D{o.draws}</span>}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
          {d.topOffense.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="section-title" style={{ color: '#66bb6a' }}>Best Moves</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>{d.topOffense.map(([n, c], i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: 10, border: i === 0 ? '1px solid rgba(102,187,106,.3)' : '1px solid var(--border)' }}><div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: i === 0 ? '#66bb6a' : '#f0ece2' }}>{c}</div><div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>{n}</div></div>
              ))}</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPETITION ═══ */}
      {tab === 'competition' && (
        <CompetitionTab competitions={d.competitions} userId={user?.id} profile={profile} onRefresh={load} />
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
