import { useState, type ChangeEvent, type FormEvent } from 'react';
import { authorizedRequest, uploadImage } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ModalShell } from './ModalShell';
import type { Category } from './types';

type Props = { token: string; categories: Category[]; onClose: () => void; onCreated: () => Promise<void> };

export function CreatePostModal({ token, categories, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fields, setFields] = useState({ title: '', description: '', image_url: '', id_category: '', proposed_category: '' });
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const hasUnsavedChanges = !completed && (Object.values(fields).some((value) => value.trim() !== '') || uploading);

  function requestClose() {
    if (completed) { onClose(); return; }
    if (hasUnsavedChanges) { setShowCloseConfirmation(true); return; }
    onClose();
  }

  function update(name: keyof typeof fields, value: string) { setFields((current) => ({ ...current, [name]: value })); }
  function validate() {
    if (!fields.title.trim() || !fields.description.trim() || (!fields.id_category || (fields.id_category === 'new' && !fields.proposed_category.trim()))) return 'Título, descripción y categoría son obligatorios.';
    if (fields.title.trim().length < 25) return 'El título debe tener al menos 25 caracteres.';
    if (fields.description.trim().length < 90) return 'La descripción debe tener al menos 90 caracteres.';
    return null;
  }

  function continueToImage() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setStep(2);
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Usá una imagen JPG, PNG o WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return; }
    setUploading(true); setError(null);
    try {
      const response = await uploadImage<{ url: string }>('/posts/image', token, 'image', file);
      update('image_url', response.data.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo subir la imagen.'); } finally { setUploading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true); setError(null);
    try {
      await authorizedRequest<unknown>('/posts', token, { method: 'POST', body: JSON.stringify({ ...fields, id_category: fields.id_category === 'new' ? null : Number(fields.id_category), proposed_category: fields.id_category === 'new' ? fields.proposed_category.trim() : null, title: fields.title.trim(), description: fields.description.trim(), image_url: fields.image_url.trim() }) });
      setCompleted(true);
      void onCreated().catch(() => undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la publicación.');
    } finally { setLoading(false); }
  }

  return <><ModalShell title={completed ? "Publicación creada" : "Nueva publicación"} subtitle={completed ? "Tu servicio fue enviado correctamente." : "Tu servicio quedará pendiente de aprobación."} onClose={requestClose} showCloseButton={false} className="form-modal--gray-header" footer={completed ? <button className="primary-button modal-primary" type="button" onClick={onClose}>Volver al inicio</button> : step === 1 ? <><button className="secondary-button" type="button" onClick={requestClose}>Cancelar</button><button className="primary-button modal-primary" type="button" onClick={continueToImage}>Continuar</button></> : <><button className="secondary-button" type="button" onClick={() => setStep(1)}>Volver</button><button className="primary-button modal-primary" type="submit" form="create-post-form" disabled={loading || uploading}>{loading ? 'Publicando…' : 'Publicar'}</button></>}>
    {completed ? <div className="create-post-success" role="status"><span><i className="bi bi-check-lg" aria-hidden="true" /></span><h3>La publicación quedó pendiente de aprobación</h3><p>Un administrador revisará el contenido y, si corresponde, la publicación se aprobará y se mostrará en el inicio. Podés consultar su estado desde Mis Servicios.</p></div> : <><div className="form-progress" aria-label={`Paso ${step} de 2`}><span>Paso {step} de 2</span><div><i className="is-complete" /><i className={step === 2 ? 'is-complete' : ''} /></div><strong>{step === 1 ? 'Información del servicio' : 'Imagen y revisión'}</strong></div>
    {error && <Alert tone="danger">{error}</Alert>}
    <form id="create-post-form" className="stacked-form" onSubmit={submit}>
      {step === 1 ? <>
        <label>Título <span className="field-count">{fields.title.length}/45</span><small className="field-hint">Mínimo 25 caracteres.</small><input maxLength={45} value={fields.title} onChange={(event) => update('title', event.target.value)} placeholder="Ej: Instalación eléctrica domiciliaria" /></label>
        <label>Descripción <span className="field-count">{fields.description.length}/300</span><small className="field-hint">Mínimo 90 caracteres.</small><textarea maxLength={300} rows={5} value={fields.description} onChange={(event) => update('description', event.target.value)} placeholder="Contá qué incluye el servicio, tu experiencia y disponibilidad." /></label>
        <label>Categoría<select value={fields.id_category} onChange={(event) => { update('id_category', event.target.value); if (event.target.value !== 'new') update('proposed_category', ''); }}><option value="">Seleccioná una categoría</option>{categories.map((category) => <option key={category.id_category} value={category.id_category}>{category.name}</option>)}<option value="new">Proponer una categoría nueva…</option></select></label>
        {fields.id_category === 'new' && <label className="proposed-category-field">Nombre de la categoría propuesta <span className="field-count">{fields.proposed_category.length}/45</span><input maxLength={45} value={fields.proposed_category} onChange={(event) => update('proposed_category', event.target.value)} placeholder="Ej: Cuidado de mascotas" /><small>Un administrador podrá aprobarla, mejorar el nombre o asignar una categoría existente.</small></label>}
      </> : <>
        <div className="post-review-summary"><span>Revisá antes de publicar</span><strong>{fields.title}</strong><p>{fields.description}</p></div>
        <label>Imagen <span className="optional-label">Opcional · máximo 5 MB</span><span className="image-upload-field"><span className="image-preview">{fields.image_url ? <img src={fields.image_url} alt="Vista previa de la publicación" /> : <i className="bi bi-image" />}</span><span className="image-upload-copy"><strong>{uploading ? 'Subiendo imagen…' : fields.image_url ? 'Imagen lista' : 'Elegí una imagen desde tu computadora'}</strong><small>JPG, PNG o WEBP</small><span className="file-button"><i className="bi bi-upload" />{fields.image_url ? 'Cambiar imagen' : 'Seleccionar imagen'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={selectImage} /></span></span></span></label>
      </>}
    </form></>}
  </ModalShell>
    {showCloseConfirmation && <ConfirmationDialog title="¿Descartar la publicación?" message="El texto, la categoría y las imágenes que cargaste se perderán." confirmLabel="Descartar cambios" tone="danger" onCancel={() => setShowCloseConfirmation(false)} onConfirm={onClose} />}
  </>;
}
