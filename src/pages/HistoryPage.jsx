import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SESSION_TYPES = [
  { id: 'gi', label: 'Gi', color: '#7b2d8e' },
  { id: 'nogi', label: 'No-Gi', color: '#6ec6ff' },
  { id: 'open_mat', label: 'Open Mat', color: '#ff8a65' },
];
const ENERGY = [{ val:1,emoji:'😵'},{val:2,emoji:'😮‍💨'},{val:3,emoji:'😐'},{val:4,emoji:'😊'},{val:5,emoji:'🔥'}];
const BELT_COLORS = { white:'#e8e8e0', blue:'#1a5fb4', purple:'#7b2d8e', brown:'#8b5e3c', black:'#444' };
const CATEGORIES = [
  { id: 'takedown', label: 'Takedowns', color: '#ffd54f', techniques: ['Single Leg','Double Leg','Arm Drag','Snap Down','Body Lock Takedown','Ankle Pick','Outside Trip','Inside Trip','Hip Throw','Shoulder Throw','Foot Sweep','Drop Throw','Guard Pull'] },
  { id: 'submission', label: 'Submissions', color: '#e57373', askPosition: true, techniques: ['Armbar','Triangle','RNC','Kimura','Guillotine','Darce','Omoplata','Loop Choke','Bow & Arrow','Ezekiel','Americana','Heel Hook','Knee Bar','Toe Hold','Baseball Choke','Cross Collar','Anaconda','North-South Choke','Gogoplata','Calf Slicer','Wrist Lock'] },
  { id: 'sweep', label: 'Sweeps', color: '#64b5f6', askPosition: true, techniques: ['Scissor Sweep','Hip Bump','Flower Sweep','Berimbolo','X-Guard Sweep','Butterfly Sweep','Pendulum','Tripod Sweep','Sickle Sweep','Elevator Sweep','Waiter Sweep'] },
];

function EventEditorHistory({ events, onChange }) {
  const [direction, setDirection] = useState('offensive');
  const [pendingSub, setPendingSub] = useState(null);
  const [customTech, setCustomTech] = useState('');
  const [customCat, setCustomCat] = useState('submission');

  function tapTechnique(cat, tech) {
    if (cat.askPosition) { setPendingSub({ catId: cat.id, technique: tech }); return; }
    onChange([...events, { event_type: cat.id, direction, technique: tech, position: null }]);
  }
  function confirmPos(pos) {
    onChange([...events, { event_type: pendingSub.catId, direction, technique: pendingSub.technique, position: pos }]);
    setPendingSub(null);
  }
  function addCustom() {
    if (!customTech.trim()) return;
    onChange([...events, { event_type: customCat, direction, technique: customTech.trim(), position: null }]);
    setCustomTech('');
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, borderRadius: 10, overflow: 'hidden', marginBottom: 12, border: '1px solid var(--border)' }}>
        {[{ d: 'offensive', l: '✅ I did', c: '#66bb6a' }, { d: 'defensive', l: '😤 Done to me', c: '#ef5350' }].map(x => (
          <button key={x.d} onClick={() => setDirection(x.d)} style={{ padding: '11px 0', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: direction === x.d ? `${x.c}18` : 'transparent', color: direction === x.d ? x.c : 'var(--text-muted)' }}>{x.l}</button>
        ))}
      </div>

      {pendingSub && (
        <div style={{ marginBottom: 12, padding: 12, background: 'rgba(123,45,142,.1)', borderRadius: 10, border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8, fontWeight: 600 }}>{pendingSub.technique} — from which position?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
            {POSITIONS.map(p => <button key={p} onClick={() => confirmPos(p)} style={{ padding: '7px 14px', fontSize: 12, borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: '#ccc' }}>{p}</button>)}
          </div>
          <button onClick={() => { onChange([...events, { event_type: pendingSub.catId, direction, technique: pendingSub.technique, position: null }]); setPendingSub(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>Skip position</button>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {events.map((e, i) => (
            <span key={i} onClick={() => onChange(events.filter((_, j) => j !== i))} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: 500, background: e.direction === 'offensive' ? 'rgba(102,187,106,.12)' : 'rgba(239,83,80,.12)', color: e.direction === 'offensive' ? '#66bb6a' : '#ef5350' }}>
              {e.direction === 'offensive' ? '✅' : '😤'} {e.technique}{e.position ? ` (${e.position})` : ''} ×
            </span>
          ))}
        </div>
      )}

      {CATEGORIES.map(cat => (
        <div key={cat.id} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: cat.color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>{cat.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {cat.techniques.map(t => (
              <button key={t} onClick={() => tapTechnique(cat, t)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', color: '#bbb' }}>{t}</button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <select value={customCat} onChange={e => setCustomCat(e.target.value)} style={{ padding: '7px 8px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 11 }}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input className="input" placeholder="Other..." value={customTech} onChange={e => setCustomTech(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} style={{ flex: 1, padding: '7px 10px', fontSize: 12 }} />
        <button onClick={addCustom} style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

function RoundEditModal({ round, members, onSave, onClose }) {
  const [durMin, setDurMin] = useState(round.started_at && round.ended_at ? Math.round((new Date(round.ended_at) - new Date(round.started_at)) / 60000) : '5');
  const [oppQuery, setOppQuery] = useState(round.opponent_name || '');
  const [oppId, setOppId] = useState(round.opponent_id || null);
  const [oppBelt, setOppBelt] = useState(round.opponent_belt || 'white');
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('round_events').select('*').eq('round_id', round.id).then(({ data }) => setEvents(data || []));
  }, [round.id]);

  const mFiltered = oppQuery && !oppId ? members.filter(m => (m.display_name || m.name || '').toLowerCase().includes(oppQuery.toLowerCase())) : [];

  async function save() {
    setBusy(true);
    const dur = parseInt(durMin) || 5;
    const newEnded = round.started_at ? new Date(new Date(round.started_at).getTime() + dur * 60000).toISOString() : round.ended_at;
    await supabase.from('rounds').update({ ended_at: newEnded, opponent_id: oppId || null, opponent_name: oppId ? null : (oppQuery.trim() || null), opponent_belt: oppBelt || null }).eq('id', round.id);
    await supabase.from('round_events').delete().eq('round_id', round.id);
    const toInsert = events.filter(e => e.technique).map(e => ({ round_id: round.id, user_id: round.user_id, gym_id: round.gym_id, checkin_id: round.checkin_id, event_type: e.event_type, direction: e.direction, technique: e.technique, position: e.position || null }));
    if (toInsert.length > 0) await supabase.from('round_events').insert(toInsert);
    onSave();
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflowY: 'auto' }}>
      <div style={{ background: '#13131f', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, padding: 24, paddingBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 18 }}>Round {round.round_number}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="label" style={{ marginBottom: 6 }}>Duration (minutes)</div>
          <input className="input" type="number" min="1" max="60" value={durMin} onChange={e => setDurMin(e.target.value)} style={{ width: 100 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="label" style={{ marginBottom: 6 }}>Training partner</div>
          <input className="input" placeholder="Name..." value={oppQuery} onChange={e => { setOppQuery(e.target.value); setOppId(null); }} style={{ marginBottom: 4 }} />
          {mFiltered.length > 0 && (
            <div style={{ background: '#151520', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {mFiltered.slice(0, 5).map(m => (
                <div key={m.user_id || m.id} onClick={() => { setOppQuery(m.display_name || m.name); setOppId(m.user_id || null); setOppBelt(m.belt || 'white'); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#f0ece2', borderBottom: '1px solid rgba(255,255,255,.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {m.display_name || m.name}
                </div>
              ))}
            </div>
          )}
          {oppQuery && !oppId && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Belt:</span>
              {['white','blue','purple','brown','black'].map(b => <button key={b} onClick={() => setOppBelt(b)} title={b} style={{ width: 18, height: 18, borderRadius: '50%', border: oppBelt === b ? '2px solid #fff' : '2px solid transparent', background: BELT_COLORS[b], cursor: 'pointer', padding: 0, boxShadow: b === 'white' ? 'inset 0 0 0 1px #aaa' : 'none' }} />)}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="label" style={{ marginBottom: 10, display: 'block' }}>Techniques & Events</div>
          <EventEditorHistory events={events} onChange={setEvents} />
        </div>

        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving...' : 'Save Round'}</button>
      </div>
    </div>
  );
}


function fmt(sec){if(!sec)return'—';const m=Math.floor(sec/60),s=sec%60;return`${m}:${String(s).padStart(2,'0')}`;}
function fmtDur(sec){if(!sec||sec<60)return'—';const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;}
function BeltDot({belt,size=10}){return<span style={{display:'inline-block',width:size,height:size,borderRadius:'50%',background:BELT_COLORS[belt]||'#888',border:belt==='white'?'1px solid #999':'none',flexShrink:0}}/>;}

function SessionEditModal({session, onSave, onClose}){
  const[date,setDate]=useState(session.checked_in_at?.split('T')[0]||'');
  const[startTime,setStartTime]=useState(session.checked_in_at?.split('T')[1]?.slice(0,5)||'');
  const[endTime,setEndTime]=useState(session.checked_out_at?.split('T')[1]?.slice(0,5)||'');
  const[type,setType]=useState(session.session_type||'gi');
  const[energy,setEnergy]=useState(session.energy_rating||null);
  const[note,setNote]=useState(session.note||'');
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');

  async function save(){
    setBusy(true);setErr('');
    try{
      const startDt=new Date(`${date}T${startTime}:00`);
      const endDt=new Date(`${date}T${endTime}:00`);
      if(isNaN(startDt.getTime())||isNaN(endDt.getTime()))throw new Error('Invalid date/time');
      if(endDt<=startDt)throw new Error('End must be after start');
      await supabase.from('checkins').update({session_type:type,checked_in_at:startDt.toISOString(),checked_out_at:endDt.toISOString(),energy_rating:energy||null,note:note.trim()||null}).eq('id',session.id);
      onSave();
    }catch(e){setErr(e.message);}
    setBusy(false);
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'#13131f',borderRadius:'16px 16px 0 0',width:'100%',maxWidth:480,padding:24,paddingBottom:40}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontFamily:'var(--font-d)',fontSize:18}}>Edit Session</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:22,cursor:'pointer'}}>×</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
          <div><div className="label" style={{marginBottom:4}}>Date</div><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div><div className="label" style={{marginBottom:4}}>Start</div><input className="input" type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></div>
          <div><div className="label" style={{marginBottom:4}}>End</div><input className="input" type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></div>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {SESSION_TYPES.map(t=><button key={t.id} onClick={()=>setType(t.id)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:type===t.id?`${t.color}25`:'rgba(255,255,255,.04)',color:type===t.id?t.color:'var(--text-dim)'}}>{t.label}</button>)}
        </div>
        <div style={{display:'flex',gap:4,marginBottom:12}}>
          {ENERGY.map(e=><button key={e.val} onClick={()=>setEnergy(energy===e.val?null:e.val)} style={{flex:1,padding:'8px',fontSize:18,borderRadius:8,border:energy===e.val?'1px solid var(--accent)':'1px solid var(--border)',background:energy===e.val?'rgba(155,77,202,.15)':'transparent',cursor:'pointer'}}>{e.emoji}</button>)}
        </div>
        <textarea className="input" placeholder="Note..." value={note} onChange={e=>setNote(e.target.value)} rows={2} style={{resize:'none',marginBottom:12}}/>
        {err&&<div style={{color:'#ff6b6b',fontSize:12,marginBottom:8}}>{err}</div>}
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{width:'100%'}}>{busy?'Saving...':'Save Changes'}</button>
      </div>
    </div>
  );
}


export default function HistoryPage(){
  const{user,gym}=useAuth();
  const[sessions,setSessions]=useState([]);
  const[loading,setLoading]=useState(true);
  const[expanded,setExpanded]=useState(null);
  const[rounds,setRounds]=useState({});
  const[editSession,setEditSession]=useState(null);
  const[editRound,setEditRound]=useState(null);
  const[members,setMembers]=useState([]);

  useEffect(()=>{if(user&&gym)load();},[user,gym]);

  async function load(){
    const[{data:s},{data:lb},{data:man}]=await Promise.all([
      supabase.from('checkins').select('*').eq('user_id',user.id).eq('gym_id',gym.id).not('checked_out_at','is',null).order('checked_in_at',{ascending:false}).limit(100),
      supabase.from('gym_leaderboard').select('*').eq('gym_id',gym.id),
      supabase.from('manual_gym_members').select('*').eq('gym_id',gym.id),
    ]);
    setSessions(s||[]);
    const appM=(lb||[]).filter(m=>m.user_id!==user.id);
    const manM=(man||[]).map(m=>({user_id:null,id:m.id,display_name:m.name,name:m.name,belt:m.belt}));
    setMembers([...appM,...manM]);
    setLoading(false);
  }

  async function loadRounds(checkinId){
    if(rounds[checkinId])return;
    const{data}=await supabase.from('rounds').select('*, round_events(*)').eq('checkin_id',checkinId).order('round_number');
    setRounds(prev=>({...prev,[checkinId]:data||[]}));
  }

  function toggleExpand(id){
    if(expanded===id){setExpanded(null);}else{setExpanded(id);loadRounds(id);}
  }

  async function addRound(session){
    const sessionRounds=rounds[session.id]||[];
    const num=sessionRounds.length+1;
    // Default 5min round starting at session start + offset
    const offset=(num-1)*6*60*1000;
    const startedAt=new Date(new Date(session.checked_in_at).getTime()+offset).toISOString();
    const endedAt=new Date(new Date(startedAt).getTime()+5*60*1000).toISOString();
    const{data}=await supabase.from('rounds').insert({checkin_id:session.id,user_id:user.id,gym_id:gym.id,round_number:num,started_at:startedAt,ended_at:endedAt}).select().single();
    if(data){setRounds(prev=>({...prev,[session.id]:[...(prev[session.id]||[]),{...data,round_events:[]}]}));setEditRound({...data,round_events:[]});}
  }

  async function deleteRound(sessionId,roundId){
    if(!confirm('Delete this round?'))return;
    await supabase.from('rounds').delete().eq('id',roundId);
    setRounds(prev=>({...prev,[sessionId]:(prev[sessionId]||[]).filter(r=>r.id!==roundId)}));
  }

  function durSec(s){
    if(!s.checked_in_at||!s.checked_out_at)return 0;
    return Math.round((new Date(s.checked_out_at)-new Date(s.checked_in_at))/1000);
  }
  function roundDurSec(r){
    if(!r.started_at||!r.ended_at)return 0;
    return Math.round((new Date(r.ended_at)-new Date(r.started_at))/1000);
  }

  if(loading)return<div style={{padding:40,textAlign:'center',color:'var(--text-dim)'}}>Loading...</div>;

  return(
    <div className="container" style={{paddingTop:24,paddingBottom:100}}>
      <h1 style={{fontFamily:'var(--font-d)',fontSize:24,fontWeight:400,marginBottom:6}}>History</h1>
      <p style={{color:'var(--text-dim)',fontSize:13,marginBottom:24}}>{sessions.length} sessions logged</p>

      {sessions.length===0&&<div className="card" style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No sessions yet.</div>}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {sessions.map(s=>{
          const dur=durSec(s);
          const isOpen=expanded===s.id;
          const sessionRounds=rounds[s.id];
          const d=new Date(s.checked_in_at);
          const typeInfo=SESSION_TYPES.find(t=>t.id===s.session_type);
          return(
            <div key={s.id} className="card" style={{padding:0,overflow:'hidden'}}>
              {/* Session header */}
              <div onClick={()=>toggleExpand(s.id)} style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:600,color:'#f0ece2'}}>{d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span>
                    <span style={{fontSize:11,color:typeInfo?.color,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{s.session_type}</span>
                    {s.energy_rating&&<span>{ENERGY[s.energy_rating-1]?.emoji}</span>}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>
                    {fmtDur(dur)}
                    <span style={{marginLeft:8,color:'#aaa'}}>
                      {new Date(s.checked_in_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                      {' → '}
                      {s.checked_out_at ? new Date(s.checked_out_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '...'}
                    </span>
                    {s.note&&<span style={{marginLeft:8,color:'var(--text-dim)'}}>· {s.note.slice(0,40)}{s.note.length>40?'...':''}</span>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <button onClick={e=>{e.stopPropagation();setEditSession(s);}} style={{padding:'5px 10px',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer'}}>Edit</button>
                  <span style={{color:'var(--text-muted)',fontSize:12}}>{isOpen?'▲':'▼'}</span>
                </div>
              </div>

              {/* Rounds list */}
              {isOpen&&(
                <div style={{borderTop:'1px solid var(--border)',padding:'12px 16px'}}>
                  {!sessionRounds&&<div style={{color:'var(--text-muted)',fontSize:12,padding:'8px 0'}}>Loading...</div>}
                  {sessionRounds?.length===0&&<div style={{color:'var(--text-muted)',fontSize:12,padding:'8px 0'}}>No rounds logged.</div>}
                  {sessionRounds?.map(r=>{
                    const rDur=roundDurSec(r);
                    const evs=r.round_events||[];
                    const myEvs=evs.filter(e=>e.direction==='offensive');
                    return(
                      <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.04)',display:'flex',alignItems:'flex-start',gap:10}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <span style={{fontSize:13,fontWeight:600,color:'#ccc'}}>Round {r.round_number}</span>
                            <span style={{fontSize:12,color:'var(--text-dim)',fontFamily:'var(--font-d)'}}>{fmt(rDur)}</span>
                            {r.opponent_name&&<span style={{fontSize:12,color:'var(--text-dim)',display:'flex',alignItems:'center',gap:4}}>vs {r.opponent_name.split(' ')[0]}</span>}
                          </div>
                          {myEvs.length>0&&(
                            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                              {myEvs.map((e,i)=><span key={i} style={{padding:'2px 8px',borderRadius:12,fontSize:10,background:'rgba(102,187,106,.12)',color:'#66bb6a',border:'1px solid rgba(102,187,106,.2)'}}>{e.technique}</span>)}
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex',gap:5,flexShrink:0}}>
                          <button onClick={()=>setEditRound(r)} style={{padding:'4px 8px',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer'}}>Edit</button>
                          <button onClick={()=>deleteRound(s.id,r.id)} style={{padding:'4px 8px',borderRadius:6,background:'rgba(239,83,80,.08)',border:'1px solid rgba(239,83,80,.2)',color:'#ef5350',fontSize:10,cursor:'pointer'}}>Del</button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>addRound(s)} style={{marginTop:10,padding:'7px 14px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:12,cursor:'pointer',width:'100%'}}>+ Add Round</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editSession&&<SessionEditModal session={editSession} onSave={()=>{setEditSession(null);load();}} onClose={()=>setEditSession(null)}/>}
      {editRound&&<RoundEditModal round={editRound} members={members} onSave={()=>{setEditRound(null);if(expanded)loadRounds(expanded);setRounds(prev=>({...prev,[editRound.checkin_id]:undefined}));if(expanded)loadRounds(expanded);}} onClose={()=>setEditRound(null)}/>}
    </div>
  );
}
