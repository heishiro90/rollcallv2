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

const CATEGORIES = [
  {
    id: 'submission', label: 'Submissions', emoji: '🔒',
    techniques: ['Armbar', 'Triangle', 'RNC', 'Kimura', 'Guillotine', 'Darce', 'Omoplata', 'Loop Choke', 'Bow & Arrow', 'Ezekiel', 'Americana', 'Heel Hook', 'Knee Bar', 'Toe Hold', 'Baseball Choke', 'Cross Collar', 'Anaconda', 'North-South', 'Gogoplata', 'Calf Slicer'],
  },
  {
    id: 'sweep', label: 'Sweeps', emoji: '🔄',
    techniques: ['Scissor Sweep', 'Hip Bump', 'Flower Sweep', 'Berimbolo', 'X-Guard Sweep', 'Butterfly Sweep', 'Pendulum', 'Tripod Sweep', 'Sickle Sweep', 'Elevator Sweep', 'Waiter Sweep'],
  },
  {
    id: 'pass', label: 'Guard Passes', emoji: '🚀',
    techniques: ['Knee Slice', 'Toreando', 'Over-Under', 'Stack Pass', 'Leg Drag', 'Long Step', 'Smash Pass', 'X-Pass', 'Backstep', 'Body Lock Pass'],
  },
  {
    id: 'takedown', label: 'Takedowns', emoji: '🤼',
    techniques: ['Single Leg', 'Double Leg', 'Arm Drag', 'Snap Down', 'Body Lock', 'Ankle Pick', 'Osoto Gari', 'Seoi Nage', 'Tomoe Nage', 'Uchi Mata', 'Ko Uchi Gari'],
  },
  {
    id: 'escape', label: 'Escapes', emoji: '🏃',
    techniques: ['Upa (Bridge & Roll)', 'Shrimp', 'Frame & Reguard', 'Granby Roll', 'Trap & Roll', 'Back Escape'],
  },
];

const DRILL_CATEGORIES = [
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

  const [phase, setPhase] = useState('main');
  const [direction, setDirection] = useState('offensive');
  const [events, setEvents] = useState([]);
  const [customTech, setCustomTech] = useState('');
  const [customCat, setCustomCat] = useState('submission');

  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [techs, setTechs] = useState([]);
  const [techName, setTechName] = useState('');
  const [techCat, setTechCat] = useState('guard');

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
    const { data } = await supabase.from('rounds')
      .insert({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, round_number: doneRounds.length + 1 })
      .select().single();
    if (data) setRound(data);
    setBusy(false);
  }

  function doEndRoundPrompt() {
    setFrozenRoundTime(roundTime);
    setEvents([]);
    setDirection('offensive');
    setCustomTech('');
    setPhase('round_log');
  }

  function tapTechnique(categoryId, technique) {
    setEvents(prev => [...prev, { event_type: categoryId, direction, technique }]);
  }

  function addCustom() {
    if (!customTech.trim()) return;
    setEvents(prev => [...prev, { event_type: customCat, direction, technique: customTech.trim() }]);
    setCustomTech('');
  }

  function removeEvent(i) {
    setEvents(prev => prev.filter((_, j) => j !== i));
  }

  async function doEndRound(skip = false) {
    setBusy(true);
    await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', round.id);
    if (!skip && events.length > 0) {
      await supabase.from('round_events').insert(
        events.map(e => ({ round_id: round.id, checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, event_type: e.event_type, direction: e.direction, technique: e.technique }))
      );
    }
    setDoneRounds(prev => [...prev, { ...round, ended_at: new Date().toISOString(), duration_seconds: frozenRoundTime, _events: skip ? [] : events }]);
    setRound(null); setPhase('main');
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
      await supabase.from('techniques').insert(
        techs.map(t => ({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, name: t.name, category: t.category }))
      );
    }
    setCheckin(null); setRound(null); setDoneRounds([]); setPhase('main');
    setBusy(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // ─── ROUND LOG ───
  if (phase === 'round_log') {
    const offCount = events.filter(e => e.direction === 'offensive').length;
    const defCount = events.filter(e => e.direction === 'defensive').length;

    return (
      <div className="container fade-in" style={{ paddingTop: 24, paddingBottom: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22 }}>Round {doneRounds.length + 1}</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{fmt(frozenRoundTime)} — Tap to log</p>
          </div>
          {events.length > 0 && (
            <div style={{ textAlign: 'right', fontSize: 12 }}>
              <span style={{ color: 'var(--success)' }}>✅ {offCount}</span>
              <span style={{ color: '#ff6b6b', marginLeft: 8 }}>😤 {defCount}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <button onClick={() => setDirection('offensive')} style={{
            flex: 1, padding: '12px 0', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: direction === 'offensive' ? 'rgba(165,214,167,.2)' : 'transparent',
            color: direction === 'offensive' ? 'var(--success)' : 'var(--text-muted)',
            borderBottom: direction === 'offensive' ? '2px solid var(--success)' : '2px solid transparent',
          }}>✅ I did</button>
          <button onClick={() => setDirection('defensive')} style={{
            flex: 1, padding: '12px 0', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: direction === 'defensive' ? 'rgba(255,107,107,.15)' : 'transparent',
            color: direction === 'defensive' ? '#ff6b6b' : 'var(--text-muted)',
            borderBottom: direction === 'defensive' ? '2px solid #ff6b6b' : '2px solid transparent',
          }}>😤 Done to me</button>
        </div>

        {events.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {events.map((e, i) => (
              <span key={i} onClick={() => removeEvent(i)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                background: e.direction === 'offensive' ? 'rgba(165,214,167,.15)' : 'rgba(255,107,107,.15)',
                border: `1px solid ${e.direction === 'offensive' ? 'rgba(165,214,167,.3)' : 'rgba(255,107,107,.3)'}`,
                color: e.direction === 'offensive' ? 'var(--success)' : '#ff6b6b',
              }}>
                {e.direction === 'offensive' ? '✅' : '😤'} {e.technique} ✕
              </span>
            ))}
          </div>
        )}

        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
              {cat.emoji} {cat.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cat.techniques.map(t => (
                <button key={t} onClick={() => tapTechnique(cat.id, t)} style={{
                  padding: '7px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer', transition: 'all .15s',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid var(--border)',
                  color: '#bbb',
                }}>{t}</button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={customCat} onChange={e => setCustomCat(e.target.value)} style={{
            padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', fontSize: 12,
          }}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <input className="input" placeholder="Other technique..." value={customTech} onChange={e => setCustomTech(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
          <button onClick={addCustom} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>+</button>
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
          <div className="label">Techniques Drilled During Class</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>What the coach showed before rolling</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {DRILL_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setTechCat(c.id)} style={{
                padding: '6px 10px', fontSize: 11, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: techCat === c.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                color: techCat === c.id ? '#fff' : 'var(--text-dim)',
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="e.g. Scissor sweep from closed guard" value={techName} onChange={e => setTechName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }} style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-small" onClick={addTech} style={{ flexShrink: 0 }}>+</button>
          </div>
          {techs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {techs.map((t, i) => (
                <span key={i} className="badge-pill" style={{ cursor: 'pointer' }} onClick={() => setTechs(prev => prev.filter((_, j) => j !== i))}>
                  {DRILL_CATEGORIES.find(c => c.id === t.category)?.label?.slice(0, 2)} {t.name} ✕
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
                  <div style={{ fontSize: 11, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Round {doneRounds.length + 1} — Live</div>
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
                {doneRounds.map((r, i) => {
                  const ev = r._events || [];
                  const off = ev.filter(e => e.direction === 'offensive').length;
                  const def = ev.filter(e => e.direction === 'defensive').length;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: '#ccc' }}>R{r.round_number}</span>
                        {off > 0 && <span style={{ fontSize: 11, color: 'var(--success)' }}>✅{off}</span>}
                        {def > 0 && <span style={{ fontSize: 11, color: '#ff6b6b' }}>😤{def}</span>}
                        {ev.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ev.map(e => e.technique).join(', ')}</span>}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-d)' }}>{fmt(r.duration_seconds || 0)}</span>
                    </div>
                  );
                })}
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
