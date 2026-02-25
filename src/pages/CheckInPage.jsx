import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SESSION_TYPES = [
  { id: 'gi', label: 'Gi', emoji: '🥋' },
  { id: 'nogi', label: 'No-Gi', emoji: '🩳' },
  { id: 'open_mat', label: 'Open Mat', emoji: '🤼' },
  { id: 'comp_class', label: 'Comp Class', emoji: '🏆' },
  { id: 'private', label: 'Private', emoji: '🎯' },
];

const ENERGY = [
  { val: 1, emoji: '😵', label: 'Dead' },
  { val: 2, emoji: '😮‍💨', label: 'Tough' },
  { val: 3, emoji: '😐', label: 'OK' },
  { val: 4, emoji: '😊', label: 'Good' },
  { val: 5, emoji: '🔥', label: 'Great' },
];

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export default function CheckInPage() {
  const { user, gym, profile } = useAuth();
  const [activeCheckin, setActiveCheckin] = useState(null);
  const [activeRound, setActiveRound] = useState(null);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [selectedType, setSelectedType] = useState('gi');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [roundElapsed, setRoundElapsed] = useState(0);

  useEffect(() => { if (user && gym) loadState(); }, [user, gym]);

  // Session timer
  useEffect(() => {
    if (!activeCheckin) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeCheckin.checked_in_at).getTime()) / 1000);
      setElapsed(diff);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [activeCheckin]);

  // Round timer
  useEffect(() => {
    if (!activeRound) { setRoundElapsed(0); return; }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeRound.started_at).getTime()) / 1000);
      setRoundElapsed(diff);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [activeRound]);

  async function loadState() {
    // Active checkin
    const { data: checkin } = await supabase.from('checkins').select('*')
      .eq('user_id', user.id).eq('gym_id', gym.id).is('checked_out_at', null)
      .order('checked_in_at', { ascending: false }).limit(1).maybeSingle();
    setActiveCheckin(checkin || null);

    if (checkin) {
      // Active round
      const { data: round } = await supabase.from('rounds').select('*')
        .eq('checkin_id', checkin.id).is('ended_at', null).limit(1).maybeSingle();
      setActiveRound(round || null);

      // Completed rounds
      const { data: done } = await supabase.from('rounds').select('*')
        .eq('checkin_id', checkin.id).not('ended_at', 'is', null)
        .order('round_number');
      setCompletedRounds(done || []);
    }
    setLoading(false);
  }

  async function checkIn() {
    setActionLoading(true);
    const { data } = await supabase.from('checkins')
      .insert({ user_id: user.id, gym_id: gym.id, session_type: selectedType })
      .select().single();
    if (data) { setActiveCheckin(data); setCompletedRounds([]); setActiveRound(null); }
    setActionLoading(false);
  }

  async function startRound() {
    setActionLoading(true);
    const roundNum = completedRounds.length + 1;
    const { data } = await supabase.from('rounds')
      .insert({ checkin_id: activeCheckin.id, user_id: user.id, gym_id: gym.id, round_number: roundNum })
      .select().single();
    if (data) setActiveRound(data);
    setActionLoading(false);
  }

  async function endRound() {
    if (!activeRound) return;
    setActionLoading(true);
    await supabase.from('rounds')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', activeRound.id);
    setCompletedRounds(prev => [...prev, { ...activeRound, ended_at: new Date().toISOString(), duration_seconds: roundElapsed }]);
    setActiveRound(null);
    setActionLoading(false);
  }

  async function checkOut() { setShowDebrief(true); }

  async function submitCheckout(skip = false) {
    setActionLoading(true);
    // End active round if any
    if (activeRound) {
      await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', activeRound.id);
    }
    const updates = { checked_out_at: new Date().toISOString() };
    if (!skip && energy) updates.energy_rating = energy;
    if (!skip && note.trim()) updates.note = note.trim();
    await supabase.from('checkins').update(updates).eq('id', activeCheckin.id);
    setActiveCheckin(null); setActiveRound(null); setCompletedRounds([]); setShowDebrief(false); setEnergy(null); setNote('');
    setActionLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // Debrief screen
  if (showDebrief) {
    const totalRounds = completedRounds.length + (activeRound ? 1 : 0);
    return (
      <div className="container fade-in" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, marginBottom: 4 }}>Session complete 👊</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 6 }}>{formatTime(elapsed)} on the mat{totalRounds > 0 ? ` · ${totalRounds} round${totalRounds > 1 ? 's' : ''}` : ''}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>Optional — skip if you want.</p>

        <div className="card" style={{ marginBottom: 16 }}>
          <label className="label">Energy Level</label>
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

        <div className="card" style={{ marginBottom: 24 }}>
          <label className="label">Quick Note</label>
          <textarea className="input" placeholder="What did you work on?" value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => submitCheckout(false)} disabled={actionLoading}>✓ Save & Check Out</button>
          <button className="btn btn-secondary" onClick={() => submitCheckout(true)} disabled={actionLoading}>Skip — Just Check Out</button>
        </div>
      </div>
    );
  }

  // MAIN VIEW
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 100 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginTop: 4 }}>
          {activeCheckin ? "You're on the mat 💪" : `Hey ${profile?.display_name?.split(' ')[0] || 'there'}`}
        </h1>
      </div>

      {activeCheckin ? (
        <div className="fade-in">
          {/* Session timer */}
          <div className="card checkin-active" style={{ textAlign: 'center', padding: 28, border: '1px solid var(--accent)', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 4 }}>
              {SESSION_TYPES.find(t => t.id === activeCheckin.session_type)?.emoji} {SESSION_TYPES.find(t => t.id === activeCheckin.session_type)?.label}
            </div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 48, color: '#f0ece2', margin: '8px 0' }}>{formatTime(elapsed)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Since {new Date(activeCheckin.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Round controls */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className="section-title" style={{ margin: 0 }}>Rounds</span>
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {completedRounds.length + (activeRound ? 1 : 0)} round{completedRounds.length + (activeRound ? 1 : 0) !== 1 ? 's' : ''}
              </span>
            </div>

            {activeRound ? (
              <div>
                <div className="card round-active" style={{ textAlign: 'center', padding: 20, marginBottom: 12, border: '1px solid var(--success)', background: 'rgba(165,214,167,.05)' }}>
                  <div style={{ fontSize: 11, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Round {completedRounds.length + 1} — Live</div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: 36, color: '#f0ece2', margin: '6px 0' }}>{formatTime(roundElapsed)}</div>
                </div>
                <button className="btn btn-danger" onClick={endRound} disabled={actionLoading}>🔔 End Round</button>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={startRound} disabled={actionLoading} style={{ fontSize: 16 }}>
                ▶ Start Round {completedRounds.length + 1}
              </button>
            )}

            {/* Completed rounds */}
            {completedRounds.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {completedRounds.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Round {r.round_number}</span>
                    <span style={{ fontSize: 13, color: '#ccc', fontFamily: 'var(--font-d)' }}>{formatTime(r.duration_seconds || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check out */}
          <button className="btn btn-danger" onClick={checkOut} disabled={actionLoading}>🛑 Check Out</button>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ marginBottom: 24 }}>
            <label className="label">What are you training?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SESSION_TYPES.map(t => (
                <button key={t.id} onClick={() => setSelectedType(t.id)} style={{
                  padding: '16px 8px', background: selectedType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.03)',
                  border: selectedType === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .2s',
                }}>
                  <span style={{ fontSize: 24 }}>{t.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedType === t.id ? '#fff' : 'var(--text-dim)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={checkIn} disabled={actionLoading} style={{ padding: '20px 24px', fontSize: 18 }}>
            {actionLoading ? '...' : '🤙 Check In'}
          </button>
        </div>
      )}
    </div>
  );
}
