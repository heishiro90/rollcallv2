import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName || 'New Member' } } });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥋</div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 32, fontWeight: 400, color: '#f0ece2' }}>Roll Call</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>Track your mat time. Show up. Level up.</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {['login', 'signup'].map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '10px 0', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-dim)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>
          {mode === 'signup' && <div><label className="label">Display Name</label><input className="input" placeholder="Your name on the mat" value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>}
          <div><label className="label">Email</label><input className="input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
          {error && <div style={{ color: '#ff6b6b', fontSize: 13, padding: '8px 12px', background: 'rgba(255,100,100,.1)', borderRadius: 8 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}</button>
        </form>
      </div>
    </div>
  );
}
