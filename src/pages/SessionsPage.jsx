import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const BELT_COLORS = { white: '#e8e8e0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#444' };
const RESULTS = [
  { id: 'win', label: 'Win', color: '#66bb6a' },
  { id: 'draw', label: 'Draw', color: '#ffb74d' },
  { id: 'loss', label: 'Loss', color: '#ef5350' },
];
const CATEGORIES = [
  { id: 'takedown', label: 'Takedown', techniques: ['Single Leg','Double Leg','Arm Drag','Snap Down','Body Lock Takedown','Ankle Pick','Outside Trip','Hip Throw','Guard Pull'] },
  { id: 'submission', label: 'Submission', techniques: ['Armbar','Triangle','RNC','Kimura','Guillotine','Darce','Omoplata','Bow & Arrow','Heel Hook','Americana','Loop Choke','Cross Collar'] },
  { id: 'sweep', label: 'Sweep', techniques: ['Scissor Sweep','Hip Bump','Flower Sweep','Berimbolo','X-Guard Sweep','Butterfly Sweep','Elevator Sweep','Waiter Sweep'] },
];
const CAT_COLORS = { takedown: '#ffd54f', submission: '#e57373', sweep: '#64b5f6' };

function fmt(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function fmtDuration(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function parseDuration(str) {
  // accepts "5:30" or "5" (minutes)
  if (!str) return 0;
  const parts = str.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
  return parseInt(str) * 60;
}

function BeltDot({ belt, size = 10 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: BELT_COLORS[belt] || '#888',
      border: belt === 'white' ? '1px solid #999' : 'none', flexShrink: 0,
    }} />
  );
}

function SessionTypeChip({ type }) {
  const t = SESSION_TYPES.find(x => x.id === type);
  if (!t) return null;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: `${t.color}18`, color: t.color,
    }}>{t.label}</span>
  );
}

function ResultChip({ result }) {
  const r = RESULTS.find(x => x.id === result);
  if (!r) return null;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: `${r.color}18`, color: r.color,
    }}>{r.label.toUpperCase()}</span>
  );
}

// ── Opponent picker (inline, simplified) ──────────────────────────────
function InlineOpponentPicker({ members, oppName, oppBelt, oppId, onChange }) {
  const [mode, setMode] = useState(oppId ? 'member' : oppName ? 'guest' : 'none');

  function handleMode(m) {
    setMode(m);
    onChange({ name: '', belt: 'white', id: null });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        {[{ id: 'none', l: 'Solo' }, { id: 'member', l: 'Membre' }, { id: 'guest', l: 'Invité' }].map(o => (
          <button key={o.id} type="button" onClick={() => handleMode(o.id)} style={{
            flex: 1, padding: '6px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: mode === o.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
            color: mode === o.id ? '#fff' : 'var(--text-dim)',
          }}>{o.l}</button>
        ))}
      </div>
      {mode === 'member' && (
        <select
          value={oppId || ''}
          onChange={e => {
            const m = members.find(x => x.user_id === e.target.value);
            onChange({ name: m?.display_name || '', belt: m?.belt || 'white', id: e.target.value });
          }}
          style={{ width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#ccc', fontSize: 13 }}
        >
          <option value="">Choisir un partenaire...</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>{m.display_name} ({m.belt || 'white'})</option>
          ))}
        </select>
      )}
      {mode === 'guest' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Nom de l'adversaire"
            value={oppName || ''}
            onChange={e => onChange({ name: e.target.value, belt: oppBelt || 'white', id: null })}
            style={{ flex: 1 }}
          />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {BELTS.map(b => (
              <button key={b} type="button" onClick={() => onChange({ name: oppName || '', belt: b, id: null })} title={b}
                style={{ width: 18, height: 18, borderRadius: '50%', border: oppBelt === b ? '2px solid #fff' : '2px solid transparent', background: BELT_COLORS[b], cursor: 'pointer', padding: 0, boxShadow: b === 'white' ? 'inset 0 0 0 1px #aaa' : 'none' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const POSITIONS = ['Guard', 'Half Guard', 'Mount', 'Back', 'Side Control', 'Turtle', 'Standing'];

// ── Round event editor ─────────────────────────────────────────────────
function EventEditor({ events, onChange }) {
  const [direction, setDirection] = useState('offensive');
  const [cat, setCat] = useState('submission');
  const [customTech, setCustomTech] = useState('');

  const needsPosition = cat === 'submission' || cat === 'sweep';

  function addTech(tech, pos) {
    onChange([...events, { event_type: cat, direction, technique: tech, position: pos || null }]);
  }
  function removeEvent(i) {
    onChange(events.filter((_, j) => j !== i));
  }
  function addCustom(pos) {
    if (!customTech.trim()) return;
    onChange([...events, { event_type: cat, direction, technique: customTech.trim(), position: pos || null }]);
    setCustomTech('');
  }

  return (
    <div>
      {events.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {events.map((e, i) => (
            <span key={i} onClick={() => removeEvent(i)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 14, fontSize: 11,
              cursor: 'pointer', fontWeight: 500,
              background: e.direction === 'offensive' ? 'rgba(102,187,106,.12)' : 'rgba(239,83,80,.12)',
              color: e.direction === 'offensive' ? '#66bb6a' : '#ef5350',
            }}>
              {e.direction === 'offensive' ? '✅' : '😤'} {e.technique}{e.position ? ` (${e.position})` : ''} ×
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
        {[{ d: 'offensive', l: '✅ Moi' }, { d: 'defensive', l: '😤 Eux' }].map(x => (
          <button key={x.d} type="button" onClick={() => setDirection(x.d)} style={{
            padding: '8px', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: direction === x.d ? (x.d === 'offensive' ? 'rgba(102,187,106,.15)' : 'rgba(239,83,80,.15)') : 'transparent',
            color: direction === x.d ? (x.d === 'offensive' ? '#66bb6a' : '#ef5350') : 'var(--text-muted)',
          }}>{x.l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} style={{
            padding: '4px 8px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: cat === c.id ? `${CAT_COLORS[c.id]}22` : 'rgba(255,255,255,.04)',
            color: cat === c.id ? CAT_COLORS[c.id] : 'var(--text-dim)',
          }}>{c.label}</button>
        ))}
      </div>

      {needsPosition ? (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Technique → puis choisis la position :</div>
          {CATEGORIES.find(c => c.id === cat)?.techniques.map(t => (
            <div key={t} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#ccc', marginBottom: 4, fontWeight: 500 }}>{t}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {POSITIONS.map(pos => (
                  <button key={pos} type="button" onClick={() => addTech(t, pos)} style={{
                    padding: '3px 8px', fontSize: 10, borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#aaa',
                  }}>{pos}</button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <input className="input" placeholder="Autre technique..." value={customTech} onChange={e => setCustomTech(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '6px 10px', fontSize: 12 }} />
            {POSITIONS.map(pos => (
              <button key={pos} type="button" onClick={() => addCustom(pos)} style={{
                padding: '6px 8px', fontSize: 10, borderRadius: 6, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#aaa', cursor: 'pointer',
              }}>{pos}</button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {CATEGORIES.find(c => c.id === cat)?.techniques.map(t => (
              <button key={t} type="button" onClick={() => addTech(t, null)} style={{
                padding: '5px 10px', fontSize: 11, borderRadius: 14, cursor: 'pointer',
                background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: '#bbb',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" placeholder="Autre technique..." value={customTech} onChange={e => setCustomTech(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(null); } }}
              style={{ flex: 1, padding: '7px 10px', fontSize: 12 }} />
            <button type="button" onClick={() => addCustom(null)} style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Round Editor modal/panel ───────────────────────────────────────────
function RoundEditor({ round, members, onSave, onDelete, onClose }) {
  const [durationStr, setDurationStr] = useState(() => {
    const s = round.duration_seconds || 0;
    return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '';
  });
  const [oppName, setOppName] = useState(round.opponent_name || '');
  const [oppBelt, setOppBelt] = useState(round.opponent_belt || 'white');
  const [oppId, setOppId] = useState(round.opponent_id || null);
  const [result, setResult] = useState(round.result || null);
  const [events, setEvents] = useState(round._events || []);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const duration_seconds = parseDuration(durationStr);
    // ended_at = started_at + duration (duration_seconds is a generated column)
    const startedAt = new Date(round.started_at || round.ended_at || new Date());
    const endedAt = new Date(startedAt.getTime() + (duration_seconds || 0) * 1000);
    const updates = { result: result || null, started_at: startedAt.toISOString(), ended_at: endedAt.toISOString() };
    if (oppId && !oppId.startsWith('contact_')) {
      updates.opponent_id = oppId;
      updates.opponent_name = oppName || null;
      updates.opponent_belt = oppBelt || null;
    } else if (oppName) {
      updates.opponent_id = null;
      updates.opponent_name = oppName;
      updates.opponent_belt = oppBelt || null;
    } else {
      updates.opponent_id = null;
      updates.opponent_name = null;
      updates.opponent_belt = null;
    }
    await supabase.from('rounds').update(updates).eq('id', round.id);
    // Replace events
    await supabase.from('round_events').delete().eq('round_id', round.id);
    if (events.length > 0) {
      await supabase.from('round_events').insert(events.map(e => ({
        round_id: round.id,
        checkin_id: round.checkin_id,
        user_id: round.user_id,
        gym_id: round.gym_id,
        event_type: e.event_type,
        direction: e.direction,
        technique: e.technique,
        position: e.position || null,
      })));
    }
    setSaving(false);
    onSave();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}>
      <div style={{ background: '#141414', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 400 }}>Round {round.round_number}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label className="label">Durée (min:sec)</label>
            <input className="input" placeholder="5:00" value={durationStr} onChange={e => setDurationStr(e.target.value)} />
          </div>
          <div>
            <label className="label">Résultat</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {RESULTS.map(r => (
                <button key={r.id} type="button" onClick={() => setResult(result === r.id ? null : r.id)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: result === r.id ? `${r.color}22` : 'rgba(255,255,255,.03)',
                  color: result === r.id ? r.color : 'var(--text-dim)',
                }}>{r.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Adversaire</label>
          <InlineOpponentPicker
            members={members}
            oppName={oppName} oppBelt={oppBelt} oppId={oppId}
            onChange={({ name, belt, id }) => { setOppName(name); setOppBelt(belt); setOppId(id || null); }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label" style={{ marginBottom: 10, display: 'block' }}>Techniques & Événements</label>
          <EventEditor events={events} onChange={setEvents} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? '...' : 'Sauvegarder'}
          </button>
          <button onClick={onDelete} style={{
            flex: 1, padding: '14px', borderRadius: 12, border: '1px solid rgba(239,83,80,.3)',
            background: 'rgba(239,83,80,.1)', color: '#ef5350', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── Session Editor (inline, inside session detail) ──────────────────────
function SessionEditor({ session, onSave, onClose }) {
  const [type, setType] = useState(session.session_type || 'gi');
  const [energy, setEnergy] = useState(session.energy_rating || null);
  const [note, setNote] = useState(session.note || '');
  const [date, setDate] = useState(session.checked_in_at?.split('T')[0] || '');
  const [startTime, setStartTime] = useState(session.checked_in_at?.split('T')[1]?.slice(0, 5) || '');
  const [endTime, setEndTime] = useState(session.checked_out_at?.split('T')[1]?.slice(0, 5) || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updates = { session_type: type, energy_rating: energy, note: note.trim() || null };
    if (date && startTime) {
      updates.checked_in_at = new Date(`${date}T${startTime}:00`).toISOString();
    }
    if (date && endTime) {
      updates.checked_out_at = new Date(`${date}T${endTime}:00`).toISOString();
    }
    await supabase.from('checkins').update(updates).eq('id', session.id);
    setSaving(false);
    onSave();
  }

  return (
    <div className="card" style={{ marginBottom: 14, border: '1px solid var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>Modifier la session</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div><label className="label">Date</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label className="label">Début</label><input className="input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
        <div><label className="label">Fin</label><input className="input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {SESSION_TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => setType(t.id)} style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: type === t.id ? `${t.color}22` : 'rgba(255,255,255,.03)',
            color: type === t.id ? t.color : 'var(--text-dim)',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {ENERGY.map(e => (
          <button key={e.val} type="button" onClick={() => setEnergy(energy === e.val ? null : e.val)} style={{
            flex: 1, padding: '7px', fontSize: 16, borderRadius: 8,
            border: energy === e.val ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: energy === e.val ? 'rgba(155,77,202,.15)' : 'transparent', cursor: 'pointer',
          }} title={e.label}>{e.emoji}</button>
        ))}
      </div>
      <textarea className="input" placeholder="Note..." value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ resize: 'none', marginBottom: 10 }} />
      <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button>
    </div>
  );
}

// ── Add Round form ──────────────────────────────────────────────────────
function AddRoundForm({ session, members, onSave, onClose }) {
  const { user, gym } = useAuth();
  const [durationStr, setDurationStr] = useState('5:00');
  const [oppName, setOppName] = useState('');
  const [oppBelt, setOppBelt] = useState('white');
  const [oppId, setOppId] = useState(null);
  const [result, setResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [roundCount, setRoundCount] = useState(0);

  useEffect(() => {
    supabase.from('rounds')
      .select('id', { count: 'exact', head: true })
      .eq('checkin_id', session.id)
      .then(({ count }) => setRoundCount(count || 0));
  }, [session.id]);

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const duration_seconds = parseDuration(durationStr);
      const startedAt = new Date(session.checked_in_at || new Date());
      const endedAt = new Date(startedAt.getTime() + (duration_seconds || 0) * 1000);
      const roundData = {
        checkin_id: session.id,
        user_id: user.id,
        gym_id: gym.id,
        round_number: roundCount + 1,
        result: result || null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
      };
      if (oppId && !String(oppId).startsWith('contact_')) {
        roundData.opponent_id = oppId;
        roundData.opponent_name = oppName || null;
        roundData.opponent_belt = oppBelt || null;
      } else if (oppName) {
        roundData.opponent_name = oppName;
        roundData.opponent_belt = oppBelt || null;
      }
      const { data: newRound, error: roundErr } = await supabase.from('rounds').insert(roundData).select().single();
      if (roundErr) throw new Error(roundErr.message);
      if (newRound && events.length > 0) {
        const { error: evErr } = await supabase.from('round_events').insert(events.map(e => ({
          round_id: newRound.id,
          checkin_id: session.id,
          user_id: user.id,
          gym_id: gym.id,
          event_type: e.event_type,
          direction: e.direction,
          technique: e.technique,
          position: e.position || null,
        })));
        if (evErr) throw new Error(evErr.message);
      }
      onSave();
    } catch (err) {
      setSaveError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12, border: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: 1 }}>Nouveau Round</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label className="label">Durée (min:sec)</label>
          <input className="input" placeholder="5:00" value={durationStr} onChange={e => setDurationStr(e.target.value)} />
        </div>
        <div>
          <label className="label">Résultat</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {RESULTS.map(r => (
              <button key={r.id} type="button" onClick={() => setResult(result === r.id ? null : r.id)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: result === r.id ? `${r.color}22` : 'rgba(255,255,255,.03)',
                color: result === r.id ? r.color : 'var(--text-dim)',
              }}>{r.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="label">Adversaire</label>
        <InlineOpponentPicker
          members={members} oppName={oppName} oppBelt={oppBelt} oppId={oppId}
          onChange={({ name, belt, id }) => { setOppName(name); setOppBelt(belt); setOppId(id || null); }}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="label" style={{ marginBottom: 8, display: 'block' }}>Événements</label>
        <EventEditor events={events} onChange={setEvents} />
      </div>
      {saveError && (
        <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(239,83,80,.12)', borderRadius: 8, fontSize: 12, color: '#ef5350' }}>
          ⚠️ {saveError}
        </div>
      )}
      <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Ajouter ce round'}</button>
    </div>
  );
}

// ── Session Detail View ─────────────────────────────────────────────────
function SessionDetail({ session, members, onBack, onDeleted }) {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [addingRound, setAddingRound] = useState(false);
  const [s, setS] = useState(session);

  useEffect(() => { loadRounds(); }, [session.id]);

  async function loadRounds() {
    const { data } = await supabase
      .from('rounds')
      .select('*, round_events(*)')
      .eq('checkin_id', session.id)
      .order('round_number');
    const enriched = (data || []).map(r => ({ ...r, _events: r.round_events || [] }));
    setRounds(enriched);
    setLoading(false);
  }

  async function refreshSession() {
    const { data } = await supabase.from('checkins').select('*').eq('id', session.id).single();
    if (data) setS(data);
    setEditingSession(false);
  }

  async function deleteRound(roundId) {
    if (!confirm('Supprimer ce round ?')) return;
    await supabase.from('round_events').delete().eq('round_id', roundId);
    await supabase.from('rounds').delete().eq('id', roundId);
    loadRounds();
  }

  async function deleteSession() {
    if (!confirm('Supprimer toute cette session ?')) return;
    const rIds = rounds.map(r => r.id);
    if (rIds.length) {
      await supabase.from('round_events').delete().in('round_id', rIds);
      await supabase.from('rounds').delete().in('id', rIds);
    }
    await supabase.from('checkins').delete().eq('id', session.id);
    onDeleted();
  }

  const dur = s.checked_in_at && s.checked_out_at
    ? Math.round((new Date(s.checked_out_at) - new Date(s.checked_in_at)) / 1000)
    : null;
  const dateStr = s.checked_in_at
    ? new Date(s.checked_in_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="container fade-in" style={{ paddingTop: 20, paddingBottom: 100 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Retour
      </button>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, textTransform: 'capitalize' }}>{dateStr}</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <SessionTypeChip type={s.session_type} />
          {dur && <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{fmtDuration(dur)}</span>}
          {s.energy_rating && <span style={{ fontSize: 16 }}>{ENERGY[s.energy_rating - 1]?.emoji}</span>}
        </div>
        {s.note && <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>{s.note}</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setEditingSession(!editingSession)} style={{
          flex: 1, padding: '9px', borderRadius: 10, border: '1px solid var(--border)',
          background: editingSession ? 'rgba(123,45,142,.15)' : 'rgba(255,255,255,.03)',
          color: editingSession ? 'var(--accent)' : 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>✏️ Modifier session</button>
        <button onClick={deleteSession} style={{
          padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(239,83,80,.25)',
          background: 'rgba(239,83,80,.08)', color: '#ef5350', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>🗑 Supprimer</button>
      </div>

      {editingSession && <SessionEditor session={s} onSave={refreshSession} onClose={() => setEditingSession(false)} />}

      {/* Rounds */}
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
          Rounds ({rounds.length})
        </span>
        <button onClick={() => setAddingRound(!addingRound)} style={{
          padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: addingRound ? 'rgba(123,45,142,.15)' : 'rgba(255,255,255,.03)',
          color: addingRound ? 'var(--accent)' : 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>{addingRound ? '✕ Annuler' : '+ Round'}</button>
      </div>

      {addingRound && (
        <AddRoundForm
          session={s} members={members}
          onSave={() => { setAddingRound(false); loadRounds(); }}
          onClose={() => setAddingRound(false)}
        />
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Chargement...</div>
      ) : rounds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
          Aucun round enregistré pour cette session.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rounds.map((r, i) => {
            const offEvs = r._events.filter(e => e.direction === 'offensive');
            const defEvs = r._events.filter(e => e.direction === 'defensive');
            return (
              <div key={r.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>R{r.round_number}</span>
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: 18, color: '#f0ece2' }}>{fmt(r.duration_seconds)}</span>
                    {r.result && <ResultChip result={r.result} />}
                  </div>
                  <button onClick={() => setEditingRound(r)} style={{
                    padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,.03)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
                  }}>✏️ Edit</button>
                </div>
                {(r.opponent_name || r.opponent_id) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>vs</span>
                    {r.opponent_belt && <BeltDot belt={r.opponent_belt} size={10} />}
                    <span style={{ fontSize: 13, color: '#ddd' }}>{r.opponent_name || 'Membre'}</span>
                  </div>
                )}
                {r._events.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {offEvs.map((e, j) => (
                      <span key={`o${j}`} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: 'rgba(102,187,106,.1)', color: '#66bb6a' }}>✅ {e.technique}</span>
                    ))}
                    {defEvs.map((e, j) => (
                      <span key={`d${j}`} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: 'rgba(239,83,80,.1)', color: '#ef5350' }}>😤 {e.technique}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingRound && (
        <RoundEditor
          round={editingRound}
          members={members}
          onSave={() => { setEditingRound(null); loadRounds(); }}
          onDelete={() => { deleteRound(editingRound.id); setEditingRound(null); }}
          onClose={() => setEditingRound(null)}
        />
      )}
    </div>
  );
}

// ── Main SessionsPage ───────────────────────────────────────────────────
export default function SessionsPage() {
  const { user, gym } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  useEffect(() => { if (user && gym) load(); }, [user, gym]);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: lb }, { data: contacts }] = await Promise.all([
      supabase.from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('gym_id', gym.id)
        .not('checked_out_at', 'is', null)
        .order('checked_in_at', { ascending: false })
        .limit(200),
      supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id),
      supabase.from('gym_contacts').select('*').eq('gym_id', gym.id),
    ]);
    setSessions(s || []);
    const realMembers = (lb || []).filter(m => m.user_id !== user.id);
    const virtualMembers = (contacts || []).map(c => ({
      user_id: `contact_${c.id}`,
      display_name: c.display_name,
      belt: c.belt || 'white',
      stripes: c.stripes || 0,
      avatar_url: null,
      is_contact: true,
    }));
    setMembers([...realMembers, ...virtualMembers]);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Chargement...</div>;

  if (selected) {
    const s = sessions.find(x => x.id === selected);
    if (!s) { setSelected(null); return null; }
    return (
      <SessionDetail
        session={s}
        members={members}
        onBack={() => setSelected(null)}
        onDeleted={() => { setSelected(null); load(); }}
      />
    );
  }

  const paged = sessions.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(sessions.length / PER_PAGE);

  // Group by month
  const grouped = {};
  paged.forEach(s => {
    const key = new Date(s.checked_in_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  return (
    <div className="container fade-in" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Historique</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
        {sessions.length} session{sessions.length !== 1 ? 's' : ''} au total
      </p>

      {sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          Aucune session enregistrée.
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month} style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ textTransform: 'capitalize' }}>{month}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(s => {
                  const dur = s.checked_in_at && s.checked_out_at
                    ? Math.round((new Date(s.checked_out_at) - new Date(s.checked_in_at)) / 1000) : null;
                  const dayStr = new Date(s.checked_in_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
                  const typeInfo = SESSION_TYPES.find(t => t.id === s.session_type);
                  return (
                    <div key={s.id} onClick={() => setSelected(s.id)} className="card" style={{
                      padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${typeInfo?.color || '#444'}15`, border: `1px solid ${typeInfo?.color || '#444'}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: typeInfo?.color || '#888', textTransform: 'uppercase' }}>{s.session_type === 'open_mat' ? 'OM' : s.session_type?.toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#ddd', textTransform: 'capitalize' }}>{dayStr}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                          {dur && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{fmtDuration(dur)}</span>}
                          {s.energy_rating && <span style={{ fontSize: 14 }}>{ENERGY[s.energy_rating - 1]?.emoji}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {page > 0 && <button onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-small">← Précédent</button>}
              <span style={{ fontSize: 12, color: 'var(--text-dim)', alignSelf: 'center' }}>{page + 1} / {totalPages}</span>
              {page < totalPages - 1 && <button onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-small">Suivant →</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
