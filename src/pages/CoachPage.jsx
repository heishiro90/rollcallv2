import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CategoryBadge, CAT_STYLE } from '../components/Icons';

const CATS = ['guard', 'passing', 'takedown', 'submission', 'escape', 'sweep', 'other'];
const TYPES = [{ id: 'gi', label: 'Gi' }, { id: 'nogi', label: 'No-Gi' }, { id: 'open_mat', label: 'Open Mat' }];

export default function CoachPage() {
  const { user, gym, gymRole } = useAuth();
  const isCoach = gymRole === 'owner' || gymRole === 'admin';
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [sessionType, setSessionType] = useState('gi');
  const [title, setTitle] = useState('');
  const [techRows, setTechRows] = useState([{ name: '', category: 'guard', youtube_url: '', position_from: '', position_to: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (gym) loadClasses(); }, [gym]);

  async function loadClasses() {
    const { data } = await supabase.from('class_curriculum').select('*, curriculum_techniques(*)')
      .eq('gym_id', gym.id).order('class_date', { ascending: false }).order('start_time', { ascending: false }).limit(20);
    setClasses(data || []);
    setLoading(false);
  }

  function addTechRow() {
    setTechRows(prev => [...prev, { name: '', category: 'guard', youtube_url: '', position_from: '', position_to: '' }]);
  }

  function updateTechRow(i, field, value) {
    setTechRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: value } : r));
  }

  function removeTechRow(i) {
    setTechRows(prev => prev.filter((_, j) => j !== i));
  }

  async function saveClass(e) {
    e.preventDefault();
    setSaving(true);
    const { data: cls } = await supabase.from('class_curriculum').insert({
      gym_id: gym.id, posted_by: user.id, class_date: classDate,
      start_time: startTime, end_time: endTime, session_type: sessionType,
      title: title.trim() || null,
    }).select().single();

    if (cls) {
      const validTechs = techRows.filter(t => t.name.trim());
      if (validTechs.length > 0) {
        await supabase.from('curriculum_techniques').insert(
          validTechs.map(t => ({
            curriculum_id: cls.id, name: t.name.trim(), category: t.category,
            youtube_url: t.youtube_url.trim() || null,
            position_from: t.position_from.trim() || null,
            position_to: t.position_to.trim() || null,
          }))
        );
      }
    }

    setShowForm(false);
    setTitle('');
    setTechRows([{ name: '', category: 'guard', youtube_url: '', position_from: '', position_to: '' }]);
    setSaving(false);
    loadClasses();
  }

  async function deleteClass(id) {
    await supabase.from('class_curriculum').delete().eq('id', id);
    loadClasses();
  }

  function extractYoutubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 400 }}>Class Curriculum</h2>
        {isCoach && (
          <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Class'}
          </button>
        )}
      </div>

      {/* Coach form */}
      {isCoach && showForm && (
        <form onSubmit={saveClass} className="card" style={{ marginBottom: 20 }}>
          <div className="section-title">Post Class Techniques</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label className="label">Date</label><input className="input" type="date" value={classDate} onChange={e => setClassDate(e.target.value)} required /></div>
            <div><label className="label">Start</label><input className="input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required /></div>
            <div><label className="label">End</label><input className="input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label className="label">Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setSessionType(t.id)} style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: sessionType === t.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                    color: sessionType === t.id ? '#fff' : 'var(--text-dim)',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div><label className="label">Title (optional)</label><input className="input" placeholder="e.g. Guard retention day" value={title} onChange={e => setTitle(e.target.value)} /></div>
          </div>

          <div className="label" style={{ marginBottom: 8 }}>Techniques</div>
          {techRows.map((row, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input" placeholder="Technique name" value={row.name} onChange={e => updateTechRow(i, 'name', e.target.value)} style={{ flex: 2, padding: '8px 10px', fontSize: 13 }} />
                <select value={row.category} onChange={e => updateTechRow(i, 'category', e.target.value)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
                  color: CAT_STYLE[row.category]?.color || '#ccc', fontSize: 12,
                }}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_STYLE[c]?.label || c}</option>)}
                </select>
                {techRows.length > 1 && (
                  <button type="button" onClick={() => removeTechRow(i)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="YouTube link (optional)" value={row.youtube_url} onChange={e => updateTechRow(i, 'youtube_url', e.target.value)} style={{ flex: 2, padding: '6px 10px', fontSize: 12 }} />
                <input className="input" placeholder="From position" value={row.position_from} onChange={e => updateTechRow(i, 'position_from', e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} />
                <input className="input" placeholder="To position" value={row.position_to} onChange={e => updateTechRow(i, 'position_to', e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} />
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-small" onClick={addTechRow} style={{ marginBottom: 14 }}>+ Add technique</button>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? '...' : 'Post Class'}</button>
        </form>
      )}

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          {isCoach ? "No classes posted yet. Add your first one!" : "Your coach hasn't posted any classes yet."}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {classes.map(c => {
            const techs = c.curriculum_techniques || [];
            const isToday = c.class_date === new Date().toISOString().split('T')[0];
            return (
              <div key={c.id} className="card" style={{ border: isToday ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isToday ? 'var(--accent)' : '#ddd' }}>
                      {isToday ? "Today's Class" : new Date(c.class_date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                        {c.start_time?.slice(0, 5)} — {c.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    {c.title && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{c.title}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: c.session_type === 'gi' ? 'rgba(123,45,142,.15)' : c.session_type === 'nogi' ? 'rgba(110,198,255,.15)' : 'rgba(255,138,101,.15)',
                      color: c.session_type === 'gi' ? '#b07cc3' : c.session_type === 'nogi' ? '#6ec6ff' : '#ff8a65',
                    }}>{c.session_type === 'gi' ? 'Gi' : c.session_type === 'nogi' ? 'No-Gi' : 'Open Mat'}</span>
                    {isCoach && <button onClick={() => deleteClass(c.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                </div>

                {techs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {techs.map((t, i) => {
                      const ytId = extractYoutubeId(t.youtube_url);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 8, borderLeft: `3px solid ${CAT_STYLE[t.category]?.color || '#555'}` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, color: '#ddd' }}>{t.name}</span>
                              <CategoryBadge category={t.category} size="small" />
                            </div>
                            {(t.position_from || t.position_to) && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {t.position_from}{t.position_from && t.position_to ? ' → ' : ''}{t.position_to}
                              </div>
                            )}
                          </div>
                          {ytId && (
                            <a href={t.youtube_url} target="_blank" rel="noopener noreferrer" style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                              background: 'rgba(255,0,0,.1)', color: '#f44', fontSize: 12, textDecoration: 'none',
                            }}>▶ Video</a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
