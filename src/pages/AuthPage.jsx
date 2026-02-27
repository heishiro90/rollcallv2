import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName || 'New Member' } },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function signInWithGoogle() {
    setOauthLoading('google'); setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) { setError(err.message); setOauthLoading(''); }
  }

  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥋</div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 32, fontWeight: 400, color: '#f0ece2' }}>Roll Call</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>Track your mat time. Show up. Level up.</p>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <button
            onClick={signInWithGoogle}
            disabled={!!oauthLoading}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,.15)',
              background: 'rgba(255,255,255,.05)', color: '#f0ece2', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {oauthLoading === 'google' ? 'Connexion...' : 'Continuer avec Google'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {['login', 'signup'].map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '10px 0', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-dim)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
                {m === 'login' ? 'Se connecter' : 'S\'inscrire'}
              </button>
            ))}
          </div>
          {mode === 'signup' && (
            <div><label className="label">Nom</label><input className="input" placeholder="Ton nom" value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>
          )}
          <div><label className="label">Email</label><input className="input" type="email" placeholder="toi@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><label className="label">Mot de passe</label><input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
          {error && <div style={{ color: '#ff6b6b', fontSize: 13, padding: '8px 12px', background: 'rgba(255,100,100,.1)', borderRadius: 8 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}</button>
        </form>
      </div>
    </div>
  );
}
