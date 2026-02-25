import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
const EMOJIS = ['🥋', '🦁', '🐍', '🦅', '🐙', '🦈', '🐺', '🦍', '🔥', '💀', '👊', '⚡'];

export default function ProfilePage() {
  const { user, profile, gym, gymRole, signOut, refreshData } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [belt, setBelt] = useState(profile?.belt || 'white');
  const [stripes, setStripes] = useState(profile?.stripes || 0);
  const [emoji, setEmoji] = useState(profile?.avatar_emoji || '🥋');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [badges, setBadges] = useState([]);
  const [members, setMembers] = useState([]);
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeEmoji, setNewBadgeEmoji] = useState('🏅');
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [awardUserId, setAwardUserId] = useState('');
  const isOwner = gymRole === 'owner';

  useEffect(() => { if (isOwner && gym) loadAdmin(); }, [gym, gymRole]);

  async function loadAdmin() {
    const { data: b } = await supabase.from('badges').select('*').eq('gym_id', gym.id).order('created_at');
    setBadges(b || []);
    const { data: m } = await supabase.from('gym_members').select('user_id, role, profiles(display_name, avatar_emoji)').eq('gym_id', gym.id);
    setMembers(m || []);
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true);
    await supabase.from('profiles').update({ display_name: displayName, belt, stripes: parseInt(stripes), avatar_emoji: emoji }).eq('id', user.id);
    await refreshData(); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function createBadge(e) {
    e.preventDefault(); if (!newBadgeName.trim()) return;
    await supabase.from('badges').insert({ gym_id: gym.id, name: newBadgeName.trim(), emoji: newBadgeEmoji, created_by: user.id });
    setNewBadgeName(''); setNewBadgeEmoji('🏅'); loadAdmin();
  }

  async function awardBadge(e) {
    e.preventDefault(); if (!awardBadgeId || !awardUserId) return;
    await supabase.from('user_badges').insert({ badge_id: awardBadgeId, user_id: awardUserId, gym_id: gym.id, awarded_by: user.id });
    setAwardBadgeId(''); setAwardUserId('');
  }

  async function deleteBadge(id) { await supabase.from('badges').delete().eq('id', id); loadAdmin(); }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Settings</h2>

      <form onSubmit={saveProfile} className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Your Profile</div>
        <div style={{ marginBottom: 16 }}><label className="label">Display Name</label><input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Avatar</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setEmoji(e)} style={{
                width: 40, height: 40, fontSize: 22, background: emoji === e ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                border: emoji === e ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{e}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div><label className="label">Belt</label><select className="input" value={belt} onChange={e => setBelt(e.target.value)}>{BELTS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}</select></div>
          <div><label className="label">Stripes</label><select className="input" value={stripes} onChange={e => setStripes(e.target.value)}>{[0,1,2,3,4].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saved ? '✓ Saved!' : saving ? '...' : 'Save Profile'}</button>
      </form>

      {isOwner && (
        <>
          <div style={{ fontSize: 12, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 16, marginTop: 8 }}>⚙ Gym Admin</div>

          <form onSubmit={createBadge} className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Create Badge</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="input" placeholder="Badge name" value={newBadgeName} onChange={e => setNewBadgeName(e.target.value)} style={{ flex: 1 }} required />
              <input className="input" value={newBadgeEmoji} onChange={e => setNewBadgeEmoji(e.target.value)} style={{ width: 56, textAlign: 'center', fontSize: 20 }} />
            </div>
            <button className="btn btn-secondary btn-small" type="submit">+ Create</button>
          </form>

          {badges.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title">Badges</div>
              {badges.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span>{b.emoji} {b.name}</span>
                  <button onClick={() => deleteBadge(b.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {badges.length > 0 && members.length > 0 && (
            <form onSubmit={awardBadge} className="card" style={{ marginBottom: 16 }}>
              <div className="section-title">Award Badge</div>
              <select className="input" value={awardBadgeId} onChange={e => setAwardBadgeId(e.target.value)} style={{ marginBottom: 8 }} required>
                <option value="">Select badge...</option>
                {badges.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
              </select>
              <select className="input" value={awardUserId} onChange={e => setAwardUserId(e.target.value)} style={{ marginBottom: 10 }} required>
                <option value="">Select member...</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.avatar_emoji} {m.profiles?.display_name}</option>)}
              </select>
              <button className="btn btn-secondary btn-small" type="submit">🏅 Award</button>
            </form>
          )}
        </>
      )}

      <button className="btn btn-danger" onClick={signOut} style={{ marginTop: 8 }}>Sign Out</button>
    </div>
  );
}
