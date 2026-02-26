import { useState, useEffect, useRef } from 'react';
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
const POSITIONS = ['Mount','Back','Closed Guard','Open Guard','Half Guard','Side Control','Standing','Turtle','Leg Entangle'];
const BELTS = ['white','blue','purple','brown','black'];
const BELT_COLORS = { white: '#e8e8e0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#444' };
const CATEGORIES = [
  { id: 'submission', label: 'Submission', techniques: ['Armbar','Triangle','RNC','Kimura','Guillotine','Darce','Omoplata','Loop Choke','Bow & Arrow','Ezekiel','Americana','Heel Hook','Knee Bar','Toe Hold','Baseball Choke','Cross Collar','Anaconda','North-South Choke','Gogoplata','Calf Slicer','Wrist Lock'] },
  { id: 'takedown', label: 'Takedown', techniques: ['Single Leg','Double Leg','Arm Drag','Snap Down','Body Lock Takedown','Ankle Pick','Outside Trip','Inside Trip','Hip Throw','Shoulder Throw','Foot Sweep','Drop Throw','Guard Pull'] },
  { id: 'sweep', label: 'Sweep', techniques: ['Scissor Sweep','Hip Bump','Flower Sweep','Berimbolo','X-Guard Sweep','Butterfly Sweep','Pendulum','Tripod Sweep','Sickle Sweep','Elevator Sweep','Waiter Sweep'] },
];
const ALL_TECHNIQUES = CATEGORIES.flatMap(c => c.techniques.map(t => ({ tech: t, cat: c.id })));
const BODY_PARTS = ['Neck','Shoulder','Elbow','Wrist/Hand','Ribs','Lower Back','Hip','Knee','Ankle/Foot','Fingers/Toes'];
const INJURY_TYPES = ['Strain','Sprain','Bruise','Pop/Crack','Soreness','Cut','Burn','Tweak'];

function fmt(sec) { const m = Math.floor(sec/60), s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function fmtLong(sec) { const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; }
function todayStr() { return new Date().toISOString().split('T')[0]; }

function BeltDot({ belt, size = 10 }) {
  const c = BELT_COLORS[belt]||'#888';
  return <span style={{ display:'inline-block',width:size,height:size,borderRadius:'50%',background:c,border:belt==='white'?'1px solid #999':'none',flexShrink:0 }} />;
}

function MemberAvatar({ m, size = 30 }) {
  if (m?.avatar_url) return <img src={m.avatar_url} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} onError={e=>{e.target.style.display='none';}} />;
  const init = (m?.display_name||m?.name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  return <span style={{ width:size,height:size,borderRadius:'50%',background:'#2a2a3a',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:size*0.38,fontWeight:700,color:'var(--text-dim)',flexShrink:0 }}>{init}</span>;
}

function OpponentPicker({ members, value, onChange }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q ? members.filter(m=>(m.display_name||m.name||'').toLowerCase().includes(q)) : members;
  const exactMatch = members.some(m=>(m.display_name||m.name||'').toLowerCase()===q);
  const showAdd = q.length>1 && !exactMatch;

  function select(m) { onChange({ type:m.manual?'manual':'member', id:m.user_id||m.id, name:m.display_name||m.name, belt:m.belt }); setQuery(''); }
  function addGuest() { onChange({ type:'guest', id:null, name:query.trim(), belt:'white' }); setQuery(''); }
  function clear() { onChange(null); setQuery(''); }

  if (value) return (
    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'rgba(123,45,142,.1)',borderRadius:8,border:'1px solid rgba(123,45,142,.3)' }}>
      <BeltDot belt={value.belt||'white'} size={12} />
      <span style={{ flex:1,fontSize:14,color:'#f0ece2',fontWeight:500 }}>{value.name}</span>
      <span style={{ fontSize:10,color:'var(--text-muted)',textTransform:'capitalize' }}>{value.belt||'white'}</span>
      <button onClick={clear} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:18,lineHeight:1 }}>×</button>
    </div>
  );

  return (
    <div>
      <input className="input" placeholder="Training partner (skip if empty)..." value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off" style={{ marginBottom:(filtered.length>0||showAdd)?4:0 }} />
      {(filtered.length>0||showAdd) && (
        <div style={{ background:'#151520',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden',maxHeight:220,overflowY:'auto' }}>
          {filtered.slice(0,8).map(m=>(
            <div key={m.user_id||m.id} onClick={()=>select(m)} style={{ padding:'9px 12px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.04)' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <MemberAvatar m={m} size={26} />
              <span style={{ flex:1,fontSize:13,color:'#f0ece2' }}>{m.display_name||m.name}</span>
              <BeltDot belt={m.belt||'white'} size={10} />
              {m.is_visitor && <span style={{ fontSize:10,color:'#ffb74d',background:'rgba(255,183,77,.1)',padding:'1px 5px',borderRadius:4 }}>visitor</span>}
            </div>
          ))}
          {showAdd && (
            <div onClick={addGuest} style={{ padding:'9px 12px',cursor:'pointer',color:'var(--accent)',fontSize:13,fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              + Add "{query.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TechSearch({ events, onAdd, onRemove }) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('offensive');
  const [pendingSub, setPendingSub] = useState(null);
  const inputRef = useRef(null);
  const q = query.trim().toLowerCase();
  const suggestions = q.length>0 ? ALL_TECHNIQUES.filter(t=>t.tech.toLowerCase().includes(q)).slice(0,8) : [];
  const exactMatch = ALL_TECHNIQUES.some(t=>t.tech.toLowerCase()===q);
  const showAddCustom = q.length>1 && !exactMatch;

  function addTech(tech, cat) {
    if (cat==='submission') { setPendingSub({tech,cat}); setQuery(''); return; }
    onAdd({ event_type:cat, direction, technique:tech, position:null });
    setQuery(''); inputRef.current?.focus();
  }
  function confirmPos(pos) { onAdd({ event_type:pendingSub.cat, direction, technique:pendingSub.tech, position:pos }); setPendingSub(null); inputRef.current?.focus(); }
  function addCustom() {
    if (!q) return;
    const match = ALL_TECHNIQUES.find(t=>t.tech.toLowerCase().includes(q));
    const cat = match?.cat||'submission';
    if (cat==='submission') { setPendingSub({tech:query.trim(),cat}); setQuery(''); return; }
    onAdd({ event_type:cat, direction, technique:query.trim(), position:null });
    setQuery(''); inputRef.current?.focus();
  }

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,borderRadius:10,overflow:'hidden',marginBottom:10,border:'1px solid var(--border)' }}>
        {[{d:'offensive',l:'✅ I did',c:'#66bb6a'},{d:'defensive',l:'😤 Done to me',c:'#ef5350'}].map(x=>(
          <button key={x.d} onClick={()=>setDirection(x.d)} style={{ padding:'10px 0',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',background:direction===x.d?`${x.c}18`:'transparent',color:direction===x.d?x.c:'var(--text-muted)' }}>{x.l}</button>
        ))}
      </div>
      {pendingSub && (
        <div style={{ marginBottom:10,padding:'10px 12px',background:'rgba(123,45,142,.1)',borderRadius:8,border:'1px solid rgba(123,45,142,.3)' }}>
          <div style={{ fontSize:12,color:'var(--accent)',marginBottom:8,fontWeight:600 }}>{pendingSub.tech} — from which position?</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:6 }}>
            {POSITIONS.map(p=><button key={p} onClick={()=>confirmPos(p)} style={{ padding:'5px 10px',fontSize:11,borderRadius:12,cursor:'pointer',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'#ccc' }}>{p}</button>)}
          </div>
          <button onClick={()=>{onAdd({event_type:'submission',direction,technique:pendingSub.tech,position:null});setPendingSub(null);}} style={{ background:'none',border:'none',color:'var(--text-muted)',fontSize:11,cursor:'pointer' }}>Skip position</button>
        </div>
      )}
      <div style={{ position:'relative' }}>
        <input ref={inputRef} className="input" placeholder="Type a technique (armbar, triangle...)" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(suggestions.length>0)addTech(suggestions[0].tech,suggestions[0].cat);else if(showAddCustom)addCustom();}}} autoComplete="off" />
        {(suggestions.length>0||showAddCustom) && (
          <div style={{ position:'absolute',top:'100%',left:0,right:0,zIndex:100,background:'#151520',border:'1px solid var(--border)',borderRadius:8,marginTop:2,boxShadow:'0 6px 20px rgba(0,0,0,.5)',maxHeight:220,overflowY:'auto' }}>
            {suggestions.map((s,i)=>(
              <div key={i} onClick={()=>addTech(s.tech,s.cat)} style={{ padding:'9px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.04)',fontSize:13,color:'#f0ece2' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span>{s.tech}</span>
                <span style={{ fontSize:10,color:'var(--text-muted)',textTransform:'capitalize' }}>{s.cat}</span>
              </div>
            ))}
            {showAddCustom && (
              <div onClick={addCustom} style={{ padding:'9px 12px',cursor:'pointer',fontSize:13,color:'var(--accent)',fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                + Add "{query.trim()}"
              </div>
            )}
          </div>
        )}
      </div>
      {events.length>0 && (
        <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginTop:10 }}>
          {events.map((e,i)=>(
            <span key={i} onClick={()=>onRemove(i)} style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:16,fontSize:12,cursor:'pointer',fontWeight:500,background:e.direction==='offensive'?'rgba(102,187,106,.15)':'rgba(239,83,80,.15)',color:e.direction==='offensive'?'#66bb6a':'#ef5350',border:`1px solid ${e.direction==='offensive'?'rgba(102,187,106,.3)':'rgba(239,83,80,.3)'}` }}>
              {e.direction==='offensive'?'✅':'😤'} {e.technique}{e.position?` (${e.position})`:''} ×
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function InjuryCheckModal({ injuries, onDone }) {
  const [statuses, setStatuses] = useState(()=>Object.fromEntries(injuries.map(i=>[i.id,null])));
  const allAnswered = injuries.every(i=>statuses[i.id]!==null);
  async function confirm() {
    for (const inj of injuries) if (statuses[inj.id]==='resolved') await supabase.from('injuries').update({resolved_at:todayStr()}).eq('id',inj.id);
    onDone();
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div className="card" style={{ width:'100%',maxWidth:380,padding:24 }}>
        <div style={{ fontSize:28,textAlign:'center',marginBottom:8 }}>🩹</div>
        <h3 style={{ fontFamily:'var(--font-d)',fontSize:20,textAlign:'center',marginBottom:4 }}>How are you feeling?</h3>
        <p style={{ fontSize:12,color:'var(--text-dim)',textAlign:'center',marginBottom:20 }}>You had some injuries. Still hurting?</p>
        <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
          {injuries.map(inj=>(
            <div key={inj.id} style={{ padding:'10px 12px',background:'rgba(255,255,255,.03)',borderRadius:8 }}>
              <div style={{ fontSize:13,color:'#ddd',marginBottom:8 }}><span style={{ color:inj.severity==='serious'?'#ef5350':inj.severity==='moderate'?'#ffb74d':'#66bb6a',marginRight:6 }}>●</span>{inj.body_part} — {inj.injury_type}</div>
              <div style={{ display:'flex',gap:6 }}>
                <button onClick={()=>setStatuses(s=>({...s,[inj.id]:'active'}))} style={{ flex:1,padding:'8px',borderRadius:8,cursor:'pointer',border:statuses[inj.id]==='active'?'1px solid #ef5350':'1px solid var(--border)',background:statuses[inj.id]==='active'?'rgba(239,83,80,.15)':'rgba(255,255,255,.03)',color:statuses[inj.id]==='active'?'#ef5350':'var(--text-dim)',fontSize:12,fontWeight:600 }}>Still hurts</button>
                <button onClick={()=>setStatuses(s=>({...s,[inj.id]:'resolved'}))} style={{ flex:1,padding:'8px',borderRadius:8,cursor:'pointer',border:statuses[inj.id]==='resolved'?'1px solid #66bb6a':'1px solid var(--border)',background:statuses[inj.id]==='resolved'?'rgba(102,187,106,.15)':'rgba(255,255,255,.03)',color:statuses[inj.id]==='resolved'?'#66bb6a':'var(--text-dim)',fontSize:12,fontWeight:600 }}>All good ✓</button>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={confirm} disabled={!allAnswered}>Continue to training</button>
      </div>
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
  const [events, setEvents] = useState([]);
  const [roundOpponent, setRoundOpponent] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [matchedCurr, setMatchedCurr] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [injPart, setInjPart] = useState('Knee');
  const [injType, setInjType] = useState('Soreness');
  const [injSev, setInjSev] = useState('minor');
  const [pastDate, setPastDate] = useState('');
  const [pastStart, setPastStart] = useState('18:00');
  const [pastEnd, setPastEnd] = useState('19:30');
  const [pastType, setPastType] = useState('gi');
  const [pastEnergy, setPastEnergy] = useState(3);
  const [pastNote, setPastNote] = useState('');
  const [pastError, setPastError] = useState('');
  const [pastCurriculum, setPastCurriculum] = useState(null);
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [injuryCheck, setInjuryCheck] = useState(null);

  useEffect(()=>{if(user&&gym)load();},[user,gym]);
  useEffect(()=>{if(!checkin)return;const i=setInterval(()=>setElapsed(Math.floor((Date.now()-new Date(checkin.checked_in_at).getTime())/1000)),1000);return()=>clearInterval(i);},[checkin]);
  useEffect(()=>{if(!round||phase!=='main')return;const i=setInterval(()=>setRoundTime(Math.floor((Date.now()-new Date(round.started_at).getTime())/1000)),1000);return()=>clearInterval(i);},[round,phase]);
  useEffect(()=>{
    if(!pastDate||!gym){setPastCurriculum(null);return;}
    supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id',gym.id).eq('class_date',pastDate).then(({data})=>setPastCurriculum(data?.length?data:null));
  },[pastDate,gym]);

  async function load() {
    const {data:c}=await supabase.from('checkins').select('*').eq('user_id',user.id).eq('gym_id',gym.id).is('checked_out_at',null).order('checked_in_at',{ascending:false}).limit(1).maybeSingle();
    setCheckin(c||null);
    if(c){
      const [{data:r},{data:dr}]=await Promise.all([
        supabase.from('rounds').select('*').eq('checkin_id',c.id).is('ended_at',null).limit(1).maybeSingle(),
        supabase.from('rounds').select('*').eq('checkin_id',c.id).not('ended_at','is',null).order('round_number'),
      ]);
      setRound(r||null);setDoneRounds(dr||[]);
      const {data:curr}=await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id',gym.id).eq('class_date',c.checked_in_at.split('T')[0]);
      if(curr?.length)setMatchedCurr(curr);
    }
    const {data:lb}=await supabase.from('gym_leaderboard').select('*').eq('gym_id',gym.id);
    const appM=(lb||[]).filter(m=>m.user_id!==user.id).map(m=>({...m,manual:false}));
    const {data:man}=await supabase.from('manual_gym_members').select('*').eq('gym_id',gym.id);
    const manM=(man||[]).map(m=>({user_id:null,id:m.id,display_name:m.name,name:m.name,belt:m.belt,avatar_url:null,manual:true,is_visitor:m.is_visitor}));
    setAllMembers([...appM,...manM]);
    const {data:rec}=await supabase.from('checkins').select('*').eq('user_id',user.id).eq('gym_id',gym.id).not('checked_out_at','is',null).order('checked_in_at',{ascending:false}).limit(20);
    setRecent(rec||[]);
    if(!c){
      const {data:activeInj}=await supabase.from('injuries').select('*').eq('user_id',user.id).is('resolved_at',null);
      if(activeInj?.length){const lastDay=rec?.[0]?.checked_in_at?.split('T')[0];if(lastDay&&lastDay<todayStr())setInjuryCheck(activeInj);}
    }
    setLoading(false);
  }

  async function doCheckIn(){setBusy(true);const{data}=await supabase.from('checkins').insert({user_id:user.id,gym_id:gym.id,session_type:selType}).select().single();if(data){setCheckin(data);setDoneRounds([]);setRound(null);const{data:curr}=await supabase.from('class_curriculum').select('*, curriculum_techniques(*)').eq('gym_id',gym.id).eq('class_date',data.checked_in_at.split('T')[0]);if(curr?.length)setMatchedCurr(curr);}setBusy(false);}
  async function doStartRound(){setBusy(true);const{data}=await supabase.from('rounds').insert({checkin_id:checkin.id,user_id:user.id,gym_id:gym.id,round_number:doneRounds.length+1}).select().single();if(data)setRound(data);setBusy(false);}
  function doEndRoundPrompt(){setFrozenRoundTime(roundTime);setEvents([]);setRoundOpponent(null);setPhase('round_log');}

  async function doEndRound(skip=false){
    setBusy(true);
    const opp=roundOpponent;
    const updates={ended_at:new Date().toISOString()};
    if(opp?.type==='member'&&opp.id){updates.opponent_id=opp.id;updates.opponent_name=opp.name||null;updates.opponent_belt=opp.belt||null;}
    else if(opp?.name){updates.opponent_name=opp.name;updates.opponent_belt=opp.belt||null;}
    await supabase.from('rounds').update(updates).eq('id',round.id);
    if(!skip&&events.length>0)await supabase.from('round_events').insert(events.map(e=>({round_id:round.id,checkin_id:checkin.id,user_id:user.id,gym_id:gym.id,event_type:e.event_type,direction:e.direction,technique:e.technique,position:e.position})));
    setDoneRounds(prev=>[...prev,{...round,...updates,duration_seconds:frozenRoundTime,_events:skip?[]:events,_oppName:opp?.name,_oppBelt:updates.opponent_belt}]);
    setRound(null);setPhase('main');setBusy(false);
  }

  function doCheckOutPrompt(){setEnergy(null);setNote('');setInjuries([]);setPhase('debrief');}
  function addInjury(){setInjuries(prev=>[...prev,{body_part:injPart,injury_type:injType,severity:injSev}]);}

  async function doCheckOut(skip=false){
    setBusy(true);
    if(round)await supabase.from('rounds').update({ended_at:new Date().toISOString()}).eq('id',round.id);
    const updates={checked_out_at:new Date().toISOString()};
    if(!skip&&energy)updates.energy_rating=energy;
    if(!skip&&note.trim())updates.note=note.trim();
    await supabase.from('checkins').update(updates).eq('id',checkin.id);
    if(!skip&&injuries.length>0)await supabase.from('injuries').insert(injuries.map(inj=>({user_id:user.id,checkin_id:checkin.id,body_part:inj.body_part,injury_type:inj.injury_type,severity:inj.severity})));
    setCheckin(null);setRound(null);setDoneRounds([]);setMatchedCurr(null);setPhase('main');setBusy(false);load();
  }

  async function addPastSession(e){
    e.preventDefault();setBusy(true);setPastError('');
    try{
      const startDt=new Date(`${pastDate}T${pastStart}:00`);const endDt=new Date(`${pastDate}T${pastEnd}:00`);
      if(isNaN(startDt.getTime())||isNaN(endDt.getTime()))throw new Error('Invalid date/time');
      if(endDt<=startDt)throw new Error('End time must be after start time');
      const{data:ins,error:err}=await supabase.from('checkins').insert({user_id:user.id,gym_id:gym.id,session_type:pastType,checked_in_at:startDt.toISOString(),checked_out_at:endDt.toISOString(),energy_rating:pastEnergy,note:pastNote.trim()||null}).select().single();
      if(err)throw err;
      if(pastCurriculum?.length&&ins){const allT=pastCurriculum.flatMap(cls=>(cls.curriculum_techniques||[]).map(t=>({checkin_id:ins.id,user_id:user.id,gym_id:gym.id,name:t.name,category:t.category})));if(allT.length>0)await supabase.from('techniques').insert(allT);}
      setShowPast(false);setPastDate('');setPastNote('');setPastCurriculum(null);
    }catch(err){setPastError(err.message||'Failed to save');}
    setBusy(false);load();
  }

  function toggleSelect(id){setSelectedSessions(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});}
  function toggleSelectAll(){setSelectedSessions(selectedSessions.size===recent.length?new Set():new Set(recent.map(s=>s.id)));}
  async function deleteSelected(){if(!confirm(`Delete ${selectedSessions.size} session(s)?`))return;await supabase.from('checkins').delete().in('id',[...selectedSessions]);setSelectedSessions(new Set());setSelectMode(false);load();}
  async function deleteSingle(id){if(!confirm('Delete this session?'))return;await supabase.from('checkins').delete().eq('id',id);load();}

  if(loading)return<div style={{padding:40,textAlign:'center',color:'var(--text-dim)'}}>Loading...</div>;
  if(injuryCheck)return<InjuryCheckModal injuries={injuryCheck} onDone={()=>setInjuryCheck(null)}/>;

  if(phase==='round_log')return(
    <div className="container fade-in" style={{paddingTop:24,paddingBottom:100}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div><h2 style={{fontFamily:'var(--font-d)',fontSize:22}}>Round {doneRounds.length+1}</h2><p style={{color:'var(--text-dim)',fontSize:14}}>{fmt(frozenRoundTime)}</p></div>
        <div style={{display:'flex',gap:6}}>
          <button className="btn btn-primary btn-small" onClick={()=>doEndRound(false)} disabled={busy}>Save{events.length>0?` · ${events.length}`:''}</button>
          <button className="btn btn-secondary btn-small" onClick={()=>doEndRound(true)} disabled={busy}>Skip</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:14,padding:14}}>
        <div style={{fontSize:11,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:8}}>Training partner</div>
        <OpponentPicker members={allMembers} value={roundOpponent} onChange={setRoundOpponent}/>
      </div>
      <div className="card" style={{padding:14}}>
        <div style={{fontSize:11,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:10}}>Techniques</div>
        <TechSearch events={events} onAdd={ev=>setEvents(prev=>[...prev,ev])} onRemove={i=>setEvents(prev=>prev.filter((_,j)=>j!==i))}/>
      </div>
    </div>
  );

  if(phase==='debrief')return(
    <div className="container fade-in" style={{paddingTop:32,paddingBottom:100}}>
      <h2 style={{fontFamily:'var(--font-d)',fontSize:22,marginBottom:4}}>Session done</h2>
      <p style={{color:'var(--text-dim)',fontSize:14,marginBottom:20}}>{fmtLong(elapsed)} · {doneRounds.length} round{doneRounds.length!==1?'s':''}</p>
      <div className="card" style={{marginBottom:16}}>
        <div className="label">How did it feel?</div>
        <div style={{display:'flex',gap:6}}>
          {ENERGY.map(e=>(
            <button key={e.val} onClick={()=>setEnergy(e.val)} style={{flex:1,padding:'12px 0',borderRadius:10,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:energy===e.val?'var(--accent)':'rgba(255,255,255,.03)',border:energy===e.val?'1px solid var(--accent)':'1px solid var(--border)'}}>
              <span style={{fontSize:20}}>{e.emoji}</span>
              <span style={{fontSize:10,color:energy===e.val?'#fff':'var(--text-muted)'}}>{e.label}</span>
            </button>
          ))}
        </div>
      </div>
      {matchedCurr?.length>0&&(
        <div className="card" style={{marginBottom:16}}>
          <div className="label">Today's Class</div>
          <p style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>Auto-added to your training stats</p>
          {matchedCurr.map(cls=>(cls.curriculum_techniques||[]).map((t,i)=><div key={i} style={{fontSize:12,color:'#ccc',padding:'3px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>· {t.name}</div>))}
        </div>
      )}
      <div className="card" style={{marginBottom:16}}>
        <div className="label">Any injuries?</div>
        {injuries.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>{injuries.map((inj,i)=><span key={i} onClick={()=>setInjuries(p=>p.filter((_,j)=>j!==i))} style={{padding:'4px 10px',borderRadius:16,fontSize:11,cursor:'pointer',background:inj.severity==='serious'?'rgba(239,83,80,.15)':'rgba(255,255,255,.06)',color:inj.severity==='serious'?'#ef5350':'#aaa'}}>🩹 {inj.body_part} — {inj.injury_type} ×</span>)}</div>}
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <select value={injPart} onChange={e=>setInjPart(e.target.value)} style={{padding:'7px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'#ccc',fontSize:12}}>{BODY_PARTS.map(p=><option key={p}>{p}</option>)}</select>
          <select value={injType} onChange={e=>setInjType(e.target.value)} style={{padding:'7px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'#ccc',fontSize:12}}>{INJURY_TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <select value={injSev} onChange={e=>setInjSev(e.target.value)} style={{padding:'7px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'#ccc',fontSize:12}}><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="serious">Serious</option></select>
          <button onClick={addInjury} style={{padding:'7px 12px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:12,cursor:'pointer'}}>+ Add</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:20}}>
        <div className="label">Note</div>
        <textarea className="input" placeholder="Anything to remember?" value={note} onChange={e=>setNote(e.target.value)} rows={2} style={{resize:'none'}}/>
      </div>
      <button className="btn btn-primary" onClick={()=>doCheckOut(false)} disabled={busy} style={{marginBottom:8}}>Save & Check Out</button>
      <button className="btn btn-secondary" onClick={()=>doCheckOut(true)} disabled={busy}>Just Check Out</button>
    </div>
  );

  return(
    <div className="container" style={{paddingTop:32,paddingBottom:100}}>
      <div style={{marginBottom:24}}>
        <p style={{color:'var(--text-dim)',fontSize:13}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
        <h1 style={{fontFamily:'var(--font-d)',fontSize:24,fontWeight:400,marginTop:4}}>{checkin?"You're on the mat 🟢":`Hey ${profile?.display_name?.split(' ')[0]||'there'}`}</h1>
      </div>
      {checkin?(
        <div className="fade-in">
          <div className="card" style={{textAlign:'center',padding:24,border:`1px solid ${SESSION_TYPES.find(t=>t.id===checkin.session_type)?.color}40`,marginBottom:16}}>
            <div style={{fontSize:12,color:SESSION_TYPES.find(t=>t.id===checkin.session_type)?.color,textTransform:'uppercase',letterSpacing:2,fontWeight:700,marginBottom:4}}>{SESSION_TYPES.find(t=>t.id===checkin.session_type)?.label}</div>
            <div style={{fontFamily:'var(--font-d)',fontSize:48,color:'#f0ece2',margin:'6px 0'}}>{fmtLong(elapsed)}</div>
          </div>
          <div className="card" style={{marginBottom:16,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:600,color:'#ccc',textTransform:'uppercase',letterSpacing:1}}>Rounds</span>
              <span style={{color:'var(--text-dim)',fontSize:13,fontFamily:'var(--font-d)'}}>{doneRounds.length+(round?1:0)}</span>
            </div>
            {round?(
              <>
                <div className="card" style={{textAlign:'center',padding:20,marginBottom:12,border:'1px solid #66bb6a',background:'rgba(102,187,106,.04)'}}>
                  <div style={{fontSize:10,color:'#66bb6a',textTransform:'uppercase',letterSpacing:2,fontWeight:700}}>Round {doneRounds.length+1}</div>
                  <div style={{fontFamily:'var(--font-d)',fontSize:40,color:'#f0ece2',margin:'8px 0'}}>{fmt(roundTime)}</div>
                </div>
                <button className="btn btn-danger" onClick={doEndRoundPrompt} disabled={busy}>End Round</button>
              </>
            ):(
              <button className="btn btn-secondary" onClick={doStartRound} disabled={busy} style={{fontSize:15,padding:'16px 24px'}}>Start Round {doneRounds.length+1}</button>
            )}
            {doneRounds.length>0&&(
              <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:4}}>
                {doneRounds.map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:6,fontSize:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{color:'#888'}}>R{r.round_number}</span>
                      {(r._oppName||r.opponent_name)&&<span style={{color:'var(--text-dim)',display:'flex',alignItems:'center',gap:4}}><BeltDot belt={r._oppBelt||r.opponent_belt} size={8}/> vs {(r._oppName||r.opponent_name).split(' ')[0]}</span>}
                      {(r._events||[]).length>0&&<span style={{color:'var(--text-muted)',fontSize:10}}>{(r._events||[]).map(e=>e.technique).join(', ')}</span>}
                    </div>
                    <span style={{color:'var(--text-dim)',fontFamily:'var(--font-d)'}}>{fmt(r.duration_seconds||0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-danger" onClick={doCheckOutPrompt} disabled={busy}>End Session</button>
        </div>
      ):(
        <div className="fade-in">
          <div style={{marginBottom:24}}>
            <div className="label">Session type</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {SESSION_TYPES.map(t=>(
                <button key={t.id} onClick={()=>setSelType(t.id)} style={{padding:'22px 8px',background:selType===t.id?`${t.color}15`:'rgba(255,255,255,.02)',border:selType===t.id?`2px solid ${t.color}`:'1px solid var(--border)',borderRadius:12,cursor:'pointer'}}>
                  <span style={{fontSize:15,fontWeight:700,color:selType===t.id?t.color:'var(--text-dim)'}}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={doCheckIn} disabled={busy} style={{padding:'20px 24px',fontSize:17,marginBottom:16}}>{busy?'...':'Check In'}</button>
          <div style={{display:'flex',gap:10,marginBottom:16}}>
            <button onClick={()=>{setShowPast(!showPast);setShowRecent(false);}} style={{flex:1,padding:'10px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:12,cursor:'pointer'}}>{showPast?'✕ Cancel':'+ Past Session'}</button>
            <button onClick={()=>{setShowRecent(!showRecent);setShowPast(false);}} style={{flex:1,padding:'10px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:12,cursor:'pointer'}}>{showRecent?'✕ Hide':'Recent'}</button>
          </div>
          {showPast&&(
            <form onSubmit={addPastSession} className="card" style={{marginBottom:16}}>
              <div className="label">Log Past Session</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                <input className="input" type="date" value={pastDate} onChange={e=>setPastDate(e.target.value)} required/>
                <input className="input" type="time" value={pastStart} onChange={e=>setPastStart(e.target.value)} required/>
                <input className="input" type="time" value={pastEnd} onChange={e=>setPastEnd(e.target.value)} required/>
              </div>
              <div style={{display:'flex',gap:6,marginBottom:10}}>
                {SESSION_TYPES.map(t=><button key={t.id} type="button" onClick={()=>setPastType(t.id)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:pastType===t.id?`${t.color}20`:'rgba(255,255,255,.03)',color:pastType===t.id?t.color:'var(--text-dim)'}}>{t.label}</button>)}
              </div>
              <div style={{display:'flex',gap:4,marginBottom:10}}>
                {ENERGY.map(e=><button key={e.val} type="button" onClick={()=>setPastEnergy(e.val)} style={{flex:1,padding:'6px',fontSize:16,borderRadius:8,border:pastEnergy===e.val?'1px solid var(--accent)':'1px solid var(--border)',background:pastEnergy===e.val?'rgba(155,77,202,.15)':'transparent',cursor:'pointer'}}>{e.emoji}</button>)}
              </div>
              {pastCurriculum&&(
                <div style={{padding:'10px 12px',background:'rgba(123,45,142,.08)',borderRadius:8,border:'1px solid rgba(123,45,142,.25)',marginBottom:10}}>
                  <div style={{fontSize:11,color:'var(--accent)',fontWeight:700,marginBottom:6}}>📚 Class found — techniques auto-imported</div>
                  {pastCurriculum.map(cls=>(cls.curriculum_techniques||[]).map((t,i)=><div key={i} style={{fontSize:11,color:'#ccc',padding:'2px 0'}}>· {t.name}</div>))}
                </div>
              )}
              <input className="input" placeholder="Note (optional)" value={pastNote} onChange={e=>setPastNote(e.target.value)} style={{marginBottom:10}}/>
              {pastError&&<div style={{color:'#ff6b6b',fontSize:12,marginBottom:8}}>{pastError}</div>}
              <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy?'Saving...':'Save'}</button>
            </form>
          )}
          {showRecent&&recent.length>0&&(
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:12,color:'var(--text-dim)',fontWeight:600}}>Recent Sessions</span>
                <div style={{display:'flex',gap:6}}>
                  {selectMode&&selectedSessions.size>0&&<button onClick={deleteSelected} style={{padding:'4px 10px',borderRadius:6,background:'rgba(239,83,80,.15)',border:'1px solid rgba(239,83,80,.3)',color:'#ef5350',fontSize:11,cursor:'pointer',fontWeight:600}}>Delete {selectedSessions.size}</button>}
                  {selectMode&&<button onClick={toggleSelectAll} style={{padding:'4px 10px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer'}}>{selectedSessions.size===recent.length?'None':'All'}</button>}
                  <button onClick={()=>{setSelectMode(!selectMode);setSelectedSessions(new Set());}} style={{padding:'4px 10px',borderRadius:6,background:selectMode?'rgba(123,45,142,.15)':'rgba(255,255,255,.04)',border:'1px solid var(--border)',color:selectMode?'var(--accent)':'var(--text-dim)',fontSize:11,cursor:'pointer'}}>{selectMode?'Done':'Select'}</button>
                </div>
              </div>
              {recent.map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  {selectMode&&<input type="checkbox" checked={selectedSessions.has(s.id)} onChange={()=>toggleSelect(s.id)} style={{width:16,height:16,accentColor:'var(--accent)',cursor:'pointer',flexShrink:0}}/>}
                  <div style={{flex:1}}>
                    <span style={{fontSize:13,color:'#ccc'}}>{new Date(s.checked_in_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
                    <span style={{fontSize:12,color:SESSION_TYPES.find(t=>t.id===s.session_type)?.color,marginLeft:8}}>{s.session_type}</span>
                    {s.energy_rating&&<span style={{marginLeft:4}}>{ENERGY[s.energy_rating-1]?.emoji}</span>}
                  </div>
                  {!selectMode&&<button onClick={()=>deleteSingle(s.id)} style={{background:'none',border:'none',color:'#ef5350',cursor:'pointer',fontSize:11,padding:'2px 6px'}}>✕</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
