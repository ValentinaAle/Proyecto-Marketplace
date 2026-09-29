import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { goToLegacyHome, saveSession, type AuthData } from '../auth/session';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';

export function RegisterPage() {
  const [fields, setFields] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: 'danger' | 'success'; message: string } | null>(null);

  function update(field: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.values(fields).some((value) => !value.trim())) {
      setAlert({ tone: 'danger', message: 'Por favor completá todos los campos.' });
      return;
    }
    if (fields.password.length < 6) {
      setAlert({ tone: 'danger', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const response = await apiRequest<AuthData>('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
      saveSession(response.data);
      setAlert({ tone: 'success', message: '¡Cuenta creada! Redirigiendo…' });
      window.setTimeout(goToLegacyHome, 900);
    } catch (error) {
      setAlert({ tone: 'danger', message: error instanceof Error ? error.message : 'No se pudo conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Sumate a FIVOX y encontrá lo que necesitás">
      {alert && <Alert tone={alert.tone}>{alert.message}</Alert>}
      <form onSubmit={submit} noValidate>
        <label>Nombre<input autoComplete="name" value={fields.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label>Email<input type="email" autoComplete="email" value={fields.email} onChange={(event) => update('email', event.target.value)} /></label>
        <label>Teléfono<input type="tel" autoComplete="tel" value={fields.phone} onChange={(event) => update('phone', event.target.value)} /></label>
        <label>Contraseña<input type="password" autoComplete="new-password" value={fields.password} onChange={(event) => update('password', event.target.value)} /></label>
        <button className="primary-button" disabled={loading}>{loading ? 'Registrando…' : 'Registrarme'}</button>
      </form>
      <p className="form-footer">¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
    </AuthLayout>
  );
}
