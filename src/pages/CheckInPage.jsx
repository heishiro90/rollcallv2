import { useState, useEffect, useRef } from 'react';
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
const POSITIONS = ['Mount','Back','Closed Guard','Open Guard','Half Guard','Side Control','Standing','Turtle','Leg Entangle'];
const BELTS = ['white','blue','purple','brown','black'];
const BELT_COLORS = { white: '#e8e8e0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#444' };
const CATEGORIES = [
  { id: 'takedown', label: 'Takedowns', color: '#ffd54f', techniques: ['Single Leg','Double Leg','Arm Drag','Snap Down','Body Lock Takedown','Ankle Pick','Outside Trip','Inside Trip','Hip Throw','Shoulder Throw','Foot Sweep','Drop Throw','Guard Pull'] },
  { id: 'submission', label: 'Submissions', color: '#e57373', askPosition: true, techniques: ['Armbar','Triangle','RNC','Kimura','Guillotine','Darce','Omoplata','Loop Choke','Bow & Arrow','Ezekiel','Americana','Heel Hook','Knee Bar','Toe Hold','Baseball Choke','Cross Collar','Anaconda','North-South Choke','Gogoplata','Calf Slicer','Wrist Lock','Paper Cutter','Canto Choke','Pena Choke'] },
  { id: 'sweep', label: 'Sweeps', color: '#64b5f6', askPosition: true, techniques: ['Scissor Sweep','Hip Bump','Flower Sweep','Berimbolo','X-Guard Sweep','Butterfly Sweep','Pendulum','Tripod Sweep','Sickle Sweep','Elevator Sweep','Waiter Sweep','Lasso Sweep'] },
];
const BODY_PARTS = ['Neck','Shoulder','Elbow','Wrist/Hand','Ribs','Lower Back','Hip','Knee','Ankle/Foot','Fingers/Toes'];
const INJURY_TYPES = ['Strain','Sprain','Bruise','Pop/Crack','Soreness','Cut','Burn','Tweak'];
const DRILL_CATS = [
  { id: 'guard', label: '🛡️ Guard' },{ id: 'passing', label: '🚀 Passing' },{ id: 'takedown', label: '🤼 Takedown' },
  { id: 'submission', label: '🔒 Submission' },{ id: 'sweep', label: '🔄 Sweep' },
];

function fmt(sec) { const m = Math.floor(sec/60), s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function fmtLong(sec) { const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; }
function todayStr() { return new Date().toISOString().split('T')[0]; }

// members = gym_leaderboard rows: flat { user_id, display_name, avatar_url, belt }
function MemberAvatar({ m, size = 28 }) {
  if (m?.avatar_url) {
    return <img src={m.avatar_url} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e=>{e.target.style.display='none';}} />;
  }
  const init = (m?.display_name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  return <span style={{ width:size, height:size, borderRadius:'50%', background:'#2a2a3a', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, color:'var(--text-dim)', flexShrink:0 }}>{init}</span>;
}

function BeltDot({ belt, size = 10 }) {
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:BELT_COLORS[belt]||'#888', border:belt==='white'?'1px solid #999':'none', flexShrink:0 }} />;
}

function MemberDropdown({ members, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = members.find(m => m.user_id === value);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width:'100%', padding:'9px 12px', borderRadius:8,
        background:'rgba(255,255,255,.04)', border:`1px solid ${open?'var(--accent)':'var(--border)'}`,
        color:selected?'#f0ece2':'var(--text-muted)', fontSize:13,
        display:'flex', alignItems:'center', gap:8, cursor:'pointer', textAlign:'left',
      }}>
        {selected ? (
          <>
            <MemberAvatar m={selected} size={22} />
            <span style={{ flex:1 }}>{selected.display_name}</span>
            <BeltDot belt={selected.belt} />
            <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{selected.belt}</span>
          </>
        ) : (
          <span style={{ flex:1 }}>Choose a training partner...</span>
        )}
        <span style={{ color:'var(--text-muted)', fontSize:10 }}>{open?'▲':'▼'}</span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:8, marginTop:4, boxShadow:'0 8px 24px rgba(0,0,0,.5)', maxHeight:240, overflowY:'auto' }}>
          {members.length === 0 && <div style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>No other members found</div>}
          {members.map(m => (
            <div key={m.user_id} onClick={() => { onChange(m.user_id); setOpen(false); }}
              style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', background:m.user_id===value?'rgba(123,45,142,.15)':'transparent', borderBottom:'1px solid rgba(255,255,255,.04)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
              onMouseLeave={e=>e.currentTarget.style.background=m.user_id===value?'rgba(123,45,142,.15)':'transparent'}
            >
              <MemberAvatar m={m} size={28} />
              <span style={{ flex:1, fontSize:13, color:'#f0ece2', fontWeight:500 }}>{m.display_name}</span>
              <BeltDot belt={m.belt} size={12} />
              <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{m.belt||'white'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OpponentPicker({ members, value, onChange }) {
  const [mode, setMode] = useState(value?.type || null);
  const [guestName, setGuestName] = useState(value?.guestName || '');
  const [guestBelt, setGuestBelt] = useState(value?.guestBelt || 'white');

  function selectMode(m) { setMode(m); onChange(m ? { type:m, memberId:'', guestName:'', guestBelt:'white' } : null); }
  function handleMember(id) { const m = members.find(x=>x.user_id===id); onChange({ type:'member', memberId:id, memberName:m?.display_name||'', guestName:'', guestBelt:m?.belt||'white' }); }
  function handleGuestName(n) { setGuestName(n); onChange({ type:'guest', memberId:'', memberName:'', guestName:n, guestBelt }); }
  function handleGuestBelt(b) { setGuestBelt(b); onChange({ type:'guest', memberId:'', memberName:'', guestName, guestBelt:b }); }

  return (
    <div>
      <div style={{ fontSize:11, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:1, fontWeight:600, marginBottom:8 }}>Who did you roll with?</div>
      <div style={{ display:'flex', gap:5, marginBottom:8 }}>
        {[{id:null,l:'Skip'},{id:'member',l:'🏋️ Gym member'},{id:'guest',l:'🥋 Guest'}].map(o => (
          <button key={String(o.id)} type="button" onClick={() => selectMode(o.id)} style={{ flex:1, padding:'7px 6px', fontSize:11, fontWeight:600, borderRadius:8, border:'none', cursor:'pointer', background:mode===o.id?'var(--accent)':'rgba(255,255,255,.04)', color:mode===o.id?'#fff':'var(--text-dim)' }}>{o.l}</button>
        ))}
      </div>
      {mode === 'member' && <MemberDropdown members={members} value={value?.memberId||''} onChange={handleMember} />}
      {mode === 'guest' && (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input className="input" placeholder="Opponent name" value={guestName} onChange={e=>handleGuestName(e.target.value)} style={{ flex:1 }} />
          <div style={{ display:'flex', gap:4 }}>
            {BELTS.map(b => <button key={b} type="button" onClick={() => handleGuestBelt(b)} title={b} style={{ width:20, height:20, borderRadius:'50%', border:guestBelt===b?'2px solid #fff':'2px solid transparent', background:BELT_COLORS[b], cursor:'pointer', padding:0, boxShadow:b==='white'?'inset 0 0 0 1px #aaa':'none' }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function InjuryCheckModal({ injuries, onDone }) {
  const [statuses, setStatuses] = useState(() => Object.fromEntries(injuries.map(i => [i.id, null])));
  const allAnswered = injuries.every(i => statuses[i.id] !== null);

  async function confirm() {
    for (const inj of injuries) {
      if (statuses[inj.id] === 'resolved') await supabase.from('injuries').update({ resolved_at:todayStr() }).eq('id', inj.id);
    }
    onDone();
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div className="card" style={{ width:'100%', maxWidth:380, padding:24 }}>
        <div style={{ fontSize:28, marginBottom:8, textAlign:'center' }}>🩹</div>
        <h3 style={{ fontFamily:'var(--font-d)', fontSize:20, marginBottom:4, textAlign:'center' }}>How are you feeling?</h3>
        <p style={{ fontSize:12, color:'var(--text-dim)', textAlign:'center', marginBottom:20 }}>You had some injuries. Still hurting?</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {injuries.map(inj => (
            <div key={inj.id} style={{ padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:8 }}>
              <div style={{ fontSize:13, color:'#ddd', marginBottom:8 }}>
                <span style={{ color:inj.severity==='serious'?'#ef5350':inj.severity==='moderate'?'#ffb74d':'#66bb6a', marginRight:6 }}>●</span>
                {inj.body_part} — {inj.injury_type}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setStatuses(s=>({...s,[inj.id]:'active'}))} style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', border:statuses[inj.id]==='active'?'1px solid #ef5350':'1px solid var(--border)', background:statuses[inj.id]==='active'?'rgba(239,83,80,.15)':'rgba(255,255,255,.03)', color:statuses[inj.id]==='active'?'#ef5350':'var(--text-dim)', fontSize:12, fontWeight:600 }}>Still hurts</button>
                <button onClick={() => setStatuses(s=>({...s,[inj.id]:'resolved'}))} style={{ flex:1, padding:'8px', borderRadius:8, cursor:'pointer', border:statuses[inj.id]==='resolved'?'1px solid #66bb6a':'1px solid var(--border)', background:statuses[inj.id]==='resolved'?'rgba(102,187,106,.15)':'rgba(255,255,255,.03)', color:statuses[inj.id]==='resolved'?'#66bb6a':'var(--text-dim)', fontSize:12, fontWeight:600 }}>All good ✓</button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={confirm} disabled={!allAnswered}>Continue to training</button>
      </div>
    </div>
  );
}

const BELTS_SIMPLE = ['white','blue','purple','brown','black'];
const BELT_DOT = { white:'#e0e0d0', blue:'#1a5fb4', purple:'#7b2d8e', brown:'#8b5e3c', black:'#1a1a1a' };
const RESULTS_SIMPLE = [{ id:'win', label:'V', color:'#66bb6a' }, { id:'draw', label:'N', color:'#ffb74d' }, { id:'loss', label:'D', color:'#ef5350' }];

function PastSessionRoundsAdder({ session, members, rounds, onAddRound, addingRound, setAddingRound, onDone }) {
  const [durationStr, setDurationStr] = useState('5:00');
  const [result, setResult] = useState(null);
  const [oppMode, setOppMode] = useState('solo');
  const [oppId, setOppId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestBelt, setGuestBelt] = useState('white');
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [direction, setDirection] = useState('offensive');
  const [pendingSub, setPendingSub] = useState(null);
  const [customTech, setCustomTech] = useState('');
  const [customCat, setCustomCat] = useState('submission');

  const sessionDate = new Date(session.checked_in_at).toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long' });

  function tapTechnique(cat, tech) {
    if (cat.askPosition) { setPendingSub({ catId: cat.id, technique: tech }); return; }
    setEvents(prev => [...prev, { event_type: cat.id, direction, technique: tech, position: null }]);
  }
  function confirmPos(pos) {
    setEvents(prev => [...prev, { event_type: pendingSub.catId, direction, technique: pendingSub.technique, position: pos }]);
    setPendingSub(null);
  }
  function addCustom() {
    if (!customTech.trim()) return;
    setEvents(prev => [...prev, { event_type: customCat, direction, technique: customTech.trim(), position: null }]);
    setCustomTech('');
  }

  async function handleAdd() {
    setSaving(true); setErr('');
    let oppName = '', oppBeltVal = 'white', oppIdVal = null;
    if (oppMode === 'member' && oppId) {
      const m = members.find(x => x.user_id === oppId);
      oppName = m?.display_name || ''; oppBeltVal = m?.belt || 'white'; oppIdVal = oppId;
    } else if (oppMode === 'guest') {
      oppName = guestName; oppBeltVal = guestBelt;
    }
    const error = await onAddRound({ durationStr, result, oppName, oppBelt: oppBeltVal, oppId: oppIdVal, events });
    if (error) setErr(error.message || 'Erreur');
    setSaving(false);
    if (!error) { setDurationStr('5:00'); setResult(null); setOppMode('solo'); setOppId(''); setGuestName(''); setEvents([]); setPendingSub(null); setDirection('offensive'); }
  }

  return (
    <div className="card" style={{ marginBottom:16, border:'1px solid rgba(102,187,106,.25)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:12, color:'#66bb6a', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>✓ Session sauvegardée</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sessionDate}</div>
        </div>
        <button onClick={onDone} style={{ padding:'6px 14px', borderRadius:8, background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>Terminé</button>
      </div>

      {rounds.length > 0 && (
        <div style={{ marginBottom:12 }}>
          {rounds.map((r, i) => (
            <div key={i} style={{ fontSize:12, color:'#aaa', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>{r._label}</div>
          ))}
        </div>
      )}

      {!addingRound ? (
        <button onClick={() => setAddingRound(true)} style={{ width:'100%', padding:'10px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px dashed rgba(255,255,255,.15)', color:'var(--text-dim)', fontSize:13, cursor:'pointer' }}>
          + Add round
        </button>
      ) : (
        <div style={{ paddingTop:12, borderTop:'1px solid rgba(255,255,255,.06)' }}>
          {/* Duration + Result */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <div>
              <div className="label">Durée (min:sec)</div>
              <input className="input" placeholder="5:00" value={durationStr} onChange={e => setDurationStr(e.target.value)} />
            </div>
            <div>
              <div className="label">Résultat</div>
              <div style={{ display:'flex', gap:4 }}>
                {RESULTS_SIMPLE.map(r => (
                  <button key={r.id} type="button" onClick={() => setResult(result === r.id ? null : r.id)} style={{ flex:1, padding:'10px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, background: result===r.id ? `${r.color}22` : 'rgba(255,255,255,.03)', color: result===r.id ? r.color : 'var(--text-dim)' }}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Opponent */}
          <div className="label">Adversaire</div>
          <div style={{ display:'flex', gap:4, marginBottom:8 }}>
            {['solo','member','guest'].map(m => (
              <button key={m} type="button" onClick={() => setOppMode(m)} style={{ flex:1, padding:'7px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, background: oppMode===m ? 'rgba(155,77,202,.2)' : 'rgba(255,255,255,.03)', color: oppMode===m ? 'var(--accent)' : 'var(--text-dim)' }}>
                {m === 'solo' ? 'Solo' : m === 'member' ? 'Membre' : 'Invité'}
              </button>
            ))}
          </div>
          {oppMode === 'member' && (
            <select className="input" value={oppId} onChange={e => setOppId(e.target.value)} style={{ marginBottom:8 }}>
              <option value="">-- Choisir --</option>
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name} ({m.belt})</option>)}
            </select>
          )}
          {oppMode === 'guest' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:8 }}>
              <input className="input" placeholder="Opponent name" value={guestName} onChange={e => setGuestName(e.target.value)} />
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                {BELTS_SIMPLE.map(b => (
                  <button key={b} type="button" onClick={() => setGuestBelt(b)} style={{ width:18, height:18, borderRadius:'50%', background:BELT_DOT[b], border: guestBelt===b ? '2px solid white' : '2px solid transparent', cursor:'pointer', padding:0 }} />
                ))}
              </div>
            </div>
          )}

          {/* Techniques & Events — same as CheckIn live round */}
          <div style={{ marginBottom:10 }}>
            <div className="label" style={{ marginBottom:8 }}>Techniques & Événements</div>

            {/* I did / Done to me */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, borderRadius:10, overflow:'hidden', marginBottom:12, border:'1px solid var(--border)' }}>
              {[{d:'offensive',l:'✅ I did',c:'#66bb6a'},{d:'defensive',l:'😤 Done to me',c:'#ef5350'}].map(x => (
                <button key={x.d} type="button" onClick={() => setDirection(x.d)} style={{ padding:'11px 0', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background: direction===x.d ? `${x.c}18` : 'transparent', color: direction===x.d ? x.c : 'var(--text-muted)' }}>{x.l}</button>
              ))}
            </div>

            {/* Position picker */}
            {pendingSub && (
              <div style={{ marginBottom:12, padding:12, background:'rgba(123,45,142,.1)', borderRadius:10, border:'1px solid var(--accent)' }}>
                <div style={{ fontSize:12, color:'var(--accent)', marginBottom:8, fontWeight:600 }}>{pendingSub.technique} — from which position?</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
                  {POSITIONS.map(p => <button key={p} type="button" onClick={() => confirmPos(p)} style={{ padding:'7px 14px', fontSize:12, borderRadius:16, cursor:'pointer', background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'#ccc' }}>{p}</button>)}
                </div>
                <button type="button" onClick={() => { setEvents(prev => [...prev, { event_type: pendingSub.catId, direction, technique: pendingSub.technique, position: null }]); setPendingSub(null); }} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>Skip position</button>
              </div>
            )}

            {/* Logged events chips */}
            {events.length > 0 && (
              <div style={{ marginBottom:12, display:'flex', flexWrap:'wrap', gap:5 }}>
                {events.map((e,i) => (
                  <span key={i} onClick={() => setEvents(ev => ev.filter((_,j)=>j!==i))} style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:16, fontSize:11, cursor:'pointer', fontWeight:500, background: e.direction==='offensive'?'rgba(102,187,106,.12)':'rgba(239,83,80,.12)', color: e.direction==='offensive'?'#66bb6a':'#ef5350' }}>
                    {e.direction==='offensive'?'✅':'😤'} {e.technique}{e.position?` (${e.position})`:''} ×
                  </span>
                ))}
              </div>
            )}

            {/* Category sections */}
            {CATEGORIES.map(cat => (
              <div key={cat.id} style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:cat.color, textTransform:'uppercase', letterSpacing:1, fontWeight:700, marginBottom:5 }}>{cat.label}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {cat.techniques.map(t => <button key={t} type="button" onClick={() => tapTechnique(cat, t)} style={{ padding:'6px 12px', fontSize:12, borderRadius:16, cursor:'pointer', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', color:'#bbb' }}>{t}</button>)}
                </div>
              </div>
            ))}

            {/* Custom */}
            <div style={{ display:'flex', gap:6 }}>
              <select value={customCat} onChange={e => setCustomCat(e.target.value)} style={{ padding:'7px 8px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11 }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input className="input" placeholder="Other..." value={customTech} onChange={e => setCustomTech(e.target.value)} onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addCustom(); } }} style={{ flex:1, padding:'7px 10px', fontSize:12 }} />
              <button type="button" onClick={addCustom} style={{ padding:'7px 12px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>+</button>
            </div>
          </div>

          {err && <div style={{ color:'#ef5350', fontSize:12, marginBottom:8 }}>⚠️ {err}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-small" onClick={handleAdd} disabled={saving} style={{ flex:2 }}>{saving ? '...' : 'Save round'}</button>
            <button onClick={() => setAddingRound(false)} style={{ flex:1, padding:'10px', borderRadius:8, background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [roundOpponent, setRoundOpponent] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [matchedCurr, setMatchedCurr] = useState(null);
  const [members, setMembers] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [injPart, setInjPart] = useState('Knee');
  const [injType, setInjType] = useState('Soreness');
  const [injSev, setInjSev] = useState('minor');
  const [pendingSub, setPendingSub] = useState(null);
  const [techs, setTechs] = useState([]);
  const [techName, setTechName] = useState('');
  const [techCat, setTechCat] = useState('guard');
  const [pastDate, setPastDate] = useState('');
  const [pastStart, setPastStart] = useState('18:00');
  const [pastEnd, setPastEnd] = useState('19:30');
  const [pastType, setPastType] = useState('gi');
  const [pastEnergy, setPastEnergy] = useState(3);
  const [pastNote, setPastNote] = useState('');
  const [pastError, setPastError] = useState('');
  const [pastCurriculum, setPastCurriculum] = useState(null);
  const [pastCreatedSession, setPastCreatedSession] = useState(null);
  const [pastRounds, setPastRounds] = useState([]);
  const [addingPastRound, setAddingPastRound] = useState(false);
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [injuryCheck, setInjuryCheck] = useState(null);

  useEffect(() => { if (user && gym) load(); }, [user, gym]);
  useEffect(() => { if (!checkin) return; const i = setInterval(() => setElapsed(Math.floor((Date.now()-new Date(checkin.checked_in_at).getTime())/1000)),1000); return () => clearInterval(i); }, [checkin]);
  useEffect(() => { if (!round||phase!=='main') return; const i = setInterval(() => setRoundTime(Math.floor((Date.now()-new Date(round.started_at).getTime())/1000)),1000); return () => clearInterval(i); }, [round, phase]);
  useEffect(() => {
    if (!pastDate || !gym) { setPastCurriculum(null); return; }
    supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id',gym.id).eq('class_date',pastDate)
      .then(({data}) => setPastCurriculum(data?.length ? data : null));
  }, [pastDate, gym]);

  async function load() {
    const { data: c } = await supabase.from('checkins').select('*').eq('user_id',user.id).eq('gym_id',gym.id).is('checked_out_at',null).order('checked_in_at',{ascending:false}).limit(1).maybeSingle();
    setCheckin(c || null);
    if (c) {
      const [{ data: r }, { data: dr }] = await Promise.all([
        supabase.from('rounds').select('*').eq('checkin_id',c.id).is('ended_at',null).limit(1).maybeSingle(),
        supabase.from('rounds').select('*').eq('checkin_id',c.id).not('ended_at','is',null).order('round_number'),
      ]);
      setRound(r || null); setDoneRounds(dr || []);
      const { data: curr } = await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id',gym.id).eq('class_date',c.checked_in_at.split('T')[0]);
      if (curr?.length) setMatchedCurr(curr);
    }

    // Use gym_leaderboard + gym_contacts (virtual members added by owner)
    const [{ data: lb }, { data: contacts }] = await Promise.all([
      supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id),
      supabase.from('gym_contacts').select('*').eq('gym_id', gym.id),
    ]);
    const realMembers = (lb || []).filter(m => m.user_id !== user.id);
    const virtualMembers = (contacts || []).map(c => ({
      user_id: `contact_${c.id}`,
      display_name: c.display_name,
      belt: c.belt || 'white',
      stripes: c.stripes || 0,
      is_contact: true,
    }));
    setMembers([...realMembers, ...virtualMembers]);

    const { data: rec } = await supabase.from('checkins').select('*').eq('user_id',user.id).eq('gym_id',gym.id).not('checked_out_at','is',null).order('checked_in_at',{ascending:false}).limit(20);
    setRecent(rec || []);

    if (!c) {
      const { data: activeInj } = await supabase.from('injuries').select('*').eq('user_id',user.id).is('resolved_at',null);
      if (activeInj?.length) {
        const injCheckKey = `injuryChecked_${user.id}`;
        const lastChecked = localStorage.getItem(injCheckKey);
        if (lastChecked !== todayStr()) {
          setInjuryCheck(activeInj);
          localStorage.setItem(injCheckKey, todayStr());
        }
      }
    }
    setLoading(false);
  }

  async function doCheckIn() {
    setBusy(true);
    const { data } = await supabase.from('checkins').insert({ user_id:user.id, gym_id:gym.id, session_type:selType }).select().single();
    if (data) {
      setCheckin(data); setDoneRounds([]); setRound(null);
      const { data: curr } = await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id',gym.id).eq('class_date',data.checked_in_at.split('T')[0]);
      if (curr?.length) setMatchedCurr(curr);
    }
    setBusy(false);
  }

  async function doStartRound() {
    setBusy(true);
    const { data } = await supabase.from('rounds').insert({ checkin_id:checkin.id, user_id:user.id, gym_id:gym.id, round_number:doneRounds.length+1 }).select().single();
    if (data) setRound(data);
    setBusy(false);
  }

  function doEndRoundPrompt() {
    setFrozenRoundTime(roundTime);
    setEvents([]); setDirection('offensive'); setCustomTech(''); setPendingSub(null); setRoundOpponent(null);
    setPhase('round_log');
  }

  function tapTechnique(cat, tech) {
    if (cat.askPosition) { setPendingSub({ catId:cat.id, technique:tech }); return; }
    setEvents(prev => [...prev, { event_type:cat.id, direction, technique:tech, position:null }]);
  }
  function confirmSubPosition(pos) {
    if (!pendingSub) return;
    setEvents(prev => [...prev, { event_type:pendingSub.catId, direction, technique:pendingSub.technique, position:pos }]);
    setPendingSub(null);
  }
  function addCustom() { if (!customTech.trim()) return; setEvents(prev => [...prev, { event_type:customCat, direction, technique:customTech.trim(), position:null }]); setCustomTech(''); }
  function removeEvent(i) { setEvents(prev => prev.filter((_,j)=>j!==i)); }

  async function doEndRound(skip = false) {
    setBusy(true);
    const opp = roundOpponent;
    const updates = { ended_at: new Date().toISOString() };
    if (opp?.type==='member' && opp.memberId) {
      updates.opponent_id = opp.memberId;
      updates.opponent_name = opp.memberName || null;
      updates.opponent_belt = members.find(m=>m.user_id===opp.memberId)?.belt || null;
    } else if (opp?.type==='guest' && opp.guestName) {
      updates.opponent_name = opp.guestName;
      updates.opponent_belt = opp.guestBelt || null;
    }
    await supabase.from('rounds').update(updates).eq('id',round.id);
    if (!skip && events.length>0) {
      await supabase.from('round_events').insert(events.map(e => ({ round_id:round.id, checkin_id:checkin.id, user_id:user.id, gym_id:gym.id, event_type:e.event_type, direction:e.direction, technique:e.technique, position:e.position })));
    }
    setDoneRounds(prev => [...prev, { ...round, ...updates, duration_seconds:frozenRoundTime, _events:skip?[]:events, _oppName:opp?.type==='member'?opp.memberName:opp?.guestName, _oppBelt:updates.opponent_belt }]);
    setRound(null); setPhase('main'); setBusy(false);
  }

  function doCheckOutPrompt() { setEnergy(null); setNote(''); setInjuries([]); setTechs([]); setTechName(''); setTechCat('guard'); setPhase('debrief'); }
  function addInjury() { setInjuries(prev => [...prev, { body_part:injPart, injury_type:injType, severity:injSev }]); }
  function addTech() { if (!techName.trim()) return; setTechs(prev => [...prev, { name:techName.trim(), category:techCat }]); setTechName(''); }

  async function doCheckOut(skip = false) {
    setBusy(true);
    if (round) await supabase.from('rounds').update({ ended_at:new Date().toISOString() }).eq('id',round.id);
    const updates = { checked_out_at: new Date().toISOString() };
    if (!skip && energy) updates.energy_rating = energy;
    if (!skip && note.trim()) updates.note = note.trim();
    await supabase.from('checkins').update(updates).eq('id',checkin.id);
    if (!skip && injuries.length>0) await supabase.from('injuries').insert(injuries.map(inj => ({ user_id:user.id, checkin_id:checkin.id, body_part:inj.body_part, injury_type:inj.injury_type, severity:inj.severity })));
    if (!skip && techs.length>0) await supabase.from('techniques').insert(techs.map(t => ({ checkin_id:checkin.id, user_id:user.id, gym_id:gym.id, name:t.name, category:t.category })));
    setCheckin(null); setRound(null); setDoneRounds([]); setMatchedCurr(null); setPhase('main'); setBusy(false); load();
  }

  async function addPastSession(e) {
    e.preventDefault(); setBusy(true); setPastError('');
    try {
      const startDt = new Date(`${pastDate}T${pastStart}:00`);
      const endDt = new Date(`${pastDate}T${pastEnd}:00`);
      if (isNaN(startDt.getTime())||isNaN(endDt.getTime())) throw new Error('Invalid date/time');
      if (endDt <= startDt) throw new Error('End time must be after start time');
      const { data: ins, error: err } = await supabase.from('checkins').insert({
        user_id:user.id, gym_id:gym.id, session_type:pastType,
        checked_in_at:startDt.toISOString(), checked_out_at:endDt.toISOString(),
        energy_rating:pastEnergy, note:pastNote.trim()||null,
      }).select().single();
      if (err) throw err;
      // Auto-import curriculum techniques if a class matches this date
      if (pastCurriculum?.length && ins) {
        const allTechs = pastCurriculum.flatMap(cls => (cls.curriculum_techniques||[]).map(t => ({ checkin_id:ins.id, user_id:user.id, gym_id:gym.id, name:t.name, category:t.category, created_at:ins.checked_in_at })));
        if (allTechs.length>0) await supabase.from('techniques').insert(allTechs);
      }
      setShowPast(false);
      setPastDate(''); setPastNote(''); setPastCurriculum(null);
      setPastCreatedSession(ins);
      setPastRounds([]);
    } catch(err) { setPastError(err.message||'Failed to save session'); }
    setBusy(false); load();
  }

  async function addRoundToPastSession(roundInfo) {
    if (!pastCreatedSession) return;
    const { durationStr, result, oppName, oppBelt, oppId, events: roundEvents = [] } = roundInfo;
    const parseSec = (s) => { const p = s.split(':'); if (p.length === 2) return parseInt(p[0])*60+parseInt(p[1]||0); return parseInt(s||0)*60; };
    const duration_seconds = parseSec(durationStr);
    const startedAt = new Date(pastCreatedSession.checked_in_at);
    const endedAt = new Date(startedAt.getTime() + (duration_seconds || 0) * 1000);
    const roundData = {
      checkin_id: pastCreatedSession.id,
      user_id: user.id,
      gym_id: gym.id,
      round_number: pastRounds.length + 1,
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
    const { data: newRound, error } = await supabase.from('rounds').insert(roundData).select().single();
    if (!error && newRound) {
      if (roundEvents.length > 0) {
        await supabase.from('round_events').insert(roundEvents.map(e => ({
          round_id: newRound.id, checkin_id: pastCreatedSession.id,
          user_id: user.id, gym_id: gym.id,
          event_type: e.event_type, direction: e.direction,
          technique: e.technique, position: e.position || null,
        })));
      }
      setPastRounds(prev => [...prev, { ...roundData, _label: `Round ${pastRounds.length + 1}${oppName ? ' vs ' + oppName : ''}${result ? ' · ' + result : ''}${roundEvents.length ? ` · ${roundEvents.length} évts` : ''}` }]);
      setAddingPastRound(false);
    }
    return error;
  }

  function toggleSelect(id) { setSelectedSessions(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleSelectAll() { setSelectedSessions(selectedSessions.size===recent.length?new Set():new Set(recent.map(s=>s.id))); }
  async function deleteSelected() { if (!confirm(`Delete ${selectedSessions.size} session(s)?`)) return; await supabase.from('checkins').delete().in('id',[...selectedSessions]); setSelectedSessions(new Set()); setSelectMode(false); load(); }
  async function deleteSingle(id) { if (!confirm('Delete this session?')) return; await supabase.from('checkins').delete().eq('id',id); load(); }

  function oppLabel(r) { const name = r._oppName||r.opponent_name; return name ? `vs ${name.split(' ')[0]}` : null; }
  function oppBelt(r) { return r._oppBelt||r.opponent_belt||null; }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-dim)' }}>Loading...</div>;
  if (injuryCheck) return <InjuryCheckModal injuries={injuryCheck} onDone={() => setInjuryCheck(null)} />;

  // ─── ROUND LOG ───
  if (phase === 'round_log') {
    const offC = events.filter(e=>e.direction==='offensive').length;
    const defC = events.filter(e=>e.direction==='defensive').length;
    return (
      <div className="container fade-in" style={{ paddingTop:24, paddingBottom:100 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          <div><h2 style={{ fontFamily:'var(--font-d)', fontSize:22 }}>Round {doneRounds.length+1}</h2><p style={{ color:'var(--text-dim)', fontSize:14 }}>{fmt(frozenRoundTime)}</p></div>
          {events.length>0 && <div style={{ fontSize:12, alignSelf:'center' }}><span style={{ color:'#66bb6a' }}>+{offC}</span><span style={{ color:'#ef5350', marginLeft:8 }}>-{defC}</span></div>}
        </div>

        <div className="card" style={{ marginBottom:14, padding:14 }}>
          <OpponentPicker members={members} value={roundOpponent} onChange={setRoundOpponent} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, borderRadius:10, overflow:'hidden', marginBottom:14, border:'1px solid var(--border)' }}>
          {[{d:'offensive',l:"✅ I did",c:'#66bb6a'},{d:'defensive',l:"😤 Done to me",c:'#ef5350'}].map(x => (
            <button key={x.d} onClick={() => setDirection(x.d)} style={{ padding:'11px 0', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', background:direction===x.d?`${x.c}18`:'transparent', color:direction===x.d?x.c:'var(--text-muted)' }}>{x.l}</button>
          ))}
        </div>

        {pendingSub && (
          <div className="card" style={{ marginBottom:14, border:'1px solid var(--accent)', padding:14 }}>
            <div style={{ fontSize:12, color:'var(--accent)', marginBottom:8 }}>{pendingSub.technique} — from which position?</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {POSITIONS.map(p => <button key={p} onClick={() => confirmSubPosition(p)} style={{ padding:'7px 14px', fontSize:12, borderRadius:16, cursor:'pointer', background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'#ccc' }}>{p}</button>)}
            </div>
            <button onClick={() => setPendingSub(null)} style={{ marginTop:8, background:'none', border:'none', color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>Cancel</button>
          </div>
        )}

        {events.length>0 && (
          <div style={{ marginBottom:14, display:'flex', flexWrap:'wrap', gap:5 }}>
            {events.map((e,i) => <span key={i} onClick={() => removeEvent(i)} style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:16, fontSize:11, cursor:'pointer', fontWeight:500, background:e.direction==='offensive'?'rgba(102,187,106,.12)':'rgba(239,83,80,.12)', color:e.direction==='offensive'?'#66bb6a':'#ef5350' }}>{e.direction==='offensive'?'✅':'😤'} {e.technique}{e.position?` (${e.position})`:''} ×</span>)}
          </div>
        )}

        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:cat.color||'var(--text-dim)', textTransform:'uppercase', letterSpacing:1, fontWeight:700, marginBottom:5 }}>{cat.label}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {cat.techniques.map(t => <button key={t} onClick={() => tapTechnique(cat,t)} style={{ padding:'6px 12px', fontSize:12, borderRadius:16, cursor:'pointer', background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', color:'#bbb' }}>{t}</button>)}
            </div>
          </div>
        ))}

        <div style={{ marginBottom:18, display:'flex', gap:6 }}>
          <select value={customCat} onChange={e=>setCustomCat(e.target.value)} style={{ padding:'7px 8px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11 }}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className="input" placeholder="Other..." value={customTech} onChange={e=>setCustomTech(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustom();}}} style={{ flex:1, padding:'7px 10px', fontSize:12 }} />
          <button onClick={addCustom} style={{ padding:'7px 12px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>+</button>
        </div>

        <button className="btn btn-primary" onClick={() => doEndRound(false)} disabled={busy} style={{ marginBottom:8 }}>Save Round{events.length>0?` · ${events.length} events`:''}</button>
        <button className="btn btn-secondary" onClick={() => doEndRound(true)} disabled={busy}>Skip</button>
      </div>
    );
  }

  // ─── DEBRIEF ───
  if (phase === 'debrief') {
    return (
      <div className="container fade-in" style={{ paddingTop:32, paddingBottom:100 }}>
        <h2 style={{ fontFamily:'var(--font-d)', fontSize:22, marginBottom:4 }}>Session done</h2>
        <p style={{ color:'var(--text-dim)', fontSize:14, marginBottom:20 }}>{fmtLong(elapsed)} · {doneRounds.length} round{doneRounds.length!==1?'s':''}</p>

        <div className="card" style={{ marginBottom:16 }}>
          <div className="label">How did it feel?</div>
          <div style={{ display:'flex', gap:6 }}>
            {ENERGY.map(e => (
              <button key={e.val} onClick={() => setEnergy(e.val)} style={{ flex:1, padding:'12px 0', borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:energy===e.val?'var(--accent)':'rgba(255,255,255,.03)', border:energy===e.val?'1px solid var(--accent)':'1px solid var(--border)' }}>
                <span style={{ fontSize:20 }}>{e.emoji}</span>
                <span style={{ fontSize:10, color:energy===e.val?'#fff':'var(--text-muted)' }}>{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom:16 }}>
          <div className="label">Techniques Drilled</div>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>What the coach taught before rolling</p>
          <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
            {DRILL_CATS.map(c => <button key={c.id} onClick={() => setTechCat(c.id)} style={{ padding:'5px 10px', fontSize:11, borderRadius:8, border:'none', cursor:'pointer', background:techCat===c.id?'var(--accent)':'rgba(255,255,255,.04)', color:techCat===c.id?'#fff':'var(--text-dim)' }}>{c.label}</button>)}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input className="input" placeholder="e.g. Scissor sweep from closed guard" value={techName} onChange={e=>setTechName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTech();}}} style={{ flex:1 }} />
            <button className="btn btn-secondary btn-small" onClick={addTech}>+</button>
          </div>
          {techs.length>0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
              {techs.map((t,i) => <span key={i} onClick={() => setTechs(p=>p.filter((_,j)=>j!==i))} style={{ padding:'4px 10px', borderRadius:16, fontSize:11, cursor:'pointer', background:'rgba(155,77,202,.12)', color:'#ce93d8', border:'1px solid rgba(155,77,202,.2)' }}>{DRILL_CATS.find(c=>c.id===t.category)?.label?.slice(0,2)} {t.name} ×</span>)}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom:16 }}>
          <div className="label">Any injuries?</div>
          {injuries.length>0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
              {injuries.map((inj,i) => <span key={i} onClick={() => setInjuries(p=>p.filter((_,j)=>j!==i))} style={{ padding:'4px 10px', borderRadius:16, fontSize:11, cursor:'pointer', background:inj.severity==='serious'?'rgba(239,83,80,.15)':'rgba(255,255,255,.06)', color:inj.severity==='serious'?'#ef5350':'#aaa' }}>🩹 {inj.body_part} — {inj.injury_type} ×</span>)}
            </div>
          )}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <select value={injPart} onChange={e=>setInjPart(e.target.value)} style={{ padding:'7px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'#ccc', fontSize:12 }}>{BODY_PARTS.map(p=><option key={p}>{p}</option>)}</select>
            <select value={injType} onChange={e=>setInjType(e.target.value)} style={{ padding:'7px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'#ccc', fontSize:12 }}>{INJURY_TYPES.map(t=><option key={t}>{t}</option>)}</select>
            <select value={injSev} onChange={e=>setInjSev(e.target.value)} style={{ padding:'7px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'#ccc', fontSize:12 }}>
              <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="serious">Serious</option>
            </select>
            <button onClick={addInjury} style={{ padding:'7px 12px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>+ Add</button>
          </div>
        </div>

        {matchedCurr?.length>0 && (
          <div className="card" style={{ marginBottom:16 }}>
            <div className="label">Today's Class</div>
            {matchedCurr.map(cls => (cls.curriculum_techniques||[]).map((t,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0' }}>
                <CategoryBadge category={t.category} size="small" />
                <span style={{ fontSize:13, color:'#ddd' }}>{t.name}</span>
                {t.youtube_url && <a href={t.youtube_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'#f44', textDecoration:'none', marginLeft:'auto' }}>▶</a>}
              </div>
            )))}
          </div>
        )}

        <div className="card" style={{ marginBottom:20 }}>
          <div className="label">Note</div>
          <textarea className="input" placeholder="Anything to remember?" value={note} onChange={e=>setNote(e.target.value)} rows={2} style={{ resize:'none' }} />
        </div>
        <button className="btn btn-primary" onClick={() => doCheckOut(false)} disabled={busy} style={{ marginBottom:8 }}>Save & Check Out</button>
        <button className="btn btn-secondary" onClick={() => doCheckOut(true)} disabled={busy}>Just Check Out</button>
      </div>
    );
  }

  // ─── MAIN ───
  return (
    <div className="container" style={{ paddingTop:32, paddingBottom:100 }}>
      <div style={{ marginBottom:24 }}>
        <p style={{ color:'var(--text-dim)', fontSize:13 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
        <h1 style={{ fontFamily:'var(--font-d)', fontSize:24, fontWeight:400, marginTop:4 }}>{checkin ? "You're on the mat 🟢" : `Hey ${profile?.display_name?.split(' ')[0]||'there'}`}</h1>
      </div>

      {checkin ? (
        <div className="fade-in">
          <div className="card" style={{ textAlign:'center', padding:24, border:`1px solid ${SESSION_TYPES.find(t=>t.id===checkin.session_type)?.color}40`, marginBottom:16 }}>
            <div style={{ fontSize:12, color:SESSION_TYPES.find(t=>t.id===checkin.session_type)?.color, textTransform:'uppercase', letterSpacing:2, fontWeight:700, marginBottom:4 }}>{SESSION_TYPES.find(t=>t.id===checkin.session_type)?.label}</div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:48, color:'#f0ece2', margin:'6px 0' }}>{fmtLong(elapsed)}</div>
          </div>

          <div className="card" style={{ marginBottom:16, padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#ccc', textTransform:'uppercase', letterSpacing:1 }}>Rounds</span>
              <span style={{ color:'var(--text-dim)', fontSize:13, fontFamily:'var(--font-d)' }}>{doneRounds.length+(round?1:0)}</span>
            </div>
            {round ? (
              <>
                <div className="card" style={{ textAlign:'center', padding:20, marginBottom:12, border:'1px solid #66bb6a', background:'rgba(102,187,106,.04)' }}>
                  <div style={{ fontSize:10, color:'#66bb6a', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>Round {doneRounds.length+1}</div>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:40, color:'#f0ece2', margin:'8px 0' }}>{fmt(roundTime)}</div>
                </div>
                <button className="btn btn-danger" onClick={doEndRoundPrompt} disabled={busy}>End Round</button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={doStartRound} disabled={busy} style={{ fontSize:15, padding:'16px 24px' }}>Start Round {doneRounds.length+1}</button>
            )}
            {doneRounds.length>0 && (
              <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:4 }}>
                {doneRounds.map((r,i) => {
                  const opp = oppLabel(r); const belt = oppBelt(r); const ev = r._events||[];
                  return (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:'rgba(255,255,255,.02)', borderRadius:6, fontSize:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ color:'#888' }}>R{r.round_number}</span>
                        {opp && <span style={{ color:'var(--text-dim)', display:'flex', alignItems:'center', gap:4 }}>{belt&&<BeltDot belt={belt} size={8}/>}{opp}</span>}
                        {ev.length>0 && <span style={{ color:'var(--text-muted)', fontSize:10 }}>{ev.map(e=>e.technique).join(', ')}</span>}
                      </div>
                      <span style={{ color:'var(--text-dim)', fontFamily:'var(--font-d)' }}>{fmt(r.duration_seconds||0)}</span>
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
          <div style={{ marginBottom:24 }}>
            <div className="label">Session type</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {SESSION_TYPES.map(t => (
                <button key={t.id} onClick={() => setSelType(t.id)} style={{ padding:'22px 8px', background:selType===t.id?`${t.color}15`:'rgba(255,255,255,.02)', border:selType===t.id?`2px solid ${t.color}`:'1px solid var(--border)', borderRadius:12, cursor:'pointer' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:selType===t.id?t.color:'var(--text-dim)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={doCheckIn} disabled={busy} style={{ padding:'20px 24px', fontSize:17, marginBottom:16 }}>{busy?'...':'Check In'}</button>

          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <button onClick={() => { setShowPast(!showPast); setShowRecent(false); }} style={{ flex:1, padding:'10px', borderRadius:8, background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>{showPast?'✕ Cancel':'+ Past Session'}</button>
            <button onClick={() => { setShowRecent(!showRecent); setShowPast(false); }} style={{ flex:1, padding:'10px', borderRadius:8, background:'rgba(255,255,255,.03)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>{showRecent?'✕ Hide':'Recent'}</button>
          </div>

          {showPast && (
            <form onSubmit={addPastSession} className="card" style={{ marginBottom:16 }}>
              <div className="label">Log Past Session</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                <input className="input" type="date" value={pastDate} onChange={e=>setPastDate(e.target.value)} required />
                <input className="input" type="time" value={pastStart} onChange={e=>setPastStart(e.target.value)} required />
                <input className="input" type="time" value={pastEnd} onChange={e=>setPastEnd(e.target.value)} required />
              </div>
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                {SESSION_TYPES.map(t => <button key={t.id} type="button" onClick={() => setPastType(t.id)} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background:pastType===t.id?`${t.color}20`:'rgba(255,255,255,.03)', color:pastType===t.id?t.color:'var(--text-dim)' }}>{t.label}</button>)}
              </div>
              <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                {ENERGY.map(e => <button key={e.val} type="button" onClick={() => setPastEnergy(e.val)} style={{ flex:1, padding:'6px', fontSize:16, borderRadius:8, border:pastEnergy===e.val?'1px solid var(--accent)':'1px solid var(--border)', background:pastEnergy===e.val?'rgba(155,77,202,.15)':'transparent', cursor:'pointer' }}>{e.emoji}</button>)}
              </div>
              {pastCurriculum && (
                <div style={{ padding:'10px 12px', background:'rgba(123,45,142,.08)', borderRadius:8, border:'1px solid rgba(123,45,142,.25)', marginBottom:10 }}>
                  <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700, marginBottom:6 }}>📚 Class found — techniques will be auto-imported to your training stats</div>
                  {pastCurriculum.map(cls => (cls.curriculum_techniques||[]).map((t,i) => <div key={i} style={{ fontSize:11, color:'#ccc', padding:'2px 0' }}>· {t.name}</div>))}
                </div>
              )}
              <input className="input" placeholder="Note (optional)" value={pastNote} onChange={e=>setPastNote(e.target.value)} style={{ marginBottom:10 }} />
              {pastError && <div style={{ color:'#ff6b6b', fontSize:12, marginBottom:8, padding:'6px 10px', background:'rgba(255,100,100,.08)', borderRadius:6 }}>{pastError}</div>}
              <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy?'Saving...':'Save'}</button>
            </form>
          )}

          {pastCreatedSession && !showPast && (
            <PastSessionRoundsAdder
              session={pastCreatedSession}
              members={members}
              rounds={pastRounds}
              onAddRound={addRoundToPastSession}
              addingRound={addingPastRound}
              setAddingRound={setAddingPastRound}
              onDone={() => { setPastCreatedSession(null); setPastRounds([]); }}
            />
          )}

          {showRecent && recent.length>0 && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontSize:12, color:'var(--text-dim)', fontWeight:600 }}>Recent Sessions</span>
                <div style={{ display:'flex', gap:6 }}>
                  {selectMode && selectedSessions.size>0 && <button onClick={deleteSelected} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(239,83,80,.15)', border:'1px solid rgba(239,83,80,.3)', color:'#ef5350', fontSize:11, cursor:'pointer', fontWeight:600 }}>Delete {selectedSessions.size}</button>}
                  {selectMode && <button onClick={toggleSelectAll} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }}>{selectedSessions.size===recent.length?'None':'All'}</button>}
                  <button onClick={() => { setSelectMode(!selectMode); setSelectedSessions(new Set()); }} style={{ padding:'4px 10px', borderRadius:6, background:selectMode?'rgba(123,45,142,.15)':'rgba(255,255,255,.04)', border:'1px solid var(--border)', color:selectMode?'var(--accent)':'var(--text-dim)', fontSize:11, cursor:'pointer' }}>{selectMode?'Done':'Select'}</button>
                </div>
              </div>
              {recent.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  {selectMode && <input type="checkbox" checked={selectedSessions.has(s.id)} onChange={() => toggleSelect(s.id)} style={{ width:16, height:16, accentColor:'var(--accent)', cursor:'pointer', flexShrink:0 }} />}
                  <div style={{ flex:1 }}>
                    <div>
                      <span style={{ fontSize:13, color:'#ccc' }}>{new Date(s.checked_in_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
                      <span style={{ fontSize:12, color:SESSION_TYPES.find(t=>t.id===s.session_type)?.color, marginLeft:8 }}>{s.session_type}</span>
                      {s.energy_rating && <span style={{ marginLeft:4 }}>{ENERGY[s.energy_rating-1]?.emoji}</span>}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {new Date(s.checked_in_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                      {' \u2192 '}
                      {s.checked_out_at ? new Date(s.checked_out_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '\u2026'}
                    </div>
                  </div>
                  {!selectMode && <button onClick={() => deleteSingle(s.id)} style={{ background:'none', border:'none', color:'#ef5350', cursor:'pointer', fontSize:11, padding:'2px 6px' }}>✕</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
