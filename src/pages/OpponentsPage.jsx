import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = { white: '#e8e8e0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#444' };
const BELT_ORDER = { white: 0, blue: 1, purple: 2, brown: 3, black: 4 };

function BeltDot({ belt, size = 10 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: BELT_COLORS[belt] || '#888',
      border: belt === 'white' ? '1px solid #999' : 'none', flexShrink: 0,
    }} />
  );
}

function MemberAvatar({ p, size = 36 }) {
  if (p?.avatar_url) {
    return <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />;
  }
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: '#2a2a3a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, flexShrink: 0 }}>
      {p?.avatar_emoji || '🥋'}
    </span>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, padding: '12px 8px', background: 'rgba(255,255,255,.03)', borderRadius: 10, textAlign: 'center', border: `1px solid ${color || 'var(--border)'}22` }}>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, color: color || '#f0ece2' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function WinBar({ wins, draws, losses }) {
  const total = wins + draws + losses;
  if (total === 0) return null;
  const wPct = (wins / total) * 100;
  const dPct = (draws / total) * 100;
  const lPct = (losses / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 6, marginBottom: 4 }}>
        {wPct > 0 && <div style={{ width: `${wPct}%`, background: '#66bb6a' }} />}
        {dPct > 0 && <div style={{ width: `${dPct}%`, background: '#ffb74d' }} />}
        {lPct > 0 && <div style={{ width: `${lPct}%`, background: '#ef5350' }} />}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        {wins > 0 && <span style={{ color: '#66bb6a' }}>{wins}W</span>}
        {draws > 0 && <span style={{ color: '#ffb74d' }}>{draws}D</span>}
        {losses > 0 && <span style={{ color: '#ef5350' }}>{losses}L</span>}
        <span style={{ marginLeft: 'auto' }}>{total} rounds</span>
      </div>
    </div>
  );
}

function fmt(sec) { if (!sec) return '—'; const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; }
function fmtMin(sec) { if (!sec) return '—'; const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }

export default function OpponentsPage() {
  const { user, gym, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [opponents, setOpponents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => { if (user && gym) load(); }, [user, gym]);

  async function load() {
    // Fetch my full profile (for age/weight comparison)
    const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setMyProfile(me);

    // Fetch all my rounds with events
    const { data: rounds } = await supabase
      .from('rounds')
      .select('*, round_events(*)')
      .eq('user_id', user.id)
      .eq('gym_id', gym.id)
      .not('ended_at', 'is', null);

    if (!rounds?.length) { setLoading(false); return; }

    // Collect unique opponent keys
    const memberIds = [...new Set(rounds.filter(r => r.opponent_id).map(r => r.opponent_id))];
    let memberProfiles = {};
    if (memberIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', memberIds);
      profiles?.forEach(p => { memberProfiles[p.id] = p; });
    }

    // Group rounds by opponent
    const map = {};

    for (const r of rounds) {
      let key, label, profile = null, isGuest = false;

      if (r.opponent_id) {
        key = `member_${r.opponent_id}`;
        profile = memberProfiles[r.opponent_id] || null;
        label = profile?.display_name || 'Unknown member';
      } else if (r.opponent_name) {
        key = `guest_${r.opponent_name.toLowerCase().trim()}`;
        label = r.opponent_name;
        isGuest = true;
      } else {
        continue; // no opponent, skip
      }

      if (!map[key]) {
        map[key] = {
          key, label, profile, isGuest,
          belt: r.opponent_belt || profile?.belt || null,
          rounds: [],
        };
      }
      map[key].rounds.push(r);
    }

    // Compute stats per opponent
    const result = Object.values(map).map(opp => {
      const rs = opp.rounds;
      const wins = rs.filter(r => r.result === 'win').length;
      const losses = rs.filter(r => r.result === 'loss').length;
      const draws = rs.filter(r => r.result === 'draw').length;
      const totalSec = rs.reduce((acc, r) => {
        if (r.started_at && r.ended_at) {
          return acc + Math.round((new Date(r.ended_at) - new Date(r.started_at)) / 1000);
        }
        return acc;
      }, 0);

      const allEvents = rs.flatMap(r => r.round_events || []);
      const mySubmissions = allEvents.filter(e => e.event_type === 'submission' && e.direction === 'offensive');
      const theirSubmissions = allEvents.filter(e => e.event_type === 'submission' && e.direction === 'defensive');
      const mySweeps = allEvents.filter(e => e.event_type === 'sweep' && e.direction === 'offensive').length;
      const myPasses = allEvents.filter(e => e.event_type === 'pass' && e.direction === 'offensive').length;
      const myTakedowns = allEvents.filter(e => e.event_type === 'takedown' && e.direction === 'offensive').length;

      // Top techniques
      const techCount = {};
      mySubmissions.forEach(e => { techCount[e.technique] = (techCount[e.technique] || 0) + 1; });
      const topTechs = Object.entries(techCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

      return {
        ...opp,
        wins, losses, draws,
        totalRounds: rs.length,
        totalSec,
        mySubCount: mySubmissions.length,
        theirSubCount: theirSubmissions.length,
        mySweeps, myPasses, myTakedowns,
        topTechs,
        firstRollDate: rs.map(r => r.started_at).filter(Boolean).sort()[0],
        lastRollDate: rs.map(r => r.started_at).filter(Boolean).sort().reverse()[0],
      };
    }).sort((a, b) => b.totalRounds - a.totalRounds);

    setOpponents(result);
    setLoading(false);
  }

  function weightComparison(oppProfile) {
    if (!myProfile?.weight_kg || !oppProfile?.weight_kg) return null;
    const diff = oppProfile.weight_kg - myProfile.weight_kg;
    if (Math.abs(diff) < 1) return null;
    return diff > 0
      ? `+${diff.toFixed(1)}kg heavier than you`
      : `${Math.abs(diff).toFixed(1)}kg lighter than you`;
  }

  function ageComparison(oppProfile) {
    if (!myProfile?.age || !oppProfile?.age) return null;
    const diff = oppProfile.age - myProfile.age;
    if (Math.abs(diff) < 1) return null;
    return diff > 0
      ? `${diff} years older than you`
      : `${Math.abs(diff)} years younger than you`;
  }

  function beltComparison(oppBelt) {
    if (!myProfile?.belt || !oppBelt) return null;
    const mine = BELT_ORDER[myProfile.belt] ?? 0;
    const theirs = BELT_ORDER[oppBelt] ?? 0;
    if (theirs > mine) return `Higher belt (${oppBelt})`;
    if (theirs < mine) return `Lower belt (${oppBelt})`;
    return `Same belt level`;
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  // ─── Detail view ───
  if (selected) {
    const opp = opponents.find(o => o.key === selected);
    if (!opp) return null;
    const wt = weightComparison(opp.profile);
    const ag = ageComparison(opp.profile);
    const bl = beltComparison(opp.belt);
    const winRate = opp.totalRounds > 0 ? Math.round((opp.wins / opp.totalRounds) * 100) : 0;

    return (
      <div className="container fade-in" style={{ paddingTop: 24, paddingBottom: 100 }}>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>

        {/* Header */}
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MemberAvatar p={opp.profile} size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: '#f0ece2' }}>{opp.label}</div>
              {opp.belt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <BeltDot belt={opp.belt} size={12} />
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{opp.belt} belt</span>
                </div>
              )}
              {opp.isGuest && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Guest / External</div>}
            </div>
          </div>

          {/* Comparisons */}
          {(wt || ag || bl) && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bl && (
                <span style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, background: 'rgba(123,45,142,.12)', color: '#ce93d8', border: '1px solid rgba(123,45,142,.2)' }}>
                  🥋 {bl}
                </span>
              )}
              {wt && (
                <span style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, background: 'rgba(255,255,255,.05)', color: 'var(--text-dim)' }}>
                  ⚖️ {wt}
                </span>
              )}
              {ag && (
                <span style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, background: 'rgba(255,255,255,.05)', color: 'var(--text-dim)' }}>
                  🎂 {ag}
                </span>
              )}
            </div>
          )}

          {/* Social links for gym members */}
          {opp.profile && (opp.profile.instagram || opp.profile.youtube || opp.profile.tiktok) && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {opp.profile.instagram && (
                <a href={`https://instagram.com/${opp.profile.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', color: '#e1306c', fontSize: 12, textDecoration: 'none', border: '1px solid var(--border)' }}>
                  📷 @{opp.profile.instagram.replace('@','')}
                </a>
              )}
              {opp.profile.youtube && (
                <a href={opp.profile.youtube.startsWith('http') ? opp.profile.youtube : `https://youtube.com/@${opp.profile.youtube}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', color: '#ff0000', fontSize: 12, textDecoration: 'none', border: '1px solid var(--border)' }}>
                  ▶ YouTube
                </a>
              )}
              {opp.profile.tiktok && (
                <a href={`https://tiktok.com/@${opp.profile.tiktok.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', color: '#69c9d0', fontSize: 12, textDecoration: 'none', border: '1px solid var(--border)' }}>
                  🎵 @{opp.profile.tiktok.replace('@','')}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Win/Loss */}
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <div className="label" style={{ marginBottom: 12 }}>Record</div>
          <WinBar wins={opp.wins} draws={opp.draws} losses={opp.losses} />
          {opp.totalRounds > 0 && opp.wins + opp.losses + opp.draws > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
              {winRate}% win rate
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <StatBox label="Rolls" value={opp.totalRounds} />
          <StatBox label="Mat time" value={fmtMin(opp.totalSec)} />
          <StatBox label="My subs" value={opp.mySubCount} color="#66bb6a" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <StatBox label="Their subs" value={opp.theirSubCount} color="#ef5350" />
          <StatBox label="Sweeps" value={opp.mySweeps} />
          <StatBox label="Passes" value={opp.myPasses} />
        </div>

        {/* Top techniques */}
        {opp.topTechs.length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div className="label" style={{ marginBottom: 10 }}>My Top Submissions vs {opp.label.split(' ')[0]}</div>
            {opp.topTechs.map(([tech, count]) => (
              <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize: 13, color: '#ddd' }}>{tech}</span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-d)', color: '#66bb6a' }}>×{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Roll history */}
        <div className="card" style={{ padding: 16 }}>
          <div className="label" style={{ marginBottom: 10 }}>Roll History</div>
          {opp.rounds.map((r, i) => {
            const evs = (r.round_events || []).filter(e => e.direction === 'offensive');
            const date = r.started_at ? new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
            const dur = r.started_at && r.ended_at ? Math.round((new Date(r.ended_at) - new Date(r.started_at)) / 1000) : 0;
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#ccc' }}>{date}</span>
                    {r.result && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: r.result==='win'?'rgba(102,187,106,.15)':r.result==='loss'?'rgba(239,83,80,.15)':'rgba(255,183,77,.15)', color: r.result==='win'?'#66bb6a':r.result==='loss'?'#ef5350':'#ffb74d' }}>
                        {r.result.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {evs.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{evs.map(e => e.technique).join(' · ')}</div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-d)', flexShrink: 0, marginLeft: 8 }}>{fmt(dur)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── List view ───
  return (
    <div className="container fade-in" style={{ paddingTop: 32, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, fontWeight: 400, marginBottom: 6 }}>Training Partners</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
        {opponents.length} opponent{opponents.length !== 1 ? 's' : ''} tracked
      </p>

      {opponents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🥋</div>
          <div>No opponents tracked yet.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Log who you rolled with in Train to see stats here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opponents.map(opp => (
            <div key={opp.key} onClick={() => setSelected(opp.key)} className="card" style={{ padding: 16, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
              <MemberAvatar p={opp.profile} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#f0ece2' }}>{opp.label}</span>
                  {opp.belt && <BeltDot belt={opp.belt} size={10} />}
                  {opp.isGuest && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,.05)', padding: '2px 6px', borderRadius: 8 }}>guest</span>}
                </div>
                <WinBar wins={opp.wins} draws={opp.draws} losses={opp.losses} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: '#f0ece2' }}>{opp.totalRounds}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>rolls</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
