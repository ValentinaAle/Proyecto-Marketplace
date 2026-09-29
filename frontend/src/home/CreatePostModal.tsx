import { useState, type FormEvent } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ModalShell } from './ModalShell';
import type { Category } from './types';

type Props = { token: string; categories: Category[]; onClose: () => void; onCreated: () => Promise<void> };

export function CreatePostModal({ token, categories, onClose, onCreated }: Props) {
  const [fields, setFields] = useState({ title: '', description: '', image_url: '', id_category: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(name: keyof typeof fields, value: string) { setFields((current) => ({ ...current, [name]: value })); }
  function validate() {
    if (!fields.title.trim() || !fields.description.trim() || !fields.id_category) return 'Título, descripción y categoría son obligatorios.';
    if (fields.title.trim().length < 25) return 'El título debe tener al menos 25 caracteres.';
    if (fields.description.trim().length < 90) return 'La descripción debe tener al menos 90 caracteres.';
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true); setError(null);
    try {
      await authorizedRequest<unknown>('/posts', token, { method: 'POST', body: JSON.stringify({ ...fields, id_category: Number(fields.id_category), title: fields.title.trim(), description: fields.description.trim(), image_url: fields.image_url.trim() }) });
      await onCreated();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la publicación.');
    } finally { setLoading(false); }
  }

  return <ModalShell title="Nueva publicación" subtitle="Tu servicio quedará pendiente de aprobación." onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button modal-primary" type="submit" form="create-post-form" disabled={loading}>{loading ? 'Publicando…' : 'Publicar'}</button></>}>
    {error && <Alert tone="danger">{error}</Alert>}
    <form id="create-post-form" className="stacked-form" onSubmit={submit}>
      <label>Título <span className="field-count">{fields.title.length}/45</span><input maxLength={45} value={fields.title} onChange={(event) => update('title', event.target.value)} placeholder="Ej: Instalación eléctrica domiciliaria" /></label>
      <label>Descripción <span className="field-count">{fields.description.length}/300</span><textarea maxLength={300} rows={5} value={fields.description} onChange={(event) => update('description', event.target.value)} placeholder="Contá qué incluye el servicio, tu experiencia y disponibilidad." /></label>
      <label>Categoría<select value={fields.id_category} onChange={(event) => update('id_category', event.target.value)}><option value="">Seleccioná una categoría</option>{categories.map((category) => <option key={category.id_category} value={category.id_category}>{category.name}</option>)}</select></label>
      <label>URL de imagen <span className="optional-label">Opcional</span><input type="url" value={fields.image_url} onChange={(event) => update('image_url', event.target.value)} placeholder="https://…" /></label>
    </form>
  </ModalShell>;
}
