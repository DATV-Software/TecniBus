import { supabase } from '../core/supabase';
import { FilaCSV } from '@/lib/utils/csvParser';

// Tipos
export type EntityType = 'padres' | 'conductores' | 'estudiantes' | 'buses';

export type ImportError = {
  row: number;
  error: string;
};

export type CredencialGenerada = {
  correo: string;
  password: string;
  nombre: string;
};

export type ImportResumen = {
  total: number;
  insertados: number;
  errores: number;
  detalles_errores: ImportError[];
  credenciales_generadas: CredencialGenerada[];
};

export type ImportResult = {
  success: boolean;
  resumen?: ImportResumen;
  error?: string;
};

/* ==========================================
   FUNCIÓN: IMPORTAR ENTIDADES MASIVAMENTE
   ========================================== */
export async function importarEntidades(
  file: { uri: string; name: string; type: string },
  entityType: EntityType
): Promise<ImportResult> {
  try {
    // Obtener session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'No hay sesión activa' };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    // Crear FormData con el archivo
    const formData = new FormData();

    // React Native: usar objeto con uri/name/type
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'text/csv',
    } as unknown as Blob);

    formData.append('entity_type', entityType);

    // Usar fetch directo porque FormData multipart no funciona con supabase.functions.invoke
    const response = await fetch(
      `${supabaseUrl}/functions/v1/import-entities`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Error en la importación',
      };
    }

    return {
      success: true,
      resumen: data.resumen,
    };

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado',
    };
  }
}

/**
 * Importa filas ya parseadas desde el cliente (texto CSV o JSON pegado).
 * Envía como archivo .json a la Edge Function import-entities.
 */
export async function importarTextoCSV(
  rows: FilaCSV[],
  entityType: EntityType,
): Promise<ImportResult> {
  try {
    const { data, error } = await supabase.functions.invoke('import-entities', {
      body: { rows, entity_type: entityType },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Error en la importación' };
    }

    return { success: true, resumen: data.resumen };

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado',
    };
  }
}
