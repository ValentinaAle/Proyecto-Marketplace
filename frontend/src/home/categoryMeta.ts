type CategoryMeta = { icon: string; description: string };

const metadata: Record<string, CategoryMeta> = {
  'Técnicos': { icon: 'bi-tools', description: 'Plomería, electricidad, reparaciones y más.' },
  'Docentes': { icon: 'bi-mortarboard', description: 'Clases particulares y apoyo educativo.' },
  'Freelancers': { icon: 'bi-laptop', description: 'Diseño, programación y servicios digitales.' },
  'Salud': { icon: 'bi-heart-pulse', description: 'Profesionales de bienestar cerca tuyo.' },
  'Diseño': { icon: 'bi-brush', description: 'Diseño gráfico, branding e ilustración.' },
  'Fotografía': { icon: 'bi-camera', description: 'Sesiones, eventos y contenido visual.' },
};

export function getCategoryMeta(name: string): CategoryMeta {
  return metadata[name] ?? { icon: 'bi-grid', description: 'Servicios de esta categoría.' };
}
