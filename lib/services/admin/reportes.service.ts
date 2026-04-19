import { supabase } from '../core/supabase';

// Tipos
export type ReporteAsistenciaParams = {
  fecha_inicio: string;
  fecha_fin: string;
  id_ruta?: string;
  id_estudiante?: string;
  estado?: string;
};

export type EstadisticasReporte = {
  total: number;
  presentes: number;
  ausentes: number;
  pendientes: number;
  porcentaje: number;
};

export type ReporteAsistenciaResponse = {
  success: boolean;
  url?: string;
  estadisticas?: EstadisticasReporte;
  error?: string;
};

/* ==========================================
   FUNCIÓN: GENERAR REPORTE DE ASISTENCIA PDF
   ========================================== */
export async function generarReporteAsistencia(
  params: ReporteAsistenciaParams
): Promise<ReporteAsistenciaResponse> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'generate-attendance-report',
      {
        body: params,
      }
    );

    if (error) {
      return {
        success: false,
        error: `Error de servidor: ${error.message}`,
      };
    }

    if (!data || data.success !== true) {
      return {
        success: false,
        error: data?.error || 'No se pudo generar el reporte',
      };
    }

    return {
      success: true,
      url: data.url,
      estadisticas: data.estadisticas,
    };

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado',
    };
  }
}
