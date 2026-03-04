import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import {
  isValidUsername,
  usernameToAuthEmail,
  usernameToLegacyAuthEmails,
} from '../utils/authIdentity';
import './AuthView.css';

export default function SignInView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidUsername(username)) {
      setError('Username must be 3-30 characters and use only letters, numbers, dot, dash, or underscore.');
      return;
    }
    setLoading(true);
    try {
      const primaryEmail = usernameToAuthEmail(username);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: primaryEmail,
        password,
      });

      if (signInError) {
        const fallbacks = usernameToLegacyAuthEmails(username).filter((email) => email !== primaryEmail);
        let signedIn = false;

        for (const fallbackEmail of fallbacks) {
          const { error: legacyError } = await supabase.auth.signInWithPassword({
            email: fallbackEmail,
            password,
          });
          if (!legacyError) {
            signedIn = true;
            break;
          }
        }

        if (!signedIn) {
          throw signInError;
        }
      }

      setPassword('');
      navigate(redirectTo, { replace: true });
    } catch (authError) {
      setError(authError.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-view">
      <h2>Sign in</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-switch">
        No account? <Link to="/signup" state={{ fromSignIn: true }}>Create one</Link>
      </p>
    </div>
  );
}
