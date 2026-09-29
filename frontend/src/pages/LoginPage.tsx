import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { goToLegacyHome, hasSession, saveSession, type AuthData } from '../auth/session';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: 'danger' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (hasSession()) goToLegacyHome();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setAlert({ tone: 'danger', message: 'Por favor completá todos los campos.' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const response = await apiRequest<AuthData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      saveSession(response.data, remember);
      setAlert({ tone: 'success', message: `¡Bienvenido/a, ${response.data.user.name || response.data.user.email}!` });
      window.setTimeout(goToLegacyHome, 700);
    } catch (error) {
      setAlert({ tone: 'danger', message: error instanceof Error ? error.message : 'No se pudo conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Ingresá tus datos para continuar">
      {alert && <Alert tone={alert.tone}>{alert.message}</Alert>}
      <form onSubmit={submit} noValidate>
        <label>Email<input type="email" autoComplete="email" placeholder="ejemplo@email.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className="form-options">
          <label className="checkbox"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Recordarme</span></label>
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>
        <button className="primary-button" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <p className="form-footer">¿No tenés cuenta? <Link to="/register">Registrate</Link></p>
    </AuthLayout>
  );
}
