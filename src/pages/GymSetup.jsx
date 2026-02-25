import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function GymSetup() {
  const { user, refreshData } = useAuth();
  const [mode, setMode] = useState(null);
  const [gymName, setGymName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createGym(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: gym, error: err } = await supabase.from('gyms').insert({ name: gymName, invite_code: code, owner_id: user.id }).select().single();
      if (err) throw err;
      const { error: err2 } = await supabase.from('gym_members').insert({ gym_id: gym.id, user_id: user.id, role: 'owner' });
      if (err2) throw err2;
      await refreshData();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function joinGym(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data: gym, error: err } = await supabase.from('gyms').select('*').eq('invite_code', inviteCode.toUpperCase().trim()).single();
      if (err || !gym) throw new Error('Invalid invite code.');
      const { error: err2 } = await supabase.from('gym_members').insert({ gym_id: gym.id, user_id: user.id, role: 'member' });
      if (err2) { if (err2.code === '23505') throw new Error('Already joined!'); throw err2; }
      await refreshData();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏟️</div>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, color: '#f0ece2' }}>Join Your Gym</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>Create a new gym or join with an invite code.</p>
        </div>
        {!mode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setMode('join')}>🔑 I have an invite code</button>
            <button className="btn btn-secondary" onClick={() => setMode('create')}>🏠 Create a new gym</button>
          </div>
        ) : mode === 'join' ? (
          <form onSubmit={joinGym} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label className="label">Invite Code</label><input className="input" placeholder="e.g. X7K2M9" value={inviteCode} onChange={e => setInviteCode(e.target.value)} style={{ textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', fontSize: 20, fontWeight: 700 }} required maxLength={8} /></div>
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '...' : 'Join Gym'}</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => { setMode(null); setError(''); }}>← Back</button>
          </form>
        ) : (
          <form onSubmit={createGym} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label className="label">Gym Name</label><input className="input" placeholder="e.g. Gracie Barra Paris" value={gymName} onChange={e => setGymName(e.target.value)} required /></div>
            {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '...' : 'Create Gym'}</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => { setMode(null); setError(''); }}>← Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
