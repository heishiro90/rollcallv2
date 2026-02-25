import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SESSION_TYPES = [
  { id: 'gi', label: 'Gi', emoji: '🥋' },
  { id: 'nogi', label: 'No-Gi', emoji: '🩳' },
  { id: 'open_mat', label: 'Open Mat', emoji: '🤼' },
];

const ENERGY = [
  { val: 1, emoji: '😵', label: 'Dead' },
  { val: 2, emoji: '😮‍💨', label: 'Tough' },
  { val: 3, emoji: '😐', label: 'OK' },
  { val: 4, emoji: '😊', label: 'Good' },
  { val: 5, emoji: '🔥', label: 'Great' },
];

const EVENT_TYPES = [
  { id: 'submission', label: '🔒 Submission', offLabel: 'I submitted', defLabel: 'I got submitted' },
  { id: 'sweep', label: '🔄 Sweep', offLabel: 'I swept', defLabel: 'I got swept' },
  { id: 'pass', label: '🚀 Pass', offLabel: 'I passed guard', defLabel: 'My guard got passed' },
  { id: 'takedown', label: '🤼 Takedown', offLabel: 'I took down', defLabel: 'I got taken down' },
  { id: 'escape', label: '🏃 Escape', offLabel: 'I escaped', defLabel: 'They escaped' },
];

const TECHNIQUES = {
  submission: ['Armbar', 'Triangle', 'RNC', 'Kimura', 'Guillotine', 'Darce', 'Omoplata', 'Loop Choke', 'Bow & Arrow', 'Ezekiel', 'Americana', 'Heel Hook', 'Knee Bar', 'Toe Hold', 'Baseball Choke', 'Cross Collar', 'Anaconda', 'North-South Choke', 'Gogoplata', 'Calf Slicer'],
  sweep: ['Scissor Sweep', 'Hip Bump', 'Flower Sweep', 'Berimbolo', 'X-Guard Sweep', 'Butterfly Sweep', 'Pendulum', 'Lumberjack', 'Tripod Sweep', 'Sickle Sweep', 'Elevator Sweep', 'Waiter Sweep', 'John Wayne Sweep'],
  pass: ['Knee Slice', 'Toreando', 'Over-Under', 'Stack Pass', 'Leg Drag', 'Long Step', 'Smash Pass', 'X-Pass', 'Backstep', 'Body Lock Pass', 'Folding Pass'],
  takedown: ['Single Leg', 'Double Leg', 'Arm Drag', 'Snap Down', 'Body Lock', 'Ankle Pick', 'Osoto Gari', 'Seoi Nage', 'Tomoe Nage', 'Uchi Mata', 'Harai Goshi', 'Ko Uchi Gari', 'Drop Seoi', 'Low Single'],
  escape: ['Bridge & Roll (Upa)', 'Elbow Escape (Shrimp)', 'Hip Escape', 'Frame & Reguard', 'Granby Roll', 'Trap & Roll', 'Single Leg from Bottom', 'Lockdown Escape'],
};

const TECH_CATEGORIES = [
  { id: 'guard', label: '🛡️ Guard' },
  { id: 'passing', label: '🚀 Passing' },
  { id: 'takedown', label: '🤼 Takedown' },
  { id: 'submission', label: '🔒 Submission' },
  { id: 'escape', label: '🏃 Escape' },
  { id: 'sweep', label: '🔄 Sweep' },
];

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

  // Phase: main | round_log | debrief
  const [phase, setPhase] = useState('main');

  // Round events (multiple per round)
  const [events, setEvents] = useState([]);
  const [curEventType, setCurEventType] = useState(null);
  const [curDirection, setCurDirection] = useState(null);
  const [curTechnique, setCurTechnique] = useState('');
  const [techSearch, setTechSearch] = useState('');

  // Debrief
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [techs, setTechs] = useState([]);
  const [techName, setTechName] = useState('');
  const [techCat, setTechCat] = useState('guard');

  useEffect(() => { if (user && gym) load(); }, [user, gym]);

  // Session timer
  useEffect(() => {
    if (!checkin) return;
    const i = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(checkin.checked_in_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [checkin]);

  // Round timer — only ticks in main phase when round is active
  useEffect(() => {
    if (!round || phase !== 'main') { return; }
    const i = setInterval(() => {
      setRoundTime(Math.floor((Date.now() - new Date(round.started_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [round, phase]);

  async function load() {
    const { data: c } = await supabase.from('checkins').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id).is('checked_out_at', null)
      .order('checked_in_at', { ascending: false }).limit(1).maybeSingle();
    setCheckin(c || null);
    if (c) {
      const { data: r } = await supabase.from('rounds').select('*')
        .eq('checkin_id', c.id).is('ended_at', null).limit(1).maybeSingle();
      setRound(r || null);
      const { data: dr } = await supabase.from('rounds').select('*')
        .eq('checkin_id', c.id).not('ended_at', 'is', null).order('round_number');
      setDoneRounds(dr || []);
    }
    setLoading(false);
  }

  async function doCheckIn() {
    setBusy(true);
    const { data } = await supabase.from('checkins')
      .insert({ user_id: user.id, gym_id: gym.id, session_type: selType })
      .select().single();
    if (data) { setCheckin(data); setDoneRounds([]); setRound(null); }
    setBusy(false);
  }

  async function doStartRound() {
    setBusy(true);
    const num = doneRounds.length + 1;
    const { data } = await supabase.from('rounds')
      .insert({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, round_number: num })
      .select().single();
    if (data) setRound(data);
    setBusy(false);
  }

  function doEndRoundPrompt() {
    // Freeze the timer
    setFrozenRoundTime(roundTime);
    setEvents([]);
    setCurEventType(null);
    setCurDirection(null);
    setCurTechnique('');
    setTechSearch('');
    setPhase('round_log');
  }

  function addEvent() {
    if (!curEventType || !curDirection || !curTechnique.trim()) return;
    setEvents(prev => [...prev, { event_type: curEventType, direction: curDirection, technique: curTechnique.trim() }]);
    setCurEventType(null);
    setCurDirection(null);
    setCurTechnique('');
    setTechSearch('');
  }

  function removeEvent(i) {
    setEvents(prev => prev.filter((_, j) => j !== i));
  }

  async function doEndRound(skip = false) {
    setBusy(true);
    const endedAt = new Date().toISOString();
    await supabase.from('rounds').update({ ended_at: endedAt }).eq('id', round.id);

    // Save events
    if (!skip && events.length > 0) {
      const rows = events.map(e => ({
        round_id: round.id, checkin_id: checkin.id, user_id: user.id, gym_id: gym.id,
        event_type: e.event_type, direction: e.direction, technique: e.technique,
      }));
      await supabase.from('round_events').insert(rows);
    }

    setDoneRounds(prev => [...prev, { ...round, ended_at: endedAt, duration_seconds: frozenRoundTime, events: skip ? [] : events }]);
    setRound(null);
    setPhase('main');
    setBusy(false);
  }

  function doCheckOutPrompt() {
    setEnergy(null); setNote(''); setTechs([]); setTechName(''); setTechCat('guard');
    setPhase('debrief');
  }

  function addTech() {
    if (!techName.trim()) return;
    setTechs(prev => [...prev, { name: techName.trim(), category: techCat }]);
    setTechName('');
  }

  async function doCheckOut(skip = false) {
    setBusy(true);
    if (round) await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', round.id);
    const updates = { checked_out_at: new Date().toISOString() };
    if (!skip && energy) updates.energy_rating = energy;
    if (!skip && note.trim()) updates.note = note.trim();
    await supabase.from('checkins').update(updates).eq('id', checkin.id);
    if (!skip && techs.length > 0) {
      const rows = techs.map(t => ({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, name: t.name, category: t.category }));
      await supabase.from('techniques').insert(rows);
    }
    setCheckin(null); setRound(null); setDoneRounds([]); setPhase('main');
    setBusy(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  const evtMeta = (type) => EVENT_TYPES.find(e => e.id === type);

  // ─── ROUND LOG SCREEN ───
  if (phase === 'round_log') {
    const filteredTechs = curEventType ? (TECHNIQUES[curEventType] || []).filter(t =>
      !techSearch || t.toLowerCase().includes(techSearch.toLowerCase())
    ) : [];

    return (
      <div className="container fade-in" style={{ paddingTop: 32, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, marginBottom: 4 }}>Round {doneRounds.length + 1} done</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>{fmt(frozenRoundTime)} — What happened?</p>

        {/* Logged events */}
        {events.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map((e, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px',
                background: e.direction === 'offensive' ? 'rgba(165,214,167,.08)' : 'rgba(255,107,107,.08)',
                borderRadius: 8, borderLeft: `3px solid ${e.direction === 'offensive' ? 'var(--success)' : '#ff6b6b'}`,
              }}>
                <div>
                  <span style={{ fontSize: 13, color: '#ddd' }}>{e.technique}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {e.direction === 'offensive' ? evtMeta(e.event_type)?.offLabel : evtMeta(e.event_type)?.defLabel}
                  </span>
                </div>
                <button onClick={() => removeEvent(i)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add event form */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">Add Event</div>

          {/* Type selection */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {EVENT_TYPES.map(t => (
              <button key={t.id} onClick={() => { setCurEventType(curEventType === t.id ? null : t.id); setCurDirection(null); setCurTechnique(''); setTechSearch(''); }} style={{
                padding: '8px 12px', fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: curEventType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                color: curEventType === t.id ? '#fff' : 'var(--text-dim)',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Direction */}
          {curEventType && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setCurDirection('offensive')} style={{
                flex: 1, padding: '10px', fontSize: 13, borderRadius: 8, border: curDirection === 'offensive' ? '1px solid var(--success)' : '1px solid var(--border)',
                background: curDirection === 'offensive' ? 'rgba(165,214,167,.1)' : 'rgba(255,255,255,.02)',
                color: curDirection === 'offensive' ? 'var(--success)' : 'var(--text-dim)', cursor: 'pointer',
              }}>✅ {evtMeta(curEventType)?.offLabel}</button>
              <button onClick={() => setCurDirection('defensive')} style={{
                flex: 1, padding: '10px', fontSize: 13, borderRadius: 8, border: curDirection === 'defensive' ? '1px solid #ff6b6b' : '1px solid var(--border)',
                background: curDirection === 'defensive' ? 'rgba(255,107,107,.1)' : 'rgba(255,255,255,.02)',
                color: curDirection === 'defensive' ? '#ff6b6b' : 'var(--text-dim)', cursor: 'pointer',
              }}>😤 {evtMeta(curEventType)?.defLabel}</button>
            </div>
          )}

          {/* Technique selection */}
          {curEventType && curDirection && (
            <>
              <input className="input" placeholder="Search or type technique..." value={techSearch || curTechnique}
                onChange={e => { setTechSearch(e.target.value); setCurTechnique(e.target.value); }}
                style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', marginBottom: 10 }}>
                {filteredTechs.map(t => (
                  <button key={t} onClick={() => { setCurTechnique(t); setTechSearch(''); }} style={{
                    padding: '6px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
                    background: curTechnique === t ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                    color: curTechnique === t ? '#fff' : 'var(--text-dim)',
                    border: curTechnique === t ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}>{t}</button>
                ))}
              </div>
              <button className="btn btn-secondary btn-small" onClick={addEvent} disabled={!curTechnique.trim()}>
                + Add {evtMeta(curEventType)?.label?.slice(2)}
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => doEndRound(false)} disabled={busy}>
            ✓ Save Round{events.length > 0 ? ` (${events.length} event${events.length > 1 ? 's' : ''})` : ''}
          </button>
          <button className="btn btn-secondary" onClick={() => doEndRound(true)} disabled={busy}>Skip — Nothing notable</button>
        </div>
      </div>
    );
  }

  // ─── DEBRIEF ───
  if (phase === 'debrief') {
    const totalR = doneRounds.length + (round ? 1 : 0);
    return (
      <div className="container fade-in" style={{ paddingTop: 32, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, marginBottom: 4 }}>Session done 👊</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>{fmtLong(elapsed)} · {totalR} round{totalR !== 1 ? 's' : ''}</p>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">Energy Level</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ENERGY.map(e => (
              <button key={e.val} onClick={() => setEnergy(e.val)} style={{
                flex: 1, padding: '12px 0', background: energy === e.val ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                border: energy === e.val ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 22 }}>{e.emoji}</span>
                <span style={{ fontSize: 10, color: energy === e.val ? '#fff' : 'var(--text-dim)' }}>{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">Techniques Drilled</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {TECH_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setTechCat(c.id)} style={{
                padding: '6px 10px', fontSize: 11, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: techCat === c.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                color: techCat === c.id ? '#fff' : 'var(--text-dim)',
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="e.g. Scissor sweep" value={techName} onChange={e => setTechName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }} style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-small" onClick={addTech} style={{ flexShrink: 0 }}>+</button>
          </div>
          {techs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {techs.map((t, i) => (
                <span key={i} className="badge-pill" style={{ cursor: 'pointer' }} onClick={() => setTechs(prev => prev.filter((_, j) => j !== i))}>
                  {TECH_CATEGORIES.find(c => c.id === t.category)?.label?.slice(0, 2)} {t.name} ✕
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label">Quick Note</div>
          <textarea className="input" placeholder="Anything to remember?" value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => doCheckOut(false)} disabled={busy}>✓ Save & Check Out</button>
          <button className="btn btn-secondary" onClick={() => doCheckOut(true)} disabled={busy}>Skip — Just Check Out</button>
        </div>
      </div>
    );
  }

  // ─── MAIN ───
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 100 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginTop: 4 }}>
          {checkin ? "You're on the mat 💪" : `Hey ${profile?.display_name?.split(' ')[0] || 'there'}`}
        </h1>
      </div>

      {checkin ? (
        <div className="fade-in">
          <div className="card checkin-active" style={{ textAlign: 'center', padding: 24, border: '1px solid var(--accent)', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>
              {SESSION_TYPES.find(t => t.id === checkin.session_type)?.emoji} {SESSION_TYPES.find(t => t.id === checkin.session_type)?.label}
            </div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 52, color: '#f0ece2', margin: '6px 0' }}>{fmtLong(elapsed)}</div>
          </div>

          <div className="card" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="section-title" style={{ margin: 0 }}>Sparring Rounds</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{doneRounds.length + (round ? 1 : 0)}</span>
            </div>

            {round ? (
              <>
                <div className="card round-active" style={{ textAlign: 'center', padding: 20, marginBottom: 12, border: '1px solid var(--success)', background: 'rgba(165,214,167,.06)' }}>
                  <div style={{ fontSize: 11, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Round {doneRounds.length + 1} — Live
                  </div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: 40, color: '#f0ece2', margin: '8px 0' }}>{fmt(roundTime)}</div>
                </div>
                <button className="btn btn-danger" onClick={doEndRoundPrompt} disabled={busy}>🔔 End Round</button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={doStartRound} disabled={busy} style={{ fontSize: 15, padding: '16px 24px' }}>
                ▶ Start Round {doneRounds.length + 1}
              </button>
            )}

            {doneRounds.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {doneRounds.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, color: '#ccc' }}>Round {r.round_number}</span>
                      {r.events && r.events.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                          {r.events.map(e => `${e.direction === 'offensive' ? '✅' : '😤'} ${e.technique}`).join(', ')}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-d)' }}>{fmt(r.duration_seconds || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-danger" onClick={doCheckOutPrompt} disabled={busy}>🛑 End Session</button>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ marginBottom: 24 }}>
            <div className="label">What are you training?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {SESSION_TYPES.map(t => (
                <button key={t.id} onClick={() => setSelType(t.id)} style={{
                  padding: '20px 8px', background: selType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.03)',
                  border: selType === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all .2s',
                }}>
                  <span style={{ fontSize: 28 }}>{t.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: selType === t.id ? '#fff' : 'var(--text-dim)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={doCheckIn} disabled={busy} style={{ padding: '22px 24px', fontSize: 18 }}>
            {busy ? '...' : '🤙 Check In'}
          </button>
        </div>
      )}
    </div>
  );
}
