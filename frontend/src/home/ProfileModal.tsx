import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { authorizedRequest, uploadImage } from '../api/client';
import { Alert } from '../components/Alert';
import type { AuthData } from '../auth/session';
import { ModalShell } from './ModalShell';
import type { Profile } from './types';

type Props = { token: string; onClose: () => void; onSaved: (session: AuthData) => Promise<void> };

export function ProfileModal({ token, onClose, onSaved }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState<{ tone: 'danger' | 'success'; message: string } | null>(null);

  useEffect(() => { authorizedRequest<Profile>('/auth/me', token).then((response) => setProfile(response.data)).catch((error: Error) => setAlert({ tone: 'danger', message: error.message })).finally(() => setLoading(false)); }, [token]);

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profile) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setAlert({ tone: 'danger', message: 'Usá una imagen JPG, PNG o WEBP.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setAlert({ tone: 'danger', message: 'La imagen no puede superar los 5 MB.' }); return; }
    setUploading(true); setAlert(null);
    try {
      const response = await uploadImage<{ url: string }>('/auth/avatar', token, 'avatar', file);
      setProfile({ ...profile, avatar_url: response.data.url });
      setAlert({ tone: 'success', message: 'Foto subida. Guardá los cambios para confirmarla.' });
    } catch (reason) { setAlert({ tone: 'danger', message: reason instanceof Error ? reason.message : 'No se pudo subir la foto.' }); } finally { setUploading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.name?.trim() || !profile.email.trim()) { setAlert({ tone: 'danger', message: 'Nombre y email son obligatorios.' }); return; }
    if ((passwords.oldPassword || passwords.newPassword) && (!passwords.oldPassword || passwords.newPassword.length < 6)) { setAlert({ tone: 'danger', message: 'Para cambiar la contraseña completá la actual y una nueva de al menos 6 caracteres.' }); return; }
    setSaving(true); setAlert(null);
    try {
      const profileResponse = await authorizedRequest<AuthData>('/auth/profile', token, { method: 'PUT', body: JSON.stringify({ name: profile.name.trim(), email: profile.email.trim(), phone: profile.phone?.trim(), avatar_url: profile.avatar_url?.trim() }) });
      if (passwords.oldPassword && passwords.newPassword) await authorizedRequest<unknown>('/auth/password', profileResponse.data.token, { method: 'PUT', body: JSON.stringify(passwords) });
      await onSaved(profileResponse.data);
      setPasswords({ oldPassword: '', newPassword: '' });
      setAlert({ tone: 'success', message: 'Perfil actualizado correctamente.' });
    } catch (reason) { setAlert({ tone: 'danger', message: reason instanceof Error ? reason.message : 'No se pudo actualizar el perfil.' }); } finally { setSaving(false); }
  }

  return <ModalShell title="Mi perfil" subtitle="Actualizá tus datos personales y de contacto." onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cerrar</button><button className="primary-button modal-primary" type="submit" form="profile-form" disabled={saving || loading}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></>}>
    {alert && <Alert tone={alert.tone}>{alert.message}</Alert>}
    {loading || !profile ? <div className="modal-loading">Cargando perfil…</div> : <form id="profile-form" className="stacked-form" onSubmit={submit}>
      <div className="profile-preview">{profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" /> : <span>{(profile.name || profile.email).slice(0, 1).toUpperCase()}</span>}<div><strong>{profile.name || 'Tu perfil'}</strong><small>{profile.email}</small></div><label className="file-button"><i className="bi bi-camera-fill" />{uploading ? 'Subiendo…' : 'Cambiar foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={selectAvatar} /></label></div>
      <div className="form-grid"><label>Nombre<input value={profile.name || ''} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Email<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><label>Teléfono<input type="tel" value={profile.phone || ''} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label></div>
      <div className="password-section"><h3>Cambiar contraseña</h3><p>Dejá estos campos vacíos si no querés modificarla.</p><div className="form-grid"><label>Contraseña actual<input type="password" autoComplete="current-password" value={passwords.oldPassword} onChange={(event) => setPasswords({ ...passwords, oldPassword: event.target.value })} /></label><label>Nueva contraseña<input type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label></div></div>
    </form>}
  </ModalShell>;
}
