import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CategoryBadge, CAT_STYLE } from '../components/Icons';

const SESSION_TYPES = [
  { id: 'gi', label: 'Gi', color: '#7b2d8e' },
  { id: 'nogi', label: 'No-Gi', color: '#6ec6ff' },
  { id: 'open_mat', label: 'Open Mat', color: '#ff8a65' },
];
const ENERGY = [
  { val: 1, emoji: '😵', label: 'Dead' },
  { val: 2, emoji: '😮‍💨', label: 'Tough' },
  { val: 3, emoji: '😐', label: 'OK' },
  { val: 4, emoji: '😊', label: 'Good' },
  { val: 5, emoji: '🔥', label: 'Great' },
];
const CATEGORIES = [
  { id: 'submission', label: 'Submissions', techniques: ['Armbar', 'Triangle', 'RNC', 'Kimura', 'Guillotine', 'Darce', 'Omoplata', 'Loop Choke', 'Bow & Arrow', 'Ezekiel', 'Americana', 'Heel Hook', 'Knee Bar', 'Toe Hold', 'Baseball Choke', 'Cross Collar', 'Anaconda', 'North-South', 'Gogoplata', 'Calf Slicer'] },
  { id: 'sweep', label: 'Sweeps', techniques: ['Scissor Sweep', 'Hip Bump', 'Flower Sweep', 'Berimbolo', 'X-Guard Sweep', 'Butterfly Sweep', 'Pendulum', 'Tripod Sweep', 'Sickle Sweep', 'Elevator Sweep', 'Waiter Sweep'] },
  { id: 'pass', label: 'Guard Passes', techniques: ['Knee Slice', 'Toreando', 'Over-Under', 'Stack Pass', 'Leg Drag', 'Long Step', 'Smash Pass', 'X-Pass', 'Backstep', 'Body Lock Pass'] },
  { id: 'takedown', label: 'Takedowns', techniques: ['Single Leg', 'Double Leg', 'Arm Drag', 'Snap Down', 'Body Lock', 'Ankle Pick', 'Osoto Gari', 'Seoi Nage', 'Tomoe Nage', 'Uchi Mata', 'Ko Uchi Gari'] },
  { id: 'escape', label: 'Escapes', techniques: ['Upa (Bridge & Roll)', 'Shrimp', 'Frame & Reguard', 'Granby Roll', 'Trap & Roll', 'Back Escape'] },
];
const BODY_PARTS = ['Neck', 'Shoulder', 'Elbow', 'Wrist/Hand', 'Ribs', 'Lower Back', 'Hip', 'Knee', 'Ankle/Foot', 'Fingers/Toes', 'Head'];
const INJURY_TYPES = ['Strain', 'Sprain', 'Bruise', 'Pop/Crack', 'Soreness', 'Cut', 'Burn', 'Tweak'];

function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; }
function fmtLong(sec) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }

export default function CheckInPage() {
  const { user, gym, profile } = useAuth();
  const [checkin, setCheckin] = useState(null);
  const [round, setRound] = useState(null);
  const [doneRounds, setDoneRounds] = useState([]);
  const [selType, setSelType] = useState('gi');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [roundTime, setRoundTime] = useState(0);
  const [frozenRoundTime, setFrozenRoundTime] = useState(0);
  const [phase, setPhase] = useState('main');
  const [direction, setDirection] = useState('offensive');
  const [events, setEvents] = useState([]);
  const [customTech, setCustomTech] = useState('');
  const [customCat, setCustomCat] = useState('submission');
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [matchedCurr, setMatchedCurr] = useState(null);
  // Opponent
  const [members, setMembers] = useState([]);
  const [opponent, setOpponent] = useState('');
  // Injuries
  const [injuries, setInjuries] = useState([]);
  const [injPart, setInjPart] = useState('Knee');
  const [injType, setInjType] = useState('Soreness');
  const [injSev, setInjSev] = useState('minor');
  // Past session
  const [showPast, setShowPast] = useState(false);
  const [pastDate, setPastDate] = useState('');
  const [pastStart, setPastStart] = useState('18:00');
  const [pastEnd, setPastEnd] = useState('19:30');
  const [pastType, setPastType] = useState('gi');
  const [pastEnergy, setPastEnergy] = useState(3);
  const [pastNote, setPastNote] = useState('');
  // Recent sessions
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => { if (user && gym) load(); }, [user, gym]);
  useEffect(() => { if (!checkin) return; const i = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(checkin.checked_in_at).getTime()) / 1000)), 1000); return () => clearInterval(i); }, [checkin]);
  useEffect(() => { if (!round || phase !== 'main') return; const i = setInterval(() => setRoundTime(Math.floor((Date.now() - new Date(round.started_at).getTime()) / 1000)), 1000); return () => clearInterval(i); }, [round, phase]);

  async function load() {
    const { data: c } = await supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).is('checked_out_at', null).order('checked_in_at', { ascending: false }).limit(1).maybeSingle();
    setCheckin(c || null);
    if (c) {
      const { data: r } = await supabase.from('rounds').select('*').eq('checkin_id', c.id).is('ended_at', null).limit(1).maybeSingle();
      setRound(r || null);
      const { data: dr } = await supabase.from('rounds').select('*').eq('checkin_id', c.id).not('ended_at', 'is', null).order('round_number');
      setDoneRounds(dr || []);
      const today = c.checked_in_at.split('T')[0];
      const { data: curr } = await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id', gym.id).eq('class_date', today).order('start_time');
      if (curr?.length) setMatchedCurr(curr);
    }
    const { data: m } = await supabase.from('gym_members').select('user_id, profiles(display_name, avatar_emoji, belt)').eq('gym_id', gym.id);
    setMembers((m || []).filter(x => x.user_id !== user.id));
    const { data: rec } = await supabase.from('checkins').select('*').eq('user_id', user.id).eq('gym_id', gym.id).not('checked_out_at', 'is', null).order('checked_in_at', { ascending: false }).limit(5);
    setRecent(rec || []);
    setLoading(false);
  }

  async function doCheckIn() {
    setBusy(true);
    const { data } = await supabase.from('checkins').insert({ user_id: user.id, gym_id: gym.id, session_type: selType }).select().single();
    if (data) { setCheckin(data); setDoneRounds([]); setRound(null); }
    setBusy(false);
  }

  async function doStartRound() {
    setBusy(true);
    const { data } = await supabase.from('rounds').insert({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, round_number: doneRounds.length + 1, opponent_id: opponent || null }).select().single();
    if (data) setRound(data);
    setOpponent('');
    setBusy(false);
  }

  function doEndRoundPrompt() { setFrozenRoundTime(roundTime); setEvents([]); setDirection('offensive'); setCustomTech(''); setPhase('round_log'); }
  function tapTechnique(catId, tech) { setEvents(prev => [...prev, { event_type: catId, direction, technique: tech }]); }
  function addCustom() { if (!customTech.trim()) return; setEvents(prev => [...prev, { event_type: customCat, direction, technique: customTech.trim() }]); setCustomTech(''); }
  function removeEvent(i) { setEvents(prev => prev.filter((_, j) => j !== i)); }

  async function doEndRound(skip = false) {
    setBusy(true);
    await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', round.id);
    if (!skip && events.length > 0) {
      await supabase.from('round_events').insert(events.map(e => ({ round_id: round.id, checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, event_type: e.event_type, direction: e.direction, technique: e.technique })));
    }
    setDoneRounds(prev => [...prev, { ...round, ended_at: new Date().toISOString(), duration_seconds: frozenRoundTime, _events: skip ? [] : events }]);
    setRound(null); setPhase('main'); setBusy(false);
  }

  function doCheckOutPrompt() { setEnergy(null); setNote(''); setInjuries([]); setPhase('debrief'); }
  function addInjury() { setInjuries(prev => [...prev, { body_part: injPart, injury_type: injType, severity: injSev }]); }

  async function doCheckOut(skip = false) {
    setBusy(true);
    if (round) await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', round.id);
    const updates = { checked_out_at: new Date().toISOString() };
    if (!skip && energy) updates.energy_rating = energy;
    if (!skip && note.trim()) updates.note = note.trim();
    await supabase.from('checkins').update(updates).eq('id', checkin.id);
    if (!skip && injuries.length > 0) {
      await supabase.from('injuries').insert(injuries.map(inj => ({ user_id: user.id, checkin_id: checkin.id, body_part: inj.body_part, injury_type: inj.injury_type, severity: inj.severity })));
    }
    setCheckin(null); setRound(null); setDoneRounds([]); setMatchedCurr(null); setPhase('main'); setBusy(false); load();
  }

  async function addPastSession(e) {
    e.preventDefault(); setBusy(true);
    const startDt = new Date(`${pastDate}T${pastStart}`);
    const endDt = new Date(`${pastDate}T${pastEnd}`);
    const dur = Math.round((endDt - startDt) / 60000);
    await supabase.from('checkins').insert({ user_id: user.id, gym_id: gym.id, session_type: pastType, checked_in_at: startDt.toISOString(), checked_out_at: endDt.toISOString(), duration_minutes: dur > 0 ? dur : 60, energy_rating: pastEnergy, note: pastNote.trim() || null });
    setShowPast(false); setPastDate(''); setPastNote(''); setBusy(false); load();
  }

  async function deleteSession(id) {
    if (!confirm('Delete this session?')) return;
    await supabase.from('checkins').delete().eq('id', id);
    load();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // ─── ROUND LOG ───
  if (phase === 'round_log') {
    const offC = events.filter(e => e.direction === 'offensive').length;
    const defC = events.filter(e => e.direction === 'defensive').length;
    return (
      <div className="container fade-in" style={{ paddingTop: 24, paddingBottom: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div><h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22 }}>Round {doneRounds.length + 1}</h2><p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{fmt(frozenRoundTime)}</p></div>
          {events.length > 0 && <div style={{ fontSize: 12 }}><span style={{ color: '#66bb6a' }}>+{offC}</span><span style={{ color: '#ef5350', marginLeft: 8 }}>-{defC}</span></div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
          {[{ d: 'offensive', l: '✅ I did', c: '#66bb6a' }, { d: 'defensive', l: '😤 Done to me', c: '#ef5350' }].map(x => (
            <button key={x.d} onClick={() => setDirection(x.d)} style={{ padding: '11px 0', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: direction === x.d ? `${x.c}18` : 'transparent', color: direction === x.d ? x.c : 'var(--text-muted)' }}>{x.l}</button>
          ))}
        </div>
        {events.length > 0 && <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 5 }}>{events.map((e, i) => (
          <span key={i} onClick={() => removeEvent(i)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: 500, background: e.direction === 'offensive' ? 'rgba(102,187,106,.12)' : 'rgba(239,83,80,.12)', color: e.direction === 'offensive' ? '#66bb6a' : '#ef5350' }}>{e.direction === 'offensive' ? '✅' : '😤'} {e.technique} ×</span>
        ))}</div>}
        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: CAT_STYLE[cat.id]?.color || 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>{cat.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{cat.techniques.map(t => (
              <button key={t} onClick={() => tapTechnique(cat.id, t)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: '#bbb' }}>{t}</button>
            ))}</div>
          </div>
        ))}
        <div style={{ marginBottom: 18, display: 'flex', gap: 6 }}>
          <select value={customCat} onChange={e => setCustomCat(e.target.value)} style={{ padding: '7px 8px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11 }}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          <input className="input" placeholder="Other..." value={customTech} onChange={e => setCustomTech(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} style={{ flex: 1, padding: '7px 10px', fontSize: 12 }} />
          <button onClick={addCustom} style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>+</button>
        </div>
        <button className="btn btn-primary" onClick={() => doEndRound(false)} disabled={busy} style={{ marginBottom: 8 }}>Save Round{events.length > 0 ? ` · ${events.length}` : ''}</button>
        <button className="btn btn-secondary" onClick={() => doEndRound(true)} disabled={busy}>Skip</button>
      </div>
    );
  }

  // ─── DEBRIEF ───
  if (phase === 'debrief') {
    return (
      <div className="container fade-in" style={{ paddingTop: 32, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, marginBottom: 4 }}>Session done</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>{fmtLong(elapsed)} · {doneRounds.length} round{doneRounds.length !== 1 ? 's' : ''}</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">How did it feel?</div>
          <div style={{ display: 'flex', gap: 6 }}>{ENERGY.map(e => (
            <button key={e.val} onClick={() => setEnergy(e.val)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: energy === e.val ? 'var(--accent)' : 'rgba(255,255,255,.03)', border: energy === e.val ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>{e.emoji}</span>
              <span style={{ fontSize: 10, color: energy === e.val ? '#fff' : 'var(--text-muted)' }}>{e.label}</span>
            </button>
          ))}</div>
        </div>
        {/* Injuries */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">Any injuries?</div>
          {injuries.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>{injuries.map((inj, i) => (
            <span key={i} onClick={() => setInjuries(p => p.filter((_, j) => j !== i))} style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', background: inj.severity === 'serious' ? 'rgba(239,83,80,.15)' : inj.severity === 'moderate' ? 'rgba(255,183,77,.15)' : 'rgba(255,255,255,.06)', color: inj.severity === 'serious' ? '#ef5350' : inj.severity === 'moderate' ? '#ffb74d' : '#aaa', border: '1px solid rgba(255,255,255,.08)' }}>🩹 {inj.body_part} — {inj.injury_type} ×</span>
          ))}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select value={injPart} onChange={e => setInjPart(e.target.value)} style={{ padding: '7px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#ccc', fontSize: 12 }}>{BODY_PARTS.map(p => <option key={p} value={p}>{p}</option>)}</select>
            <select value={injType} onChange={e => setInjType(e.target.value)} style={{ padding: '7px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#ccc', fontSize: 12 }}>{INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={injSev} onChange={e => setInjSev(e.target.value)} style={{ padding: '7px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#ccc', fontSize: 12 }}><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="serious">Serious</option></select>
            <button onClick={addInjury} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>+ Add</button>
          </div>
        </div>
        {matchedCurr?.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label">Today's Class</div>
            {matchedCurr.map(cls => (cls.curriculum_techniques || []).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <CategoryBadge category={t.category} size="small" />
                <span style={{ fontSize: 13, color: '#ddd' }}>{t.name}</span>
                {t.youtube_url && <a href={t.youtube_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#f44', textDecoration: 'none', marginLeft: 'auto' }}>▶</a>}
              </div>
            )))}
          </div>
        )}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label">Note</div>
          <textarea className="input" placeholder="Anything to remember?" value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'none' }} />
        </div>
        <button className="btn btn-primary" onClick={() => doCheckOut(false)} disabled={busy} style={{ marginBottom: 8 }}>Save & Check Out</button>
        <button className="btn btn-secondary" onClick={() => doCheckOut(true)} disabled={busy}>Just Check Out</button>
      </div>
    );
  }

  // ─── MAIN ───
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 100 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginTop: 4 }}>{checkin ? "You're on the mat" : `Hey ${profile?.display_name?.split(' ')[0] || 'there'}`}</h1>
      </div>

      {checkin ? (
        <div className="fade-in">
          <div className="card" style={{ textAlign: 'center', padding: 24, border: `1px solid ${SESSION_TYPES.find(t => t.id === checkin.session_type)?.color}40`, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: SESSION_TYPES.find(t => t.id === checkin.session_type)?.color, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>{SESSION_TYPES.find(t => t.id === checkin.session_type)?.label}</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 48, color: '#f0ece2', margin: '6px 0' }}>{fmtLong(elapsed)}</div>
          </div>
          <div className="card" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: 1 }}>Rounds</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-d)' }}>{doneRounds.length + (round ? 1 : 0)}</span>
            </div>
            {/* Opponent selector */}
            {!round && members.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <select value={opponent} onChange={e => setOpponent(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#ccc', fontSize: 12 }}>
                  <option value="">No opponent (or unknown)</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.avatar_emoji} {m.profiles?.display_name} ({m.profiles?.belt})</option>)}
                </select>
              </div>
            )}
            {round ? (
              <>
                <div className="card round-active" style={{ textAlign: 'center', padding: 20, marginBottom: 12, border: '1px solid #66bb6a', background: 'rgba(102,187,106,.04)' }}>
                  <div style={{ fontSize: 10, color: '#66bb6a', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Round {doneRounds.length + 1}</div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: 40, color: '#f0ece2', margin: '8px 0' }}>{fmt(roundTime)}</div>
                </div>
                <button className="btn btn-danger" onClick={doEndRoundPrompt} disabled={busy}>End Round</button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={doStartRound} disabled={busy} style={{ fontSize: 15, padding: '16px 24px' }}>Start Round {doneRounds.length + 1}</button>
            )}
            {doneRounds.length > 0 && <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>{doneRounds.map((r, i) => {
              const ev = r._events || [];
              const opp = r.opponent_id ? members.find(m => m.user_id === r.opponent_id) : null;
              return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#888' }}>R{r.round_number}</span>
                  {opp && <span style={{ color: 'var(--text-muted)' }}>vs {opp.profiles?.display_name?.split(' ')[0]}</span>}
                  {ev.length > 0 && <span style={{ color: 'var(--text-muted)' }}>{ev.map(e => e.technique).join(', ')}</span>}
                </div>
                <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-d)' }}>{fmt(r.duration_seconds || 0)}</span>
              </div>;
            })}</div>}
          </div>
          <button className="btn btn-danger" onClick={doCheckOutPrompt} disabled={busy}>End Session</button>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ marginBottom: 24 }}>
            <div className="label">Session type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>{SESSION_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelType(t.id)} style={{ padding: '22px 8px', background: selType === t.id ? `${t.color}15` : 'rgba(255,255,255,.02)', border: selType === t.id ? `2px solid ${t.color}` : '1px solid var(--border)', borderRadius: 12, cursor: 'pointer' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: selType === t.id ? t.color : 'var(--text-dim)' }}>{t.label}</span>
              </button>
            ))}</div>
          </div>
          <button className="btn btn-primary" onClick={doCheckIn} disabled={busy} style={{ padding: '20px 24px', fontSize: 17, marginBottom: 16 }}>{busy ? '...' : 'Check In'}</button>

          {/* Past session + recent */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setShowPast(!showPast)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>{showPast ? '✕ Cancel' : '+ Add Past Session'}</button>
            <button onClick={() => setShowRecent(!showRecent)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>{showRecent ? '✕ Hide' : 'Recent Sessions'}</button>
          </div>

          {showPast && (
            <form onSubmit={addPastSession} className="card" style={{ marginBottom: 16 }}>
              <div className="label">Log Past Session</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                <input className="input" type="date" value={pastDate} onChange={e => setPastDate(e.target.value)} required />
                <input className="input" type="time" value={pastStart} onChange={e => setPastStart(e.target.value)} required />
                <input className="input" type="time" value={pastEnd} onChange={e => setPastEnd(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>{SESSION_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setPastType(t.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: pastType === t.id ? `${t.color}20` : 'rgba(255,255,255,.03)', color: pastType === t.id ? t.color : 'var(--text-dim)' }}>{t.label}</button>
              ))}</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>{ENERGY.map(e => (
                <button key={e.val} type="button" onClick={() => setPastEnergy(e.val)} style={{ flex: 1, padding: '6px', fontSize: 16, borderRadius: 8, border: pastEnergy === e.val ? '1px solid var(--accent)' : '1px solid var(--border)', background: pastEnergy === e.val ? 'rgba(155,77,202,.15)' : 'transparent', cursor: 'pointer' }}>{e.emoji}</button>
              ))}</div>
              <input className="input" placeholder="Note (optional)" value={pastNote} onChange={e => setPastNote(e.target.value)} style={{ marginBottom: 10 }} />
              <button className="btn btn-primary btn-small" type="submit" disabled={busy}>Save</button>
            </form>
          )}

          {showRecent && recent.length > 0 && (
            <div className="card">
              <div className="label">Recent Sessions</div>
              {recent.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <div>
                    <span style={{ fontSize: 13, color: '#ccc' }}>{new Date(s.checked_in_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span style={{ fontSize: 12, color: SESSION_TYPES.find(t => t.id === s.session_type)?.color, marginLeft: 8 }}>{s.session_type}</span>
                    {s.energy_rating && <span style={{ marginLeft: 6 }}>{ENERGY[s.energy_rating - 1]?.emoji}</span>}
                    {s.duration_minutes && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{s.duration_minutes}m</span>}
                  </div>
                  <button onClick={() => deleteSession(s.id)} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 11 }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
