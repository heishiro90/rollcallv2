import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BeltSVG } from '../components/Belt';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const BELT_GLOW   = { white: null, blue: 'rgba(26,95,180,.4)', purple: 'rgba(123,45,142,.4)', brown: 'rgba(139,94,60,.4)', black: 'rgba(255,255,255,.1)' };
const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const BELT_NEXT = { white: 'blue', blue: 'purple', purple: 'brown', brown: 'black', black: null };
const SORTS = [{ id: 'total_sessions', label: 'Sessions' }, { id: 'total_minutes', label: 'Hours' }, { id: 'unique_days', label: 'Days' }];

function Avatar({ name, avatarUrl, belt, size = 40 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const s = { width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `2px solid ${BELT_COLORS[belt] || '#333'}`, overflow: 'hidden', background: '#1e1e2a', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (avatarUrl) return <div style={s}><img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  return <div style={{ ...s, fontSize: size * 0.35, fontWeight: 700, color: 'var(--text-dim)' }}>{initials}</div>;
}

function BeltPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {BELTS.map(b => (
        <button key={b} type="button" onClick={() => onChange(b)} title={b} style={{
          width: 24, height: 24, borderRadius: '50%', border: value === b ? '2px solid #fff' : '2px solid transparent',
          background: BELT_COLORS[b], cursor: 'pointer', padding: 0,
          boxShadow: b === 'white' ? 'inset 0 0 0 1px #bbb' : 'none',
        }} />
      ))}
    </div>
  );
}

// ── MEMBER CARD for Promotion Day ────────────────────────────────────────
function MemberCard({ member, isOwner, onPromote, highlighted }) {
  const [confirming, setConfirming] = useState(null); // 'stripe' | 'belt'
  const canAddStripe = member.stripes < 4;
  const canPromoteBelt = member.belt !== 'black';
  const nextBelt = BELT_NEXT[member.belt];

  async function handleAction(type) {
    if (confirming === type) {
      await onPromote(member, type);
      setConfirming(null);
    } else {
      setConfirming(type);
      setTimeout(() => setConfirming(null), 3000);
    }
  }

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: highlighted ? 'rgba(155,77,202,.08)' : 'rgba(255,255,255,.03)',
      border: `1px solid ${highlighted ? 'rgba(155,77,202,.3)' : 'var(--border)'}`,
      transition: 'all .2s',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Avatar name={member.name} avatarUrl={member.avatar_url} belt={member.belt} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {member.name}
          {member.isVirtual && <span style={{ marginLeft: 6, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>offline</span>}
        </div>
        <div style={{ marginTop: 4 }}>
          <BeltSVG belt={member.belt} stripes={member.stripes || 0} width={56} height={10} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
          {member.belt}{member.stripes > 0 ? ` · ${member.stripes} stripe${member.stripes > 1 ? 's' : ''}` : ''}
        </div>
      </div>

      {isOwner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          {canAddStripe && (
            <button
              onClick={() => handleAction('stripe')}
              style={{
                padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: confirming === 'stripe' ? '#9b4dca' : 'rgba(155,77,202,.15)',
                border: `1px solid ${confirming === 'stripe' ? '#9b4dca' : 'rgba(155,77,202,.3)'}`,
                color: confirming === 'stripe' ? '#fff' : '#ce93d8',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}>
              {confirming === 'stripe' ? '✓ Confirm +1 stripe' : `+1 stripe → ${member.stripes + 1}`}
            </button>
          )}
          {canPromoteBelt && nextBelt && (
            <button
              onClick={() => handleAction('belt')}
              style={{
                padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: confirming === 'belt' ? BELT_COLORS[nextBelt] : `${BELT_COLORS[nextBelt]}22`,
                border: `1px solid ${confirming === 'belt' ? BELT_COLORS[nextBelt] : `${BELT_COLORS[nextBelt]}44`}`,
                color: confirming === 'belt' ? (nextBelt === 'white' ? '#111' : '#fff') : '#aaa',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}>
              {confirming === 'belt' ? `✓ Promote to ${nextBelt}` : `→ ${nextBelt.charAt(0).toUpperCase() + nextBelt.slice(1)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── CONTACT ROW (Members tab) ─────────────────────────────────────────────
function ContactRow({ contact, isOwner, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [belt, setBelt] = useState(contact.belt || 'white');
  const [stripes, setStripes] = useState(contact.stripes || 0);

  async function save() { await onUpdate(contact.id, belt, stripes); setEditing(false); }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={contact.display_name} belt={contact.belt || 'white'} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{contact.display_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <BeltSVG belt={contact.belt || 'white'} stripes={contact.stripes || 0} width={48} height={9} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {contact.belt || 'white'}{contact.stripes > 0 ? ` · ${contact.stripes}s` : ''}
            </span>
          </div>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(!editing)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: editing ? 'rgba(123,45,142,.15)' : 'rgba(255,255,255,.03)', color: editing ? 'var(--accent)' : 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>✏️</button>
            <button onClick={onDelete} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,83,80,.25)', background: 'rgba(239,83,80,.08)', color: '#ef5350', fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </div>
      {editing && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 10 }}>
            <label className="label" style={{ marginBottom: 6 }}>Belt</label>
            <BeltPicker value={belt} onChange={setBelt} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Stripes</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0,1,2,3,4].map(n => (
                <button key={n} type="button" onClick={() => setStripes(n)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: stripes === n ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: stripes === n ? '#fff' : 'var(--text-dim)' }}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} className="btn btn-primary btn-small" style={{ flex: 1 }}>Save</button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary btn-small" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function GymPage() {
  const { user, gym, gymRole } = useAuth();
  const isOwner = gymRole === 'owner' || gymRole === 'admin';

  const [section, setSection] = useState('leaderboard');
  const [sort, setSort] = useState('total_sessions');
  const [lb, setLb] = useState([]);
  const [members, setMembers] = useState([]); // registered users
  const [contacts, setContacts] = useState([]); // virtual contacts
  const [live, setLive] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promotionMode, setPromotionMode] = useState(false);
  const [promotedToday, setPromotedToday] = useState(new Set()); // ids promoted this session

  // Add contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactBelt, setContactBelt] = useState('white');
  const [contactStripes, setContactStripes] = useState(0);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => { if (gym) loadData(); }, [gym, sort]);

  async function loadData() {
    const [{ data: l }, { data: m }, { data: li }, { data: c }] = await Promise.all([
      supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id),
      supabase.from('gym_members').select('user_id, role, profiles(display_name, belt, stripes, avatar_url, avatar_emoji)').eq('gym_id', gym.id),
      supabase.from('checkins').select('id').eq('gym_id', gym.id).is('checked_out_at', null),
      supabase.from('gym_contacts').select('*').eq('gym_id', gym.id).order('display_name'),
    ]);
    setLb((l || []).sort((a, b) => (b[sort] || 0) - (a[sort] || 0)));
    setMembers(m || []);
    setLive((li || []).length);
    setContacts(c || []);
    setLoading(false);
  }

  // Build unified member list for promotion day
  const allMembers = [
    ...members.map(m => ({
      id: m.user_id,
      name: m.profiles?.display_name || 'Unknown',
      belt: m.profiles?.belt || 'white',
      stripes: m.profiles?.stripes || 0,
      avatar_url: m.profiles?.avatar_url,
      isVirtual: false,
    })),
    ...contacts.map(c => ({
      id: `contact_${c.id}`,
      contactId: c.id,
      name: c.display_name,
      belt: c.belt || 'white',
      stripes: c.stripes || 0,
      avatar_url: null,
      isVirtual: true,
    })),
  ].sort((a, b) => {
    const bi = BELTS.indexOf(a.belt) - BELTS.indexOf(b.belt);
    if (bi !== 0) return bi;
    return (b.stripes || 0) - (a.stripes || 0);
  });

  async function promoteMembers(member, type) {
    let newBelt = member.belt;
    let newStripes = member.stripes;

    if (type === 'stripe') {
      newStripes = Math.min(4, newStripes + 1);
    } else if (type === 'belt') {
      const nb = BELT_NEXT[member.belt];
      if (!nb) return;
      newBelt = nb;
      newStripes = 0;
    }

    const today = new Date().toISOString().split('T')[0];

    if (member.isVirtual) {
      await supabase.from('gym_contacts').update({ belt: newBelt, stripes: newStripes }).eq('id', member.contactId);
    } else {
      await supabase.from('profiles').update({ belt: newBelt, stripes: newStripes }).eq('id', member.id);
      // Log in belt_history
      await supabase.from('belt_history').insert({ user_id: member.id, belt: newBelt, stripes: newStripes, promoted_at: today });
    }

    setPromotedToday(prev => new Set([...prev, member.id]));
    loadData();
  }

  async function addContact(e) {
    e.preventDefault();
    if (!contactName.trim()) return;
    setSavingContact(true);
    await supabase.from('gym_contacts').insert({ gym_id: gym.id, display_name: contactName.trim(), belt: contactBelt, stripes: contactStripes, created_by: user.id });
    setContactName(''); setContactBelt('white'); setContactStripes(0);
    setShowContactForm(false); setSavingContact(false);
    loadData();
  }

  async function deleteContact(id) {
    if (!confirm('Delete this member?')) return;
    await supabase.from('gym_contacts').delete().eq('id', id);
    loadData();
  }

  async function updateContact(id, belt, stripes) {
    await supabase.from('gym_contacts').update({ belt, stripes }).eq('id', id);
    loadData();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // Group for promotion day
  const byBelt = BELTS.reduce((acc, b) => { acc[b] = allMembers.filter(m => m.belt === b); return acc; }, {});

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400 }}>{gym?.name}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>
          <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          {contacts.length > 0 && <span style={{ color: '#555' }}>+ {contacts.length} offline</span>}
          {live > 0 && <span style={{ color: 'var(--success)' }}>● {live} training now</span>}
        </div>
      </div>

      {/* Invite code */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Invite Code</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: showCode ? '#f0ece2' : 'var(--text-muted)', marginTop: 4 }}>
            {showCode ? gym?.invite_code : '••••••'}
          </div>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => { if (showCode) navigator.clipboard?.writeText(gym?.invite_code); setShowCode(!showCode); }}>
          {showCode ? 'Copy' : 'Show'}
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'leaderboard', label: '🏆 Leaderboard' },
          { id: 'members', label: `👥 Members (${allMembers.length})` },
          ...(isOwner ? [{ id: 'promotion', label: '🥋 Promotion Day' }] : []),
        ].map(s => (
          <button key={s.id} onClick={() => { setSection(s.id); if (s.id === 'promotion') setPromotionMode(true); else setPromotionMode(false); }} style={{
            flex: 1, minWidth: 120, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: section === s.id ? (s.id === 'promotion' ? '#9b4dca' : 'var(--accent)') : 'rgba(255,255,255,.04)',
            color: section === s.id ? '#fff' : 'var(--text-dim)',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── LEADERBOARD ── */}
      {section === 'leaderboard' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {SORTS.map(o => (
              <button key={o.id} onClick={() => setSort(o.id)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: sort === o.id ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: sort === o.id ? '#fff' : 'var(--text-dim)', fontSize: 12, fontWeight: 600 }}>{o.label}</button>
            ))}
          </div>
          <div className="section-title">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          {lb.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No sessions this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lb.map((e, i) => {
                const isMe = e.user_id === user.id;
                const val = sort === 'total_minutes' ? `${(e.total_minutes / 60).toFixed(1)}h` : sort === 'unique_days' ? `${e.unique_days} d.` : `${e.total_sessions}`;
                return (
                  <div key={e.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isMe ? 'rgba(155,77,202,.07)' : undefined, borderColor: isMe ? 'rgba(155,77,202,.25)' : undefined }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: i < 3 ? ['#ffd700','#c0c0c0','#cd7f32'][i] : '#555', width: 24, textAlign: 'center' }}>{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}</div>
                    <Avatar name={e.display_name} avatarUrl={e.avatar_url} belt={e.belt || 'white'} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isMe ? '#f0ece2' : '#ccc' }}>
                        {e.display_name} {isMe && <span style={{ fontSize: 10, color: 'var(--accent)' }}>you</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {e.gi_sessions} gi · {e.nogi_sessions} no-gi · {e.open_mat_sessions} open mat
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-d)', color: '#f0ece2', fontWeight: 700 }}>{val}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── MEMBERS ── */}
      {section === 'members' && (
        <>
          {isOwner && (
            <div style={{ marginBottom: 16 }}>
              {!showContactForm ? (
                <button onClick={() => setShowContactForm(true)} className="btn btn-primary btn-small">+ Add offline member</button>
              ) : (
                <form onSubmit={addContact} className="card" style={{ border: '1px solid var(--accent)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>New member</div>
                  <div style={{ marginBottom: 10 }}>
                    <label className="label">Name</label>
                    <input className="input" placeholder="First Last" value={contactName} onChange={e => setContactName(e.target.value)} required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label" style={{ marginBottom: 8 }}>Belt</label>
                    <BeltPicker value={contactBelt} onChange={setContactBelt} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Stripes</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0,1,2,3,4].map(n => (
                        <button key={n} type="button" onClick={() => setContactStripes(n)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: contactStripes === n ? 'var(--accent)' : 'rgba(255,255,255,.04)', color: contactStripes === n ? '#fff' : 'var(--text-dim)' }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-small" type="submit" disabled={savingContact} style={{ flex: 1 }}>{savingContact ? '...' : 'Add'}</button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowContactForm(false)} style={{ flex: 1 }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}>
            Offline members can be selected as sparring partners in rounds even without an account.
          </p>
          {contacts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              {isOwner ? 'No offline members yet. Add your students!' : 'No members registered by the coach.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contacts.map(c => (
                <ContactRow key={c.id} contact={c} isOwner={isOwner} onDelete={() => deleteContact(c.id)} onUpdate={updateContact} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PROMOTION DAY ── */}
      {section === 'promotion' && isOwner && (
        <>
          {/* Banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(155,77,202,.15), rgba(106,27,154,.08))', border: '1px solid rgba(155,77,202,.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: '#ce93d8', marginBottom: 6 }}>🥋 Promotion Day</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Tap <strong style={{ color: '#fff' }}>+1 stripe</strong> to add a stripe, or <strong style={{ color: '#fff' }}>→ Belt</strong> to promote to the next belt.
              Each action requires a second tap to confirm. Belt promotions are automatically logged to the student's history.
            </div>
            {promotedToday.size > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#66bb6a', fontWeight: 600 }}>
                ✓ {promotedToday.size} promotion{promotedToday.size > 1 ? 's' : ''} done today
              </div>
            )}
          </div>

          {/* Members grouped by belt */}
          {allMembers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No members yet. Add students in the Members tab.</div>
          ) : (
            BELTS.filter(b => byBelt[b]?.length > 0).map(belt => (
              <div key={belt} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: BELT_COLORS[belt], border: belt === 'white' ? '1px solid #bbb' : 'none', boxShadow: BELT_GLOW[belt] ? `0 0 8px ${BELT_GLOW[belt]}` : 'none' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 2 }}>
                    {belt} <span style={{ color: '#555', fontWeight: 400 }}>({byBelt[belt].length})</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byBelt[belt].map(member => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      isOwner={isOwner}
                      onPromote={promoteMembers}
                      highlighted={promotedToday.has(member.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
