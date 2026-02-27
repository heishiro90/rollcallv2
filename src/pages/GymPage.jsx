import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a' };
const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const SORTS = [{ id: 'total_sessions', label: 'Sessions' }, { id: 'total_minutes', label: 'Heures' }, { id: 'unique_days', label: 'Jours' }];

function Avatar({ entry, size = 36 }) {
  const s = { width: size, height: size, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: `2px solid ${BELT_COLORS[entry.belt] || '#333'}` };
  if (entry.avatar_url) return <div style={s}><img src={entry.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  const init = (entry.display_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return <div style={{ ...s, fontSize: size * 0.38, fontWeight: 700, color: 'var(--text-dim)' }}>{init}</div>;
}

function BeltDot({ belt, size = 12 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: BELT_COLORS[belt] || '#888',
      border: belt === 'white' ? '1px solid #bbb' : 'none', flexShrink: 0,
    }} />
  );
}

function BeltPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {BELTS.map(b => (
        <button key={b} type="button" onClick={() => onChange(b)} title={b} style={{
          width: 22, height: 22, borderRadius: '50%', border: value === b ? '2px solid #fff' : '2px solid transparent',
          background: BELT_COLORS[b], cursor: 'pointer', padding: 0,
          boxShadow: b === 'white' ? 'inset 0 0 0 1px #bbb' : 'none',
        }} />
      ))}
    </div>
  );
}

export default function GymPage() {
  const { user, gym, gymRole } = useAuth();
  const isOwner = gymRole === 'owner' || gymRole === 'admin';

  const [lb, setLb] = useState([]);
  const [sort, setSort] = useState('total_sessions');
  const [members, setMembers] = useState([]);
  const [live, setLive] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Gym contacts
  const [contacts, setContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactBelt, setContactBelt] = useState('white');
  const [contactStripes, setContactStripes] = useState(0);
  const [savingContact, setSavingContact] = useState(false);
  const [activeSection, setActiveSection] = useState('leaderboard'); // 'leaderboard' | 'membres'

  useEffect(() => { if (gym) loadData(); }, [gym, sort]);

  async function loadData() {
    const [{ data: l }, { data: m }, { data: li }, { data: c }] = await Promise.all([
      supabase.from('gym_leaderboard').select('*').eq('gym_id', gym.id),
      supabase.from('gym_members').select('user_id').eq('gym_id', gym.id),
      supabase.from('checkins').select('id').eq('gym_id', gym.id).is('checked_out_at', null),
      supabase.from('gym_contacts').select('*').eq('gym_id', gym.id).order('display_name'),
    ]);
    setLb((l || []).sort((a, b) => (b[sort] || 0) - (a[sort] || 0)));
    setMembers(m || []);
    setLive((li || []).length);
    setContacts(c || []);
    setLoading(false);
  }

  async function addContact(e) {
    e.preventDefault();
    if (!contactName.trim()) return;
    setSavingContact(true);
    await supabase.from('gym_contacts').insert({
      gym_id: gym.id,
      display_name: contactName.trim(),
      belt: contactBelt,
      stripes: contactStripes,
      created_by: user.id,
    });
    setContactName(''); setContactBelt('white'); setContactStripes(0);
    setShowContactForm(false);
    setSavingContact(false);
    loadData();
  }

  async function deleteContact(id) {
    if (!confirm('Supprimer ce membre ?')) return;
    await supabase.from('gym_contacts').delete().eq('id', id);
    loadData();
  }

  async function updateContact(id, belt, stripes) {
    await supabase.from('gym_contacts').update({ belt, stripes }).eq('id', id);
    loadData();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Chargement...</div>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400 }}>{gym?.name}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>
          <span>{members.length} membre{members.length !== 1 ? 's' : ''}</span>
          {live > 0 && <span style={{ color: 'var(--success)' }}>● {live} en train de s'entraîner</span>}
        </div>
      </div>

      {/* Invite code */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Code d'invitation</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 4, color: showCode ? '#f0ece2' : 'var(--text-muted)', marginTop: 4 }}>
            {showCode ? gym?.invite_code : '••••••'}
          </div>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => { if (showCode) navigator.clipboard?.writeText(gym?.invite_code); setShowCode(!showCode); }}>
          {showCode ? 'Copier' : 'Afficher'}
        </button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'leaderboard', label: '🏆 Classement' },
          { id: 'membres', label: `👥 Membres (${contacts.length})` },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeSection === s.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
            color: activeSection === s.id ? '#fff' : 'var(--text-dim)',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── LEADERBOARD ── */}
      {activeSection === 'leaderboard' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {SORTS.map(o => (
              <button key={o.id} onClick={() => setSort(o.id)} style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: sort === o.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                color: sort === o.id ? '#fff' : 'var(--text-dim)', fontSize: 12, fontWeight: 600,
              }}>{o.label}</button>
            ))}
          </div>
          <div className="section-title">{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
          {lb.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucune session ce mois-ci.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lb.map((e, i) => {
                const isMe = e.user_id === user.id;
                const val = sort === 'total_minutes' ? `${(e.total_minutes / 60).toFixed(1)}h` : sort === 'unique_days' ? `${e.unique_days} j.` : `${e.total_sessions} sess.`;
                return (
                  <div key={e.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    background: isMe ? 'rgba(123,45,142,.08)' : 'rgba(255,255,255,.015)',
                    border: isMe ? '1px solid rgba(123,45,142,.3)' : '1px solid var(--border)',
                    borderRadius: 12,
                  }}>
                    <div style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 700, color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                      {i + 1}
                    </div>
                    <Avatar entry={e} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: isMe ? '#f0ece2' : '#ccc' }}>
                        {e.display_name} {isMe && <span style={{ fontSize: 11, color: 'var(--accent)' }}>vous</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {e.gi_sessions} gi · {e.nogi_sessions} no-gi · {e.open_mat_sessions} open mat
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontFamily: 'var(--font-d)', color: '#f0ece2' }}>{val}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── MEMBRES VIRTUELS ── */}
      {activeSection === 'membres' && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}>
            Ajoutez ici les membres de votre salle qui n'ont pas encore de compte. Ils pourront être sélectionnés comme adversaires lors des rounds.
          </p>

          {isOwner && (
            <div style={{ marginBottom: 16 }}>
              {!showContactForm ? (
                <button onClick={() => setShowContactForm(true)} className="btn btn-primary btn-small">
                  + Ajouter un membre
                </button>
              ) : (
                <form onSubmit={addContact} className="card" style={{ border: '1px solid var(--accent)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Nouveau membre</div>
                  <div style={{ marginBottom: 10 }}>
                    <label className="label">Nom</label>
                    <input className="input" placeholder="Prénom Nom" value={contactName} onChange={e => setContactName(e.target.value)} required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label" style={{ marginBottom: 8 }}>Ceinture</label>
                    <BeltPicker value={contactBelt} onChange={setContactBelt} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Galons</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0, 1, 2, 3, 4].map(n => (
                        <button key={n} type="button" onClick={() => setContactStripes(n)} style={{
                          width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                          background: contactStripes === n ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                          color: contactStripes === n ? '#fff' : 'var(--text-dim)',
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-small" type="submit" disabled={savingContact} style={{ flex: 1 }}>
                      {savingContact ? '...' : 'Ajouter'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowContactForm(false)} style={{ flex: 1 }}>
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              {isOwner ? 'Aucun membre ajouté. Ajoutez vos élèves !' : 'Aucun membre enregistré par le coach.'}
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
    </div>
  );
}

function ContactRow({ contact, isOwner, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [belt, setBelt] = useState(contact.belt || 'white');
  const [stripes, setStripes] = useState(contact.stripes || 0);

  async function save() {
    await onUpdate(contact.id, belt, stripes);
    setEditing(false);
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: '#222',
          border: `2px solid ${BELT_COLORS[contact.belt] || '#333'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0,
        }}>
          {(contact.display_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>{contact.display_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <BeltDot belt={contact.belt || 'white'} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{contact.belt || 'white'}</span>
            {contact.stripes > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {contact.stripes} galon{contact.stripes > 1 ? 's' : ''}</span>}
          </div>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(!editing)} style={{
              padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: editing ? 'rgba(123,45,142,.15)' : 'rgba(255,255,255,.03)',
              color: editing ? 'var(--accent)' : 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
            }}>✏️</button>
            <button onClick={onDelete} style={{
              padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,83,80,.25)',
              background: 'rgba(239,83,80,.08)', color: '#ef5350', fontSize: 11, cursor: 'pointer',
            }}>✕</button>
          </div>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 10 }}>
            <label className="label" style={{ marginBottom: 6 }}>Ceinture</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {BELTS.map(b => (
                <button key={b} type="button" onClick={() => setBelt(b)} title={b} style={{
                  width: 22, height: 22, borderRadius: '50%', border: belt === b ? '2px solid #fff' : '2px solid transparent',
                  background: BELT_COLORS[b], cursor: 'pointer', padding: 0,
                  boxShadow: b === 'white' ? 'inset 0 0 0 1px #bbb' : 'none',
                }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Galons</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => setStripes(n)} style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: stripes === n ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                  color: stripes === n ? '#fff' : 'var(--text-dim)',
                }}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} className="btn btn-primary btn-small" style={{ flex: 1 }}>Sauvegarder</button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary btn-small" style={{ flex: 1 }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
