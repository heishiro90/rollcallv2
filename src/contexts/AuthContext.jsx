import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [gym, setGym] = useState(null);
  const [gymRole, setGymRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
  }

  async function loadGym(uid) {
    const { data } = await supabase
      .from('gym_members')
      .select('gym_id, role, gyms(*)')
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();
    if (data) { setGym(data.gyms); setGymRole(data.role); }
    else { setGym(null); setGymRole(null); }
  }

  async function refreshData() {
    if (user) { await loadProfile(user.id); await loadGym(user.id); }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      if (u) Promise.all([loadProfile(u.id), loadGym(u.id)]).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) Promise.all([loadProfile(u.id), loadGym(u.id)]).finally(() => setLoading(false));
      else { setProfile(null); setGym(null); setGymRole(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setGym(null); setGymRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, gym, gymRole, loading, signOut, refreshData }}>
      {children}
    </AuthContext.Provider>
  );
}
