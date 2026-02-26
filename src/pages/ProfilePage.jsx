import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELTS = ['white','blue','purple','brown','black'];
const BELT_COLORS = { white:'#e8e8e0', blue:'#1a5fb4', purple:'#7b2d8e', brown:'#8b5e3c', black:'#444' };
const STRIPES = [0,1,2,3,4];

export default function ProfilePage() {
  const { user, profile, refreshData } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [belt, setBelt] = useState('white');
  const [stripes, setStripes] = useState(0);
  const [age, setAge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBelt(profile.belt || 'white');
      setStripes(profile.stripes || 0);
      setAge(profile.age || '');
      setAvatarUrl(profile.avatar_url || '');
      setLoading(false);
    }
  }, [profile]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const { error: err } = await supabase.from('profiles').update({
        display_name: displayName.trim(),
        belt,
        stripes,
        age: age ? parseInt(age) : null,
      }).eq('id', user.id);
      if (err) throw err;
      await refreshData();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      await refreshData();
    } catch(e) { setError(e.message); }
    setUploadingAvatar(false);
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="container" style={{ paddingTop:32, paddingBottom:100 }}>
      <h1 style={{ fontFamily:'var(--font-d)', fontSize:24, fontWeight:400, marginBottom:24 }}>Profile</h1>

      {/* Avatar */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
        <div onClick={() => fileRef.current?.click()} style={{ width:84, height:84, borderRadius:'50%', background:'#222', border:`3px solid ${BELT_COLORS[belt]||'#333'}`, overflow:'hidden', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, position:'relative' }}>
          {avatarUrl ? (
            <img src={avatarUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="avatar" />
          ) : (
            <span style={{ fontSize:32, color:'var(--text-dim)', fontWeight:700 }}>
              {(displayName||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}
            </span>
          )}
          {uploadingAvatar && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:11 }}>...</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display:'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:12, cursor:'pointer' }}>Change photo</button>
      </div>

      <form onSubmit={saveProfile} style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Name */}
        <div>
          <div className="label">Display Name</div>
          <input
            className="input"
            placeholder="Your name"
            value={displayName}
            onChange={e=>setDisplayName(e.target.value)}
            required
          />
        </div>

        {/* Age */}
        <div>
          <div className="label">Age</div>
          <input
            className="input"
            type="number"
            min="1" max="100"
            placeholder="e.g. 28"
            value={age}
            onChange={e=>setAge(e.target.value)}
            style={{ maxWidth:120 }}
          />
        </div>

        {/* Belt */}
        <div>
          <div className="label" style={{ marginBottom:10 }}>Belt</div>
          <div style={{ display:'flex', gap:8 }}>
            {BELTS.map(b => (
              <button
                key={b} type="button"
                onClick={() => setBelt(b)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 4px', borderRadius:12, cursor:'pointer', border:belt===b?`2px solid ${BELT_COLORS[b]}`:'1px solid var(--border)', background:belt===b?`${BELT_COLORS[b]}12`:'rgba(255,255,255,.02)' }}
              >
                <span style={{ display:'block', width:16, height:16, borderRadius:'50%', background:BELT_COLORS[b], border:b==='white'?'1px solid #999':'none' }} />
                <span style={{ fontSize:9, textTransform:'capitalize', color:belt===b?'#ddd':'var(--text-muted)' }}>{b}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stripes */}
        <div>
          <div className="label" style={{ marginBottom:8 }}>Stripes</div>
          <div style={{ display:'flex', gap:8 }}>
            {STRIPES.map(n => (
              <button
                key={n} type="button"
                onClick={() => setStripes(n)}
                style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer', border:stripes===n?'2px solid var(--accent)':'1px solid var(--border)', background:stripes===n?'rgba(123,45,142,.15)':'rgba(255,255,255,.02)', color:stripes===n?'var(--accent)':'var(--text-muted)', fontSize:14, fontWeight:700 }}
              >{n}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ color:'#ff6b6b', fontSize:13, padding:'8px 12px', background:'rgba(255,100,100,.08)', borderRadius:8 }}>{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop:4 }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
        </button>
      </form>

      {/* Account section */}
      <div style={{ marginTop:32, paddingTop:24, borderTop:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:1, fontWeight:600, marginBottom:12 }}>Account</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{user?.email}</div>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => supabase.auth.signOut()}
          style={{ color:'#ef5350' }}
        >Sign Out</button>
      </div>
    </div>
  );
}
