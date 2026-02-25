import { useState, useEffect, useRef } from 'react';
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

const ROUND_RESULTS = [
  { id: 'submission', label: '🔒 I submitted', color: 'var(--success)' },
  { id: 'got_submitted', label: '😤 Got submitted', color: '#ff6b6b' },
  { id: 'sweep', label: '🔄 I swept', color: 'var(--blue)' },
  { id: 'got_swept', label: '🔄 Got swept', color: 'var(--orange)' },
  { id: 'positional', label: '♟️ Positional', color: 'var(--text-dim)' },
];

const COMMON_SUBS = ['Armbar', 'Triangle', 'RNC', 'Kimura', 'Guillotine', 'Darce', 'Omoplata', 'Loop Choke', 'Bow & Arrow', 'Ezekiel', 'Americana', 'Heel Hook', 'Knee Bar', 'Toe Hold', 'Baseball Choke', 'Cross Collar'];

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
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

  // Debrief
  const [phase, setPhase] = useState('main'); // main | round_end | debrief
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [roundResult, setRoundResult] = useState(null);
  const [subName, setSubName] = useState('');

  // Techniques
  const [techs, setTechs] = useState([]);
  const [techName, setTechName] = useState('');
  const [techCat, setTechCat] = useState('guard');

  useEffect(() => { if (user && gym) load(); }, [user, gym]);

  // Timers
  useEffect(() => {
    if (!checkin) return;
    const i = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(checkin.checked_in_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [checkin]);

  useEffect(() => {
    if (!round) { setRoundTime(0); return; }
    const i = setInterval(() => {
      setRoundTime(Math.floor((Date.now() - new Date(round.started_at).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [round]);

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
    setRoundResult(null);
    setSubName('');
    setPhase('round_end');
  }

  async function doEndRound(skip = false) {
    setBusy(true);
    const updates = { ended_at: new Date().toISOString() };
    if (!skip && roundResult) updates.result = roundResult;
    if (!skip && subName.trim()) updates.submission_name = subName.trim();
    await supabase.from('rounds').update(updates).eq('id', round.id);
    setDoneRounds(prev => [...prev, { ...round, ...updates, duration_seconds: roundTime }]);
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

    // Save techniques
    if (!skip && techs.length > 0) {
      const rows = techs.map(t => ({ checkin_id: checkin.id, user_id: user.id, gym_id: gym.id, name: t.name, category: t.category }));
      await supabase.from('techniques').insert(rows);
    }

    setCheckin(null); setRound(null); setDoneRounds([]); setPhase('main');
    setBusy(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // ─── ROUND END SCREEN ───
  if (phase === 'round_end') {
    return (
      <div className="container fade-in" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, marginBottom: 4 }}>Round {doneRounds.length + 1} done</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>{fmt(roundTime)} — How'd it go?</p>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">What happened?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROUND_RESULTS.map(r => (
              <button key={r.id} onClick={() => setRoundResult(roundResult === r.id ? null : r.id)} style={{
                padding: '12px 14px', borderRadius: 10, border: roundResult === r.id ? `1px solid ${r.color}` : '1px solid var(--border)',
                background: roundResult === r.id ? `${r.color}15` : 'rgba(255,255,255,.02)',
                color: roundResult === r.id ? r.color : 'var(--text-dim)', fontSize: 14, cursor: 'pointer', textAlign: 'left',
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        {(roundResult === 'submission' || roundResult === 'got_submitted') && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label">Which submission?</div>
            <input className="input" placeholder="e.g. Armbar" value={subName} onChange={e => setSubName(e.target.value)} list="subs" style={{ marginBottom: 10 }} />
            <datalist id="subs">{COMMON_SUBS.map(s => <option key={s} value={s} />)}</datalist>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMON_SUBS.slice(0, 8).map(s => (
                <button key={s} onClick={() => setSubName(s)} className="btn-round" style={{
                  padding: '6px 12px', fontSize: 12, background: subName === s ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                  color: subName === s ? '#fff' : 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer',
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => doEndRound(false)} disabled={busy}>✓ Save Round</button>
          <button className="btn btn-secondary" onClick={() => doEndRound(true)} disabled={busy}>Skip — Just End Round</button>
        </div>
      </div>
    );
  }

  // ─── DEBRIEF / CHECKOUT SCREEN ───
  if (phase === 'debrief') {
    const totalR = doneRounds.length + (round ? 1 : 0);
    return (
      <div className="container fade-in" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, marginBottom: 4 }}>Session done 👊</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
          {fmtLong(elapsed)} · {totalR} round{totalR !== 1 ? 's' : ''}
        </p>

        {/* Energy */}
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

        {/* Techniques drilled */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">Techniques Drilled</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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

        {/* Note */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="label">Quick Note</div>
          <textarea className="input" placeholder="How did it go?" value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => doCheckOut(false)} disabled={busy}>✓ Save & Check Out</button>
          <button className="btn btn-secondary" onClick={() => doCheckOut(true)} disabled={busy}>Skip — Just Check Out</button>
        </div>
      </div>
    );
  }

  // ─── MAIN VIEW ───
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
          {/* Session card */}
          <div className="card checkin-active" style={{ textAlign: 'center', padding: 24, border: '1px solid var(--accent)', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>
              {SESSION_TYPES.find(t => t.id === checkin.session_type)?.emoji} {SESSION_TYPES.find(t => t.id === checkin.session_type)?.label}
            </div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 52, color: '#f0ece2', margin: '6px 0' }}>{fmtLong(elapsed)}</div>
          </div>

          {/* Rounds section */}
          <div className="card" style={{ marginBottom: 16, padding: '20px' }}>
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

            {/* Completed rounds */}
            {doneRounds.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {doneRounds.map((r, i) => {
                  const res = ROUND_RESULTS.find(rr => rr.id === r.result);
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 8, borderLeft: `3px solid ${res?.color || 'var(--border)'}` }}>
                      <div>
                        <span style={{ fontSize: 13, color: '#ccc' }}>Round {r.round_number}</span>
                        {r.result && <span style={{ fontSize: 11, color: res?.color || 'var(--text-dim)', marginLeft: 8 }}>{r.result === 'submission' ? `🔒 ${r.submission_name || 'Sub'}` : r.result === 'got_submitted' ? `😤 ${r.submission_name || 'Subbed'}` : res?.label?.slice(2)}</span>}
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
