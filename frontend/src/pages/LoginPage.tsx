import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { getRememberedEmail, goToHome, hasSession, saveSession, type AuthData } from '../auth/session';
import { AuthLayout } from '../components/AuthLayout';

export function LoginPage() {
  const rememberedEmail = getRememberedEmail();
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(Boolean(rememberedEmail));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => (
    new URLSearchParams(window.location.search).get('reason') === 'session-expired'
      ? 'Tu sesión venció. Ingresá nuevamente para continuar.'
      : null
  ));

  useEffect(() => {
    if (hasSession()) goToHome();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Completá tu email y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<AuthData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      saveSession(response.data, remember);
      goToHome();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos iniciar sesión. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Ingresá tus datos para continuar" className="auth-shell--login">
      <form className="login-form" onSubmit={submit} noValidate>
        <label>Email<input type="email" autoComplete="email" placeholder="ejemplo@email.com" aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? 'login-error' : undefined} value={email} onChange={(event) => { setEmail(event.target.value); setErrorMessage(null); }} /></label>
        <label>Contraseña<div className="auth-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? 'login-error' : undefined} value={password} onChange={(event) => { setPassword(event.target.value); setErrorMessage(null); }} /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}><i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" /></button></div></label>
        <div className="form-options">
          <label className="checkbox" htmlFor="remember-login"><input id="remember-login" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Recordarme</span></label>
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>
        {errorMessage && <p className="auth-inline-error" id="login-error" role="alert"><i className="bi bi-exclamation-circle-fill" aria-hidden="true" />{errorMessage}</p>}
        <button className="primary-button" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <p className="form-footer">¿No tenés cuenta? <Link to="/register">Registrate</Link></p>
    </AuthLayout>
  );
}
