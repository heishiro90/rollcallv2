import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white:'#f5f5f0', blue:'#1a5fb4', purple:'#7b2d8e', brown:'#8b5e3c', black:'#1a1a1a' };
const BELTS = ['white','blue','purple','brown','black'];
const SORTS = [{ id:'total_sessions', label:'Sessions' },{ id:'total_minutes', label:'Hours' },{ id:'unique_days', label:'Days' }];

function Avatar({ entry, size = 36 }) {
  const border = `2px solid ${BELT_COLORS[entry.belt]||'#333'}`;
  const base = { width:size, height:size, borderRadius:'50%', background:'#222', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, border };
  if (entry.avatar_url) return <div style={base}><img src={entry.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>;
  const init = (entry.display_name||entry.name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  return <div style={{ ...base, fontSize:size*0.38, fontWeight:700, color:'var(--text-dim)' }}>{init}</div>;
}

function BeltDot({ belt, size = 10 }) {
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:BELT_COLORS[belt]||'#888', border:belt==='white'?'1px solid #999':'none', flexShrink:0 }} />;
}

// Small belt stripe dots display
function StripesDots({ stripes = 0 }) {
  if (!stripes) return null;
  return (
    <span style={{ display:'inline-flex', gap:2, alignItems:'center' }}>
      {Array.from({length:stripes}).map((_,i) => (
        <span key={i} style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#f5c542' }} />
      ))}
    </span>
  );
}

function MemberModal({ member, gymId, userId, onSave, onClose }) {
  const [name, setName] = useState(member?.name || '');
  const [belt, setBelt] = useState(member?.belt || 'white');
  const [stripes, setStripes] = useState(member?.stripes ?? 0);
  const [isVisitor, setIsVisitor] = useState(member?.is_visitor || false);
  const [notes, setNotes] = useState(member?.notes || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!name.trim()) { setErr('Name is required'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { name: name.trim(), belt, stripes, is_visitor: isVisitor, notes: notes.trim() || null };
      if (member?.id) {
        await supabase.from('manual_gym_members').update(payload).eq('id', member.id);
      } else {
        await supabase.from('manual_gym_members').insert({ gym_id: gymId, created_by: userId, ...payload });
      }
      onSave();
    } catch(e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#13131f', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:44 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:'var(--font-d)', fontSize:18 }}>{member?.id ? 'Edit Member' : 'Add Member'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <div className="label" style={{ marginBottom:4 }}>Name</div>
          <input className="input" placeholder="e.g. Thomas M." value={name} onChange={e=>setName(e.target.value)} autoFocus />
        </div>

        {/* Belt selector */}
        <div style={{ marginBottom:14 }}>
          <div className="label" style={{ marginBottom:8 }}>Belt</div>
          <div style={{ display:'flex', gap:6 }}>
            {BELTS.map(b => (
              <button key={b} onClick={() => setBelt(b)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 4px', borderRadius:10, cursor:'pointer', border: belt===b ? `1px solid ${BELT_COLORS[b]}` : '1px solid var(--border)', background: belt===b ? `${BELT_COLORS[b]}18` : 'transparent' }}>
                <BeltDot belt={b} size={14} />
                <span style={{ fontSize:9, color: belt===b ? '#ddd' : 'var(--text-muted)', textTransform:'capitalize' }}>{b}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stripes selector */}
        <div style={{ marginBottom:14 }}>
          <div className="label" style={{ marginBottom:8 }}>Stripes</div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2,3,4].map(n => (
              <button key={n} onClick={() => setStripes(n)} style={{ flex:1, padding:'9px 0', borderRadius:9, cursor:'pointer', border: stripes===n ? '1px solid var(--accent)' : '1px solid var(--border)', background: stripes===n ? 'rgba(123,45,142,.2)' : 'transparent', color: stripes===n ? 'var(--accent)' : 'var(--text-muted)', fontSize:13, fontWeight:700 }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Visitor toggle */}
        <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setIsVisitor(!isVisitor)} style={{ width:22, height:22, borderRadius:6, border:'1px solid var(--border)', background: isVisitor ? 'var(--accent)' : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {isVisitor && <span style={{ color:'#fff', fontSize:13, lineHeight:1 }}>✓</span>}
          </button>
          <span style={{ fontSize:13, color:'#ccc' }}>Visitor / guest from another gym</span>
        </div>

        <div style={{ marginBottom:18 }}>
          <div className="label" style={{ marginBottom:4 }}>Notes (optional)</div>
          <input className="input" placeholder="e.g. Training since 2022..." value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        {err && <div style={{ color:'#ff6b6b', fontSize:12, marginBottom:8 }}>{err}</div>}
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ width:'100%' }}>
          {busy ? 'Saving...' : member?.id ? 'Save Changes' : 'Add Member'}
        </button>
      </div>
    </div>
  );
}

export default function GymPage() {
  const { user, gym } = useAuth();
  const [lb, setLb] = useState([]);
  const [sort, setSort] = useState('total_sessions');
  const [gymMembers, setGymMembers] = useState([]);
  const [manualMembers, setManualMembers] = useState([]);
  const [live, setLive] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const isOwner = gym?.owner_id === user?.id;

  useEffect(() => { if (gym) loadData(); }, [gym, sort]);

  async function loadData() {
    const [{ data: l }, { data: m }, { data: li }, { data: man }] = await Promise.all([
      supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id),
      supabase.from('gym_members').select('user_id, role').eq('gym_id', gym.id),
      supabase.from('checkins').select('id').eq('gym_id', gym.id).is('checked_out_at', null),
      supabase.from('manual_gym_members').select('*').eq('gym_id', gym.id).order('created_at'),
    ]);
    setLb((l||[]).sort((a,b) => (b[sort]||0) - (a[sort]||0)));
    setGymMembers(m||[]);
    setLive((li||[]).length);
    setManualMembers(man||[]);
    setLoading(false);
  }

  async function deleteMember(id) {
    if (!confirm('Remove this member?')) return;
    await supabase.from('manual_gym_members').delete().eq('id', id);
    setManualMembers(prev => prev.filter(m => m.id !== id));
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="container" style={{ paddingTop:24, paddingBottom:100 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:'var(--font-d)', fontSize:22, fontWeight:400 }}>{gym?.name}</h2>
        <div style={{ display:'flex', gap:16, marginTop:6, fontSize:13, color:'var(--text-dim)' }}>
          <span>{gymMembers.length} member{gymMembers.length!==1?'s':''}</span>
          {manualMembers.length > 0 && <span>+ {manualMembers.length} manual</span>}
          {live > 0 && <span style={{ color:'#66bb6a' }}>● {live} training now</span>}
        </div>
      </div>

      {/* Invite code */}
      <div className="card" style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:10, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Invite Code</div>
          <div style={{ fontFamily:'monospace', fontSize:20, fontWeight:700, letterSpacing:4, color: showCode ? '#f0ece2' : 'var(--text-muted)', marginTop:4 }}>
            {showCode ? gym?.invite_code : '••••••'}
          </div>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => { if (showCode) navigator.clipboard?.writeText(gym?.invite_code); setShowCode(!showCode); }}>
          {showCode ? 'Copy' : 'Show'}
        </button>
      </div>

      {/* Sort tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {SORTS.map(o => (
          <button key={o.id} onClick={() => setSort(o.id)} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', background: sort===o.id ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: sort===o.id ? '#fff' : 'var(--text-dim)', fontSize:12, fontWeight:600 }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="section-title">{new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
      {lb.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>No sessions yet.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:28 }}>
          {lb.map((e, i) => {
            const isMe = e.user_id === user.id;
            const val = sort==='total_minutes' ? `${(e.total_minutes/60).toFixed(1)}h` : sort==='unique_days' ? `${e.unique_days}d` : `${e.total_sessions}`;
            return (
              <div key={e.user_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: isMe ? 'rgba(123,45,142,.08)' : 'rgba(255,255,255,.015)', border: isMe ? '1px solid rgba(123,45,142,.3)' : '1px solid var(--border)', borderRadius:12 }}>
                <div style={{ width:22, textAlign:'center', fontSize:14, fontWeight:700, color: i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--text-muted)' }}>{i+1}</div>
                <Avatar entry={e} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight: isMe?700:500, color: isMe?'#f0ece2':'#ccc' }}>
                    {e.display_name} {isMe && <span style={{ fontSize:11, color:'var(--accent)' }}>you</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    {e.gi_sessions}gi · {e.nogi_sessions}nogi · {e.open_mat_sessions}open
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-d)', fontSize:18, color:'#f0ece2' }}>{val}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Club Members ── */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <button onClick={() => setShowManual(!showManual)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, padding:0 }}>
            <span style={{ fontSize:14, fontWeight:600, color:'#ccc' }}>Club Members</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{manualMembers.length}</span>
            <span style={{ color:'var(--text-muted)', fontSize:11 }}>{showManual ? '▲' : '▼'}</span>
          </button>
          {isOwner && (
            <button onClick={() => { setEditMember(null); setShowMemberModal(true); }} style={{ padding:'6px 14px', borderRadius:8, background:'var(--accent)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              + Add
            </button>
          )}
        </div>

        {showManual && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {manualMembers.length === 0 && (
              <div className="card" style={{ textAlign:'center', padding:28, color:'var(--text-muted)', fontSize:13 }}>
                No members added yet.{isOwner && ' Tap "+ Add" to add club members.'}
              </div>
            )}
            {manualMembers.map(m => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'rgba(255,255,255,.02)', border:'1px solid var(--border)', borderRadius:12 }}>
                <Avatar entry={{ display_name:m.name, belt:m.belt, avatar_url:null }} size={34} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'#ddd' }}>{m.name}</span>
                    <BeltDot belt={m.belt} size={10} />
                    <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{m.belt}</span>
                    {m.stripes > 0 && <StripesDots stripes={m.stripes} />}
                    {m.is_visitor && <span style={{ fontSize:10, color:'#ffb74d', background:'rgba(255,183,77,.1)', padding:'1px 6px', borderRadius:4 }}>visitor</span>}
                  </div>
                  {m.notes && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{m.notes}</div>}
                </div>
                {isOwner && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => { setEditMember(m); setShowMemberModal(true); }} style={{ padding:'5px 10px', borderRadius:6, background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }}>Edit</button>
                    <button onClick={() => deleteMember(m.id)} style={{ padding:'5px 10px', borderRadius:6, background:'rgba(239,83,80,.08)', border:'1px solid rgba(239,83,80,.2)', color:'#ef5350', fontSize:11, cursor:'pointer' }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showMemberModal && (
        <MemberModal
          member={editMember}
          gymId={gym.id}
          userId={user.id}
          onSave={() => { setShowMemberModal(false); setEditMember(null); loadData(); }}
          onClose={() => { setShowMemberModal(false); setEditMember(null); }}
        />
      )}
    </div>
  );
}
