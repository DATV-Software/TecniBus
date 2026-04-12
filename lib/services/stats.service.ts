import { supabase } from './supabase';

export type DashboardStats = {
  totalStudents: number;
  totalDrivers: number;
  totalParents: number;
  totalRoutes: number;
  activeBuses: number;
  totalBuses: number;
};

/**
 * Obtiene las estadísticas del dashboard para administradores
 * Hace queries en paralelo para mejor performance
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Ejecutar todas las queries en paralelo
    const [
      studentsResult,
      driversResult,
      parentsResult,
      routesResult,
      activeBusesResult,
      totalBusesResult,
    ] = await Promise.all([
      // Total de estudiantes
      supabase
        .from('estudiantes')
        .select('id', { count: 'exact', head: true }),

      // Total de choferes
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('rol', 'chofer'),

      // Total de padres
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('rol', 'padre'),

      // Total de rutas
      supabase
        .from('rutas')
        .select('id', { count: 'exact', head: true }),

      // Busetas activas en recorrido (estados_recorrido con activo=true)
      supabase
        .from('estados_recorrido')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true),

      // Total de busetas
      supabase
        .from('busetas')
        .select('id', { count: 'exact', head: true }),
    ]);

    // Construir objeto de estadísticas
    const stats: DashboardStats = {
      totalStudents: studentsResult.count || 0,
      totalDrivers: driversResult.count || 0,
      totalParents: parentsResult.count || 0,
      totalRoutes: routesResult.count || 0,
      activeBuses: activeBusesResult.count || 0,
      totalBuses: totalBusesResult.count || 0,
    };

    return stats;
  } catch (_error) {

    // Retornar estadísticas en 0 en caso de error
    return {
      totalStudents: 0,
      totalDrivers: 0,
      totalParents: 0,
      totalRoutes: 0,
      activeBuses: 0,
      totalBuses: 0,
    };
  }
}

/**
 * Obtiene estadísticas adicionales para gráficos o reportes
 */
export async function getDetailedStats() {
  try {
    // Estudiantes por ruta
    const { data: studentsByRoute } = await supabase
      .from('estudiantes')
      .select('id_ruta, rutas(nombre)')
      .not('id_ruta', 'is', null);

    // Choferes con buseta asignada vs sin asignar
    const { count: driversWithBusCount } = await supabase
      .from('choferes')
      .select('id', { count: 'exact' })
      .not('id_buseta', 'is', null);

    const { count: driversWithoutBusCount } = await supabase
      .from('choferes')
      .select('id', { count: 'exact' })
      .is('id_buseta', null);

    return {
      studentsByRoute: studentsByRoute || [],
      driversWithBus: driversWithBusCount || 0,
      driversWithoutBus: driversWithoutBusCount || 0,
    };
  } catch (_error) {
    return {
      studentsByRoute: [],
      driversWithBus: 0,
      driversWithoutBus: 0,
    };
  }
}
