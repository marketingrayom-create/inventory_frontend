import { useId, useState } from 'react';
import { pendingPasswordRules } from '../../utils/password.js';

export default function PasswordField({ isLogin = false }) {
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const hintId = useId();
  const pending = pendingPasswordRules(password);
  return <div className="password-field">
    <label>Password<input name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} required
      minLength={isLogin ? undefined : 8} maxLength={isLogin ? 128 : 12} value={password} aria-describedby={touched ? hintId : undefined}
      onFocus={() => setTouched(true)} onChange={event => { setPassword(event.target.value); setTouched(true); }} /></label>
    {touched && <div id={hintId} aria-live="polite" className="password-feedback">
      {pending.length ? <ul>{pending.map(rule => <li key={rule}>{rule}</li>)}</ul>
        : <span className="password-strong">✓ Password is strong</span>}
    </div>}
  </div>;
}
