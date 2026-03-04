import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import SearchView from './pages/SearchView';
import HistoryView from './pages/HistoryView';
import AboutView from './pages/AboutView';
import SignInView from './pages/SignInView';
import SignUpView from './pages/SignUpView';
import { supabase } from './api/supabaseClient';
import { syncWeatherResults } from './api/client';
import {
  getPendingWeatherResults,
  clearPendingWeatherResults,
} from './utils/localWeatherStorage';
import './App.css';

function GuardedSignUpRoute({ userId }) {
  const location = useLocation();
  const fromSignIn = Boolean(location.state?.fromSignIn);

  if (userId) return <Navigate to="/" replace />;
  if (!fromSignIn) return <Navigate to="/signin" replace />;
  return <SignUpView />;
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const pendingItems = getPendingWeatherResults();
    if (!pendingItems.length) {
      return;
    }

    let cancelled = false;
    const syncPending = async () => {
      try {
        const syncResult = await syncWeatherResults(userId, pendingItems);
        if (cancelled) return;

        if (syncResult.success) {
          clearPendingWeatherResults();
          const message = `Synced ${syncResult.created + syncResult.merged} result(s) to your account.`;
          sessionStorage.setItem('history.success', message);
        }
      } catch (error) {
        if (cancelled) return;
      }
    };

    syncPending();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const handleSignOut = async () => {
    sessionStorage.removeItem('history.success');
    await supabase.auth.signOut();
  };

  const userId = session?.user?.id;
  const signedInLabel = session?.user?.user_metadata?.username || session?.user?.email || 'user';

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Weather App</h1>
        <nav className="app-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Search</NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>History</NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
          {!userId && <NavLink to="/signin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Sign in</NavLink>}
        </nav>
        {userId ? (
          <details className="auth-dropdown">
            <summary className="auth-trigger">Hey {signedInLabel}!</summary>
            <div className="auth-menu">
              <button type="button" className="auth-menu-item" onClick={handleSignOut}>Sign out</button>
            </div>
          </details>
        ) : null}
      </header>
      <main className="app-main container">
        <Routes>
          <Route path="/" element={<SearchView userId={userId} />} />
          <Route path="/history" element={<HistoryView userId={userId} />} />
          <Route path="/about" element={<AboutView />} />
          <Route path="/signin" element={userId ? <Navigate to="/" replace /> : <SignInView />} />
          <Route path="/signup" element={<GuardedSignUpRoute userId={userId} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
