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
  { val: 1, label: 'Dead', color: '#ef5350' },
  { val: 2, label: 'Tough', color: '#ff7043' },
  { val: 3, label: 'OK', color: '#ffa726' },
  { val: 4, label: 'Good', color: '#66bb6a' },
  { val: 5, label: 'Great', color: '#26a69a' },
];

const CATEGORIES = [
  { id: 'submission', label: 'Submissions',
    techniques: ['Armbar', 'Triangle', 'RNC', 'Kimura', 'Guillotine', 'Darce', 'Omoplata', 'Loop Choke', 'Bow & Arrow', 'Ezekiel', 'Americana', 'Heel Hook', 'Knee Bar', 'Toe Hold', 'Baseball Choke', 'Cross Collar', 'Anaconda', 'North-South', 'Gogoplata', 'Calf Slicer'] },
  { id: 'sweep', label: 'Sweeps',
    techniques: ['Scissor Sweep', 'Hip Bump', 'Flower Sweep', 'Berimbolo', 'X-Guard Sweep', 'Butterfly Sweep', 'Pendulum', 'Tripod Sweep', 'Sickle Sweep', 'Elevator Sweep', 'Waiter Sweep'] },
  { id: 'pass', label: 'Guard Passes',
    techniques: ['Knee Slice', 'Toreando', 'Over-Under', 'Stack Pass', 'Leg Drag', 'Long Step', 'Smash Pass', 'X-Pass', 'Backstep', 'Body Lock Pass'] },
  { id: 'takedown', label: 'Takedowns',
    techniques: ['Single Leg', 'Double Leg', 'Arm Drag', 'Snap Down', 'Body Lock', 'Ankle Pick', 'Osoto Gari', 'Seoi Nage', 'Tomoe Nage', 'Uchi Mata', 'Ko Uchi Gari'] },
  { id: 'escape', label: 'Escapes',
    techniques: ['Upa (Bridge & Roll)', 'Shrimp', 'Frame & Reguard', 'Granby Roll', 'Trap & Roll', 'Back Escape'] },
];

const DRILL_CATS = Object.keys(CAT_STYLE).filter(k => k !== 'other' && k !== 'passing');

function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function fmtLong(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

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
  const [matchedCurriculum, setMatchedCurriculum] = useState(null);

  useEffect(() => { if (user && gym) load(); }, [user, gym]);
  useEffect(() => {
    if (!checkin) return;
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(checkin.checked_in_at).getTime()) / 1000)), 1000);
    return () => clearInterval(i);
  }, [checkin]);
  useEffect(() => {
    if (!round || phase !== 'main') return;
    const i = setInterval(() => setRoundTime(Math.floor((Date.now() - new Date(round.started_at).getTime()) / 1000)), 1000);
    return () => clearInterval(i);
  }, [round, phase]);

  async function load() {
    const { data: c } = await supabase.from('checkins').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id).is('checked_out_at', null)
      .order('checked_in_at', { ascending: false }).limit(1).maybeSingle();
    setCheckin(c || null);
    if (c) {
      const { data: r } = await supabase.from('rounds').select('*').eq('checkin_id', c.id).is('ended_at', null).limit(1).maybeSingle();
      setRound(r || null);
      const { data: dr } = await supabase.from('rounds').select('*').eq('checkin_id', c.id).not('ended_at', 'is', null).order('round_number');
      setDoneRounds(dr || []);
      // Auto-match curriculum
      const today = c.checked_in_at.split('T')[0];
      const { data: curr } = await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id', gym.id).eq('class_date', today).order('start_time');
      if (curr && curr.length > 0) setMatchedCurriculum(curr);
    }
    setLoading(false);
  }

  async function doCheckIn() {
    setBusy(true);
    const { data } = await supabase.from('checkins').insert({ user_id: user.id, gym_id: gym.id, session_type: selType }).select().single();
    if (data) {
      setCheckin(data); setDoneRounds([]); setRound(null);
      const today = data.checked_in_at.split('T')[0];
      const { data: curr } = await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id', gym.id).eq('class_date', today).order('start_time');
      if (curr && curr.length > 0) setMatchedCurriculum(curr);
    }
    setBusy(false);
  }

  async function doStartRound() {
    setBusy(true);
    const { data } = await supabase.from('rounds').insert({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, round_number: doneRounds.length + 1 }).select().single();
    if (data) setRound(data);
    setBusy(false);
  }

  function doEndRoundPrompt() {
    setFrozenRoundTime(roundTime); setEvents([]); setDirection('offensive'); setCustomTech(''); setPhase('round_log');
  }

  function tapTechnique(categoryId, technique) {
    setEvents(prev => [...prev, { event_type: categoryId, direction, technique }]);
  }

  function addCustom() {
    if (!customTech.trim()) return;
    setEvents(prev => [...prev, { event_type: customCat, direction, technique: customTech.trim() }]);
    setCustomTech('');
  }

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

  function doCheckOutPrompt() { setEnergy(null); setNote(''); setPhase('debrief'); }

  async function doCheckOut(skip = false) {
    setBusy(true);
    if (round) await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', round.id);
    const updates = { checked_out_at: new Date().toISOString() };
    if (!skip && energy) updates.energy_rating = energy;
    if (!skip && note.trim()) updates.note = note.trim();
    await supabase.from('checkins').update(updates).eq('id', checkin.id);
    setCheckin(null); setRound(null); setDoneRounds([]); setMatchedCurriculum(null); setPhase('main'); setBusy(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // ─── ROUND LOG ───
  if (phase === 'round_log') {
    const offCount = events.filter(e => e.direction === 'offensive').length;
    const defCount = events.filter(e => e.direction === 'defensive').length;
    return (
      <div className="container fade-in" style={{ paddingTop: 24, paddingBottom: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22 }}>Round {doneRounds.length + 1}</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{fmt(frozenRoundTime)}</p>
          </div>
          {events.length > 0 && <div style={{ fontSize: 12 }}><span style={{ color: 'var(--success)' }}>+{offCount}</span><span style={{ color: '#ef5350', marginLeft: 8 }}>-{defCount}</span></div>}
        </div>

        {/* Direction toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
          {[{ d: 'offensive', l: 'I did', c: 'var(--success)' }, { d: 'defensive', l: 'Done to me', c: '#ef5350' }].map(x => (
            <button key={x.d} onClick={() => setDirection(x.d)} style={{
              padding: '11px 0', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              background: direction === x.d ? `${x.c}18` : 'transparent', color: direction === x.d ? x.c : 'var(--text-muted)',
            }}>{x.l}</button>
          ))}
        </div>

        {/* Logged events */}
        {events.length > 0 && (
          <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {events.map((e, i) => (
              <span key={i} onClick={() => removeEvent(i)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: 500,
                background: e.direction === 'offensive' ? 'rgba(102,187,106,.12)' : 'rgba(239,83,80,.12)',
                color: e.direction === 'offensive' ? '#66bb6a' : '#ef5350',
              }}>{e.technique} ×</span>
            ))}
          </div>
        )}

        {/* Categories */}
        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: CAT_STYLE[cat.id]?.color || 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>{cat.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {cat.techniques.map(t => (
                <button key={t} onClick={() => tapTechnique(cat.id, t)} style={{
                  padding: '6px 12px', fontSize: 12, borderRadius: 16, cursor: 'pointer',
                  background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: '#bbb', transition: 'all .1s',
                }}>{t}</button>
              ))}
            </div>
          </div>
        ))}

        {/* Custom */}
        <div style={{ marginBottom: 18, display: 'flex', gap: 6, alignItems: 'center' }}>
          <select value={customCat} onChange={e => setCustomCat(e.target.value)} style={{ padding: '7px 8px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11 }}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className="input" placeholder="Other..." value={customTech} onChange={e => setCustomTech(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} style={{ flex: 1, padding: '7px 10px', fontSize: 12 }} />
          <button onClick={addCustom} style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>+</button>
        </div>

        <button className="btn btn-primary" onClick={() => doEndRound(false)} disabled={busy} style={{ marginBottom: 8 }}>
          Save Round{events.length > 0 ? ` · ${events.length}` : ''}
        </button>
        <button className="btn btn-secondary" onClick={() => doEndRound(true)} disabled={busy}>Skip</button>
      </div>
    );
  }

  // ─── DEBRIEF ───
  if (phase === 'debrief') {
    const totalR = doneRounds.length + (round ? 1 : 0);
    return (
      <div className="container fade-in" style={{ paddingTop: 32, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, marginBottom: 4 }}>Session done</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>{fmtLong(elapsed)} · {totalR} round{totalR !== 1 ? 's' : ''}</p>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">How did it feel?</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {ENERGY.map(e => (
              <button key={e.val} onClick={() => setEnergy(e.val)} style={{
                flex: 1, padding: '14px 0', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s',
                background: energy === e.val ? `${e.color}20` : 'rgba(255,255,255,.03)',
                border: energy === e.val ? `2px solid ${e.color}` : '1px solid var(--border)',
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: e.color, opacity: energy === e.val ? 1 : 0.4, transition: 'opacity .15s' }} />
                <span style={{ fontSize: 10, color: energy === e.val ? e.color : 'var(--text-muted)', fontWeight: 600 }}>{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-matched curriculum */}
        {matchedCurriculum && matchedCurriculum.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label">Today's Class Techniques</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Auto-matched from your coach's curriculum</p>
            {matchedCurriculum.map(cls => (
              <div key={cls.id}>
                {cls.title && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>{cls.title}</div>}
                {(cls.curriculum_techniques || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <CategoryBadge category={t.category} size="small" />
                    <span style={{ fontSize: 13, color: '#ddd' }}>{t.name}</span>
                    {t.position_from && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.position_from}{t.position_to ? ` → ${t.position_to}` : ''}</span>}
                    {t.youtube_url && <a href={t.youtube_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#f44', textDecoration: 'none', marginLeft: 'auto' }}>▶</a>}
                  </div>
                ))}
              </div>
            ))}
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
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginTop: 4 }}>
          {checkin ? "You're on the mat" : `Hey ${profile?.display_name?.split(' ')[0] || 'there'}`}
        </h1>
      </div>

      {checkin ? (
        <div className="fade-in">
          <div className="card" style={{ textAlign: 'center', padding: 24, border: `1px solid ${SESSION_TYPES.find(t => t.id === checkin.session_type)?.color}40`, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: SESSION_TYPES.find(t => t.id === checkin.session_type)?.color, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>
              {SESSION_TYPES.find(t => t.id === checkin.session_type)?.label}
            </div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 48, color: '#f0ece2', margin: '6px 0' }}>{fmtLong(elapsed)}</div>
          </div>

          {/* Matched curriculum */}
          {matchedCurriculum && matchedCurriculum.length > 0 && !round && doneRounds.length === 0 && (
            <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(155,77,202,.2)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>Today's Curriculum</div>
              {matchedCurriculum.map(cls => (cls.curriculum_techniques || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <CategoryBadge category={t.category} size="small" />
                  <span style={{ fontSize: 13, color: '#ddd' }}>{t.name}</span>
                  {t.youtube_url && <a href={t.youtube_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#f44', textDecoration: 'none', marginLeft: 'auto' }}>▶ Video</a>}
                </div>
              )))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc', textTransform: 'uppercase', letterSpacing: 1 }}>Rounds</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-d)' }}>{doneRounds.length + (round ? 1 : 0)}</span>
            </div>
            {round ? (
              <>
                <div className="card round-active" style={{ textAlign: 'center', padding: 20, marginBottom: 12, border: '1px solid var(--success)', background: 'rgba(102,187,106,.04)' }}>
                  <div style={{ fontSize: 10, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Round {doneRounds.length + 1}</div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: 40, color: '#f0ece2', margin: '8px 0' }}>{fmt(roundTime)}</div>
                </div>
                <button className="btn btn-danger" onClick={doEndRoundPrompt} disabled={busy}>End Round</button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={doStartRound} disabled={busy} style={{ fontSize: 15, padding: '16px 24px' }}>Start Round {doneRounds.length + 1}</button>
            )}
            {doneRounds.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {doneRounds.map((r, i) => {
                  const ev = r._events || [];
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#888' }}>R{r.round_number}</span>
                        {ev.length > 0 && <span style={{ color: 'var(--text-muted)' }}>{ev.map(e => e.technique).join(', ')}</span>}
                      </div>
                      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-d)' }}>{fmt(r.duration_seconds || 0)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button className="btn btn-danger" onClick={doCheckOutPrompt} disabled={busy}>End Session</button>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ marginBottom: 24 }}>
            <div className="label">Session type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SESSION_TYPES.map(t => (
                <button key={t.id} onClick={() => setSelType(t.id)} style={{
                  padding: '22px 8px', background: selType === t.id ? `${t.color}15` : 'rgba(255,255,255,.02)',
                  border: selType === t.id ? `2px solid ${t.color}` : '1px solid var(--border)',
                  borderRadius: 12, cursor: 'pointer', transition: 'all .2s',
                }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: selType === t.id ? t.color : 'var(--text-dim)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={doCheckIn} disabled={busy} style={{ padding: '20px 24px', fontSize: 17 }}>
            {busy ? '...' : 'Check In'}
          </button>
        </div>
      )}
    </div>
  );
}
