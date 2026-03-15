-- =====================================================
-- Migración: Función RPC para obtener estudiantes del padre
-- Fecha: 2026-01-31
-- Actualizado: 2026-02-14 - Agregadas coordenadas de parada
-- Actualizado: 2026-03-15 - Agregado ruta_tipo, quitado parada_orden (no existe en tabla)
-- Descripción: Función que obtiene estudiantes con info de ruta sin RLS
-- =====================================================

-- Primero eliminar la política problemática
DROP POLICY IF EXISTS "Parents can view paradas via IN clause" ON public.paradas;

-- Eliminar función antigua si existe (DROP requerido para cambiar RETURNS)
DROP FUNCTION IF EXISTS get_mis_estudiantes_con_ruta();

-- Crear función actualizada con tipo de ruta
CREATE FUNCTION get_mis_estudiantes_con_ruta()
RETURNS TABLE (
  id uuid,
  nombre text,
  apellido text,
  id_parada uuid,
  parada_nombre text,
  parada_latitud double precision,
  parada_longitud double precision,
  parada_direccion text,
  ruta_id uuid,
  ruta_nombre text,
  ruta_tipo text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.nombre,
    e.apellido,
    e.id_parada,
    p.nombre as parada_nombre,
    p.latitud as parada_latitud,
    p.longitud as parada_longitud,
    p.direccion as parada_direccion,
    r.id as ruta_id,
    r.nombre as ruta_nombre,
    r.tipo::text as ruta_tipo
  FROM estudiantes e
  LEFT JOIN paradas p ON p.id = e.id_parada
  LEFT JOIN rutas r ON r.id = p.id_ruta
  WHERE e.id_padre = auth.uid()
  ORDER BY e.nombre ASC;
END;
$$;

COMMENT ON FUNCTION get_mis_estudiantes_con_ruta()
IS 'Obtiene estudiantes del padre autenticado con información completa de parada y ruta con tipo (ida/vuelta), evitando recursión RLS';
