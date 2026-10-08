import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';

type Step = 'email' | 'code' | 'password';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: 'danger' | 'success'; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setAlert(null);
    try {
      if (step === 'email') {
        if (!email.trim()) throw new Error('Ingresá tu email.');
        await apiRequest<unknown>('/password/forgot', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
        setStep('code');
        setAlert({ tone: 'success', message: 'Código enviado. Revisá tu bandeja de entrada.' });
      } else if (step === 'code') {
        if (code.trim().length < 6) throw new Error('Ingresá el código de 6 dígitos.');
        await apiRequest<unknown>('/password/verify', { method: 'POST', body: JSON.stringify({ email, code: code.trim() }) });
        setStep('password');
      } else {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
        await apiRequest<unknown>('/password/reset', { method: 'POST', body: JSON.stringify({ email, code, newPassword: password }) });
        setAlert({ tone: 'success', message: '¡Contraseña actualizada! Volviendo al login…' });
        window.setTimeout(() => window.location.assign('/login'), 1200);
      }
    } catch (error) {
      setAlert({ tone: 'danger', message: error instanceof Error ? error.message : 'No se pudo conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  }

  const copy = step === 'email'
    ? ['Recuperar contraseña', 'Ingresá tu email y te enviaremos un código de verificación.']
    : step === 'code'
      ? ['Verificá tu email', `Ingresá el código de 6 dígitos que enviamos a ${email}.`]
      : ['Nueva contraseña', 'Creá una contraseña segura para tu cuenta.'];

  return (
    <AuthLayout title={copy[0]} subtitle={copy[1]}>
      {alert && <Alert tone={alert.tone}>{alert.message}</Alert>}
      <form onSubmit={submit} noValidate>
        {step === 'email' && <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
        {step === 'code' && <label>Código<input className="code-input" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></label>}
        {step === 'password' && <><label>Nueva contraseña<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Repetir contraseña<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label></>}
        <button className="primary-button" disabled={loading}>{loading ? 'Procesando…' : step === 'email' ? 'Enviar código' : step === 'code' ? 'Verificar código' : 'Cambiar contraseña'}</button>
      </form>
      <p className="form-footer"><Link to="/login">Volver al login</Link></p>
    </AuthLayout>
  );
}
