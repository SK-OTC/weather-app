import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { isValidUsername, normalizeUsername, usernameToAuthEmail } from '../utils/authIdentity';
import './AuthView.css';

export default function SignUpView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!isValidUsername(username)) {
      setError('Username must be 3-30 characters and use only letters, numbers, dot, dash, or underscore.');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: usernameToAuthEmail(username),
        password,
        options: {
          data: {
            username: normalizeUsername(username),
          },
        },
      });
      if (signUpError) throw signUpError;
      setMessage('Account created. You can sign in now.');
      setPassword('');
    } catch (authError) {
      setError(authError.message || 'Unable to create account. Please try a different username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-view">
      <h2>Create account</h2>
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
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-message">{message}</p>}
      <p className="auth-switch">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </div>
  );
}
