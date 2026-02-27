import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import GymSetup from './pages/GymSetup';
import CheckInPage from './pages/CheckInPage';
import DashboardPage from './pages/DashboardPage';
import CoachPage from './pages/CoachPage';
import GymPage from './pages/GymPage';
import ProfilePage from './pages/ProfilePage';
import SessionsPage from './pages/SessionsPage';

const TABS = [
  { id: 'checkin', label: 'Train' },
  { id: 'sessions', label: 'Historique' },
  { id: 'dashboard', label: 'Stats' },
  { id: 'coach', label: 'Cours' },
  { id: 'gym', label: 'Gym' },
  { id: 'profile', label: 'Réglages' },
];

function AppContent() {
  const { user, gym, loading } = useAuth();
  const [tab, setTab] = useState('checkin');
  if (loading) return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
    </div>
  );
  if (!user) return <AuthPage />;
  if (!gym) return <GymSetup />;
  return (
    <div className="page">
      <div style={{ flex: 1, paddingBottom: 56 }}>
        {tab === 'checkin' && <CheckInPage />}
        {tab === 'sessions' && <SessionsPage />}
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'coach' && <CoachPage />}
        {tab === 'gym' && <GymPage />}
        {tab === 'profile' && <ProfilePage />}
      </div>
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
