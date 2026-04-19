import { supabase } from '../core/supabase';

export type RutaActiva = {
  id_asignacion: string;
  hora_inicio_recorrido: string | null;
  id_ruta: string;
  nombre_ruta: string;
  tipo_ruta: string;
  id_chofer: string;
  nombre_chofer: string;
  apellido_chofer: string;
  hora_inicio_asignacion: string;
  hora_fin_asignacion: string;
  total_estudiantes?: number;
};

export type RutaActivaDetalle = RutaActiva & {
  polyline_coordinates: { latitude: number; longitude: number }[] | null;
};

export async function getRutasActivas(): Promise<RutaActiva[]> {
  const { data: estados, error } = await supabase
    .from('estados_recorrido')
    .select('id_asignacion, hora_inicio')
    .eq('activo', true);

  if (error || !estados?.length) return [];

  const ids = estados.map((e) => e.id_asignacion);

  const { data: asignaciones } = await supabase
    .from('asignaciones_ruta')
    .select('id, id_chofer, id_ruta, hora_inicio, hora_fin')
    .in('id', ids);

  if (!asignaciones?.length) return [];

  const rutaIds = [...new Set(asignaciones.map((a) => a.id_ruta))];
  const choferIds = [...new Set(asignaciones.map((a) => a.id_chofer))];

  const [{ data: rutas }, { data: choferes }] = await Promise.all([
    supabase.from('rutas').select('id, nombre, tipo').in('id', rutaIds),
    supabase.from('profiles').select('id, nombre, apellido').in('id', choferIds),
  ]);

  return estados
    .map((estado) => {
      const asig = asignaciones.find((a) => a.id === estado.id_asignacion);
      const ruta = rutas?.find((r) => r.id === asig?.id_ruta);
      const chofer = choferes?.find((c) => c.id === asig?.id_chofer);

      return {
        id_asignacion: estado.id_asignacion,
        hora_inicio_recorrido: estado.hora_inicio,
        id_ruta: asig?.id_ruta || '',
        nombre_ruta: ruta?.nombre || 'Ruta sin nombre',
        tipo_ruta: ruta?.tipo || 'ida',
        id_chofer: asig?.id_chofer || '',
        nombre_chofer: chofer?.nombre || '',
        apellido_chofer: chofer?.apellido || '',
        hora_inicio_asignacion: asig?.hora_inicio || '',
        hora_fin_asignacion: asig?.hora_fin || '',
      };
    })
    .filter((r) => r.id_ruta);
}

export async function getRutaActivaDetalle(
  idAsignacion: string
): Promise<RutaActivaDetalle | null> {
  const [rutaActivaArr, { data: asigData }] = await Promise.all([
    getRutasActivas(),
    supabase
      .from('asignaciones_ruta')
      .select('id, polyline_coordinates')
      .eq('id', idAsignacion)
      .single(),
  ]);

  const rutaActiva = rutaActivaArr.find((r) => r.id_asignacion === idAsignacion);
  if (!rutaActiva) return null;

  return {
    ...rutaActiva,
    polyline_coordinates: asigData?.polyline_coordinates || null,
  };
}

/**
 * Suscribirse a cambios en estados_recorrido para detectar rutas que
 * se activan o finalizan en tiempo real
 */
export function suscribirseARutasActivas(onChange: () => void): () => void {
  const channel = supabase
    .channel('liveview-estados')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'estados_recorrido' },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
