import { useEffect, useState } from 'react';
import { authRequest } from '../../services/authService.js';
import App from '../../App.jsx';
import { setApiUser } from '../../services/apiClient.js';
import PasswordField from './PasswordField.jsx';
import { pendingPasswordRules } from '../../utils/password.js';

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  async function initialize() {
    setLoading(true); setError(''); setReady(false);
    try {
      setRegister(false);
      try { const current = (await authRequest('/me')).user; setApiUser(current); setUser(current); }
      catch (failure) { if (failure.status !== 401) throw failure; }
      setReady(true);
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  async function openRegistration() {
    setRegister(true); setError('');
    setSetupChecked(false);
    setSetupBusy(true);
    try {
      const setup = await authRequest('/setup');
      setRegistrationOpen(setup.registrationOpen); setSetupChecked(true);
    } catch { setError(''); }
    finally { setSetupBusy(false); }
  }
  useEffect(() => {
    initialize();
    const expired = () => { setApiUser(null); setUser(null); setRegister(false); setError(''); };
    window.addEventListener('kuber-session-expired', expired);
    return () => window.removeEventListener('kuber-session-expired', expired);
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    if (register && (!setupChecked || !registrationOpen)) { setError('Registration is unavailable. Please check registration status first.'); setBusy(false); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.email?.trim() || !values.password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError('Please enter a valid email address and password.'); setBusy(false); return;
    }
    if (register && (!values.name?.trim() || pendingPasswordRules(values.password).length)) {
      setError(!values.name?.trim() ? 'Enter your full name.' : pendingPasswordRules(values.password).join('. ') + '.'); setBusy(false); return;
    }
    try {
      const result = await authRequest(register ? '/register' : '/login', values);
      setLoginMessage(register ? 'Registration successful. Welcome!' : 'Login successful. Welcome back!');
      setApiUser(result.user); setUser(result.user); setRegistrationOpen(false); setRegister(false);
    } catch (failure) {
      setError(!register && failure.status === 401 ? 'Invalid email or password.' : failure.message);
      if (register && [403, 409].includes(failure.status)) {
        try { const setup = await authRequest('/setup'); setRegistrationOpen(setup.registrationOpen); setRegister(setup.registrationOpen); } catch {}
      }
    } finally { setBusy(false); }
  }
  async function logout() { await authRequest('/logout', {}); setApiUser(null); setUser(null); setError(''); setRegister(false); }
  if (loading) return <div className="auth-screen"><p role="status">Loading your workspace…</p></div>;
  if (user) return <App key={user.id} user={user} onLogout={logout} initialMessage={loginMessage} />;
  return <div className="auth-screen"><section className="auth-card">
    <div className="eyebrow">KUBER ERP</div>
    <div className="auth-options" aria-label="Account access">
      <button type="button" className={`button ${!register ? 'primary' : 'secondary'}`} aria-pressed={!register} disabled={busy || setupBusy} onClick={() => { setRegister(false); setError(''); }}>Login</button>
      <button type="button" className={`button ${register ? 'primary' : 'secondary'}`} aria-pressed={register} disabled={busy || setupBusy} onClick={openRegistration}>Super Admin Registration</button>
    </div>
    <h1>{register ? 'Create your Super Admin account' : 'Welcome back'}</h1>
    <p>{register ? 'Set up the first account, then add your team from Create user.' : 'Log in with your registered email and password.'}</p>
    {register && setupBusy ? <p role="status">Checking registration…</p> : register && setupChecked && !registrationOpen ? <div className="auth-error" role="status">A Super Admin is already registered. Registration is closed. Please log in, or ask your Admin to create your account.</div> : <form key={register ? 'register' : 'login'} onSubmit={submit} className="auth-form" noValidate>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {register && <label>Full name<input name="name" autoComplete="name" required maxLength={150} /></label>}
      <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
      <PasswordField isLogin={!register} />
      <button className="button primary" disabled={busy || (register && (!setupChecked || !registrationOpen))}>{busy ? 'Please wait…' : register ? 'Register Super Admin' : 'Log in'}</button>
    </form>}
    {!ready && <button className="button secondary" onClick={initialize}>Retry connection</button>}
    {register && !setupChecked && !setupBusy && <button className="button secondary" onClick={openRegistration}>Retry registration check</button>}
  </section></div>;
}
