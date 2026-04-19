/**
 * Extracts all async handler functions from the driver screen.
 * Keeps the main component lean by centralising side-effect logic here.
 */
import { useCallback } from 'react';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { useAlert } from '@/components/ui/AlertBox/useAlert';
import {
  confirmarAsistenciaVuelta,
  marcarAusente,
} from '@/lib/services/students/asistencias.service';
import { getUbicacionColegio } from '@/lib/services/admin/configuracion.service';
import {
  inicializarEstadosGeocercas,
  marcarEstudianteCompletado,
} from '@/lib/services/routing/geocercas.service';
import { calcularDistancia } from '@/lib/utils/distance';
import {
  finalizarRecorrido,
  guardarPolylineRuta,
  iniciarRecorrido,
} from '@/lib/services/routing/recorridos.service';
import { calcularRutaOptimizada, type Parada } from '@/lib/services/routing/rutas.service';
import { haptic } from '@/lib/utils/haptics';
import type { RecorridoChofer } from '@/lib/services/fleet/asignaciones.service';
import type { EstadoRecorridoRun } from '@/features/driver/hooks/useDriverRecorrido';
import type { EstudianteConAsistencia } from '@/lib/services/students/asistencias.service';
import type { EstudianteGeocerca } from '@/lib/services/routing/geocercas.service';
import type { UbicacionLocal } from '@/features/driver/hooks/useGPSTracking';

type Options = {
  profileId: string | undefined;
  recorridoActual: RecorridoChofer | null;
  nextStudent: EstudianteConAsistencia | null;
  estudianteGeocerca: EstudianteGeocerca | null;
  estudiantes: EstudianteConAsistencia[];
  paradas: Parada[];
  paradasVisibles: Parada[];
  ubicacionChofer: UbicacionLocal | null;
  ubicacionColegio: { latitud: number; longitud: number; nombre: string } | null;
  tipoRuta: 'ida' | 'vuelta';
  recorridos: RecorridoChofer[];
  estadosRecorridos: Record<string, EstadoRecorridoRun>;
  // Setters
  setProcessingStudent: (id: string | null) => void;
  setRouteActive: (v: boolean) => void;
  setEstadosRecorridos: (fn: (prev: Record<string, EstadoRecorridoRun>) => Record<string, EstadoRecorridoRun>) => void;
  setParadas: (p: Parada[]) => void;
  setPolylineCoordinates: (c: { latitude: number; longitude: number }[]) => void;
  setOptimizandoRuta: (v: boolean) => void;
  setShowRecorridoSelector: (v: boolean) => void;
  setShowReturnAttendance: (v: boolean) => void;
  setHoraLlegadaColegio: (h: string | null) => void;
  setRutaCompletada: (v: boolean) => void;
  // Side effects
  cargarEstudiantes: () => Promise<void>;
  marcarCompletadoManual: () => Promise<void>;
};

export function useDriverActions({
  profileId,
  recorridoActual,
  nextStudent,
  estudianteGeocerca,
  estudiantes,
  paradas,
  paradasVisibles,
  ubicacionChofer,
  ubicacionColegio,
  tipoRuta,
  recorridos,
  estadosRecorridos,
  setProcessingStudent,
  setRouteActive,
  setEstadosRecorridos,
  setParadas,
  setPolylineCoordinates,
  setOptimizandoRuta,
  setShowRecorridoSelector,
  setShowReturnAttendance,
  setHoraLlegadaColegio,
  setRutaCompletada,
  cargarEstudiantes,
  marcarCompletadoManual,
}: Options) {
  const { showAlert } = useAlert();

  // ── Open route selector if there are unfinished routes ─────────────────────
  const abrirSelectorSiHayPendientes = useCallback(
    (recorridoCompletadoId: string) => {
      const pendientes = recorridos.filter(
        (r) => r.id !== recorridoCompletadoId && estadosRecorridos[r.id] !== 'completado',
      );
      if (pendientes.length > 0) {
        setTimeout(() => setShowRecorridoSelector(true), 1500);
      }
    },
    [recorridos, estadosRecorridos, setShowRecorridoSelector],
  );

  // ── Mark next student absent (from bottom card "en camino") ────────────────
  const handleMarcarAusente = useCallback(async () => {
    if (!profileId || !recorridoActual || !nextStudent) return;
    try {
      setProcessingStudent(nextStudent.id);
      haptic.medium();
      const result = await marcarAusente(
        nextStudent.id,
        recorridoActual.id_ruta,
        profileId,
      );
      if (result) {
        await cargarEstudiantes();
        haptic.success();
      } else {
        haptic.error();
        showAlert({ title: 'Error', message: 'No se pudo marcar como ausente', type: 'error' });
      }
    } catch {
      haptic.error();
      showAlert({ title: 'Error', message: 'Ocurrio un error', type: 'error' });
    } finally {
      setProcessingStudent(null);
    }
  }, [profileId, recorridoActual, nextStudent, setProcessingStudent, cargarEstudiantes, showAlert]);

  // ── Mark geocerca student absent (from geocerca card) ──────────────────────
  const handleMarcarAusenteGeocerca = useCallback(async () => {
    if (!profileId || !recorridoActual || !estudianteGeocerca) return;
    try {
      setProcessingStudent(estudianteGeocerca.id_estudiante);
      haptic.medium();
      const result = await marcarAusente(
        estudianteGeocerca.id_estudiante,
        recorridoActual.id_ruta,
        profileId,
      );
      if (result) {
        await marcarEstudianteCompletado(
          recorridoActual.id,
          estudianteGeocerca.id_estudiante,
          profileId,
          'ausente',
        );
        await marcarCompletadoManual();
        await cargarEstudiantes();
        haptic.success();
      } else {
        haptic.error();
        showAlert({ title: 'Error', message: 'No se pudo marcar como ausente', type: 'error' });
      }
    } catch {
      haptic.error();
      showAlert({ title: 'Error', message: 'Ocurrio un error', type: 'error' });
    } finally {
      setProcessingStudent(null);
    }
  }, [
    profileId, recorridoActual, estudianteGeocerca,
    setProcessingStudent, marcarCompletadoManual, cargarEstudiantes, showAlert,
  ]);

  // ── Open Google Maps to next student stop ──────────────────────────────────
  const handleNavigate = useCallback(() => {
    if (!nextStudent?.parada) return;
    const paradaData = paradas.find((p) => p.id === nextStudent.parada?.id);
    if (!paradaData) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${paradaData.latitud},${paradaData.longitud}&travelmode=driving`;
    Linking.openURL(url);
  }, [nextStudent, paradas]);

  // ── Core start logic — shared between IDA and VUELTA ───────────────────────
  // paradasOverride: pre-filtered stops (VUELTA absent), avoids stale closure on paradasVisibles
  const doIniciarRecorrido = useCallback(async (paradasOverride?: Parada[]) => {
    if (!recorridoActual) return;
    setOptimizandoRuta(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setOptimizandoRuta(false);
        showAlert({
          title: 'Permisos necesarios',
          message: 'Necesitas habilitar permisos de ubicación para iniciar el recorrido',
          type: 'warning',
        });
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const ubicacionChoferLocal = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      const ubicacionColegioLocal = await getUbicacionColegio();
      const paradasParaRuta = paradasOverride ?? paradasVisibles;
      if (paradasParaRuta.length > 0) {
        try {
          const resultado = await calcularRutaOptimizada(
            ubicacionChoferLocal,
            paradasParaRuta,
            recorridoActual.tipo_ruta,
            {
              lat: ubicacionColegioLocal.latitud,
              lng: ubicacionColegioLocal.longitud,
            },
          );
          if (resultado) {
            setParadas(resultado.paradasOptimizadas);
            setPolylineCoordinates(resultado.polylineCoordinates);
            await guardarPolylineRuta(recorridoActual.id, resultado.polylineCoordinates);
          }
        } catch (_error) {
        } finally {
          setOptimizandoRuta(false);
        }
      }
      const success = await iniciarRecorrido(recorridoActual.id);
      if (success) {
        setRouteActive(true);
        setEstadosRecorridos((prev) => ({ ...prev, [recorridoActual.id]: 'activo' }));
        haptic.success();
        inicializarEstadosGeocercas(recorridoActual.id, profileId || '').catch(() => {});
      } else {
        haptic.error();
        showAlert({ title: 'Error', message: 'No se pudo iniciar el recorrido', type: 'error' });
      }
    } catch {
      haptic.error();
      showAlert({ title: 'Error', message: 'Ocurrió un error al iniciar el recorrido', type: 'error' });
    }
  }, [
    recorridoActual, profileId, paradasVisibles,
    setOptimizandoRuta, setParadas, setPolylineCoordinates,
    setRouteActive, setEstadosRecorridos, showAlert,
  ]);

  // ── Start route (validates school proximity for VUELTA) ───────────────────
  const handleIniciarRecorrido = useCallback(() => {
    if (!recorridoActual) return;
    haptic.heavy();
    if (tipoRuta === 'vuelta') {
      if (!ubicacionChofer || !ubicacionColegio) {
        showAlert({
          title: 'Ubicación no disponible',
          message: 'No se puede determinar tu ubicación. Activa el GPS e intenta de nuevo.',
          type: 'error',
          buttons: [{ text: 'OK' }],
        });
        return;
      }
      const distColegio = calcularDistancia(
        ubicacionChofer.latitude,
        ubicacionChofer.longitude,
        ubicacionColegio.latitud,
        ubicacionColegio.longitud,
      );
      if (distColegio > 200) {
        showAlert({
          title: 'Debes estar en el colegio',
          message: `La ruta de vuelta debe iniciarse desde el colegio. Estás a ${Math.round(distColegio)} m del colegio.`,
          type: 'warning',
          buttons: [{ text: 'Entendido' }],
        });
        return;
      }
      setShowReturnAttendance(true);
    } else {
      void doIniciarRecorrido();
    }
  }, [
    recorridoActual, tipoRuta, ubicacionChofer, ubicacionColegio,
    setShowReturnAttendance, doIniciarRecorrido, showAlert,
  ]);

  // ── Confirm VUELTA attendance and start route ─────────────────────────────
  const handleConfirmarVuelta = useCallback(async (ausentesIds: string[]) => {
    if (!recorridoActual || !profileId) return;

    // Pre-compute filtered stops BEFORE saving attendance to avoid stale closure
    const ausentesSet = new Set(ausentesIds);
    const paradaConteo = new Map<string, { total: number; ausentes: number }>();
    for (const est of estudiantes) {
      if (!est.parada?.id) continue;
      const c = paradaConteo.get(est.parada.id) ?? { total: 0, ausentes: 0 };
      c.total++;
      if (ausentesSet.has(est.id)) c.ausentes++;
      paradaConteo.set(est.parada.id, c);
    }
    const paradasFiltradas = paradas.filter((p) => {
      const c = paradaConteo.get(p.id);
      if (!c) return false;
      return c.ausentes < c.total;
    });

    if (ausentesIds.length > 0 || estudiantes.length > 0) {
      const ok = await confirmarAsistenciaVuelta(recorridoActual.id_ruta, profileId, ausentesIds, estudiantes);
      if (!ok) throw new Error('No se pudo confirmar la asistencia. Intenta nuevamente.');
      await cargarEstudiantes();
    }
    // Close modal only after successful confirmation
    setShowReturnAttendance(false);
    await doIniciarRecorrido(paradasFiltradas.length > 0 ? paradasFiltradas : undefined);
  }, [
    recorridoActual, profileId, estudiantes, paradas,
    setShowReturnAttendance, cargarEstudiantes, doIniciarRecorrido,
  ]);

  // ── End route ─────────────────────────────────────────────────────────────
  const handleFinalizarRecorrido = useCallback(async () => {
    if (!recorridoActual) return;
    showAlert({
      title: 'Finalizar Recorrido',
      message: '¿Estás seguro de que deseas finalizar el recorrido?',
      type: 'warning',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            haptic.heavy();
            const success = await finalizarRecorrido(recorridoActual.id);
            if (success) {
              setRouteActive(false);
              setEstadosRecorridos((prev) => ({ ...prev, [recorridoActual.id]: 'completado' }));
              haptic.success();
              abrirSelectorSiHayPendientes(recorridoActual.id);
            } else {
              haptic.error();
              showAlert({ title: 'Error', message: 'No se pudo finalizar el recorrido', type: 'error' });
            }
          },
        },
      ],
    });
  }, [recorridoActual, setRouteActive, setEstadosRecorridos, abrirSelectorSiHayPendientes, showAlert]);

  // ── Auto-finalize on school arrival (IDA only) ────────────────────────────
  // Called from an effect in the main screen when enCaminoAlColegio + distance < 50m
  const handleAutoFinalizarEnColegio = useCallback(async () => {
    if (!recorridoActual) return;
    const horaLlegada = new Date().toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Guayaquil',
    });
    const { sendPushToParents } = await import('@/lib/services/core/notifications.service');
    sendPushToParents(
      recorridoActual.id,
      '🏫 Llegaron al colegio',
      `Tus hijos llegaron al colegio a las ${horaLlegada}. ¡Buen día escolar!`,
      { tipo: 'llegada_colegio', hora: horaLlegada },
    ).catch(() => {});

    const success = await finalizarRecorrido(recorridoActual.id);
    if (success) {
      setRouteActive(false);
      setEstadosRecorridos((prev) => ({ ...prev, [recorridoActual.id]: 'completado' }));
      setHoraLlegadaColegio(horaLlegada);
      setRutaCompletada(true);
      haptic.success();
      abrirSelectorSiHayPendientes(recorridoActual.id);
    }
  }, [
    recorridoActual,
    setRouteActive, setEstadosRecorridos,
    setHoraLlegadaColegio, setRutaCompletada,
    abrirSelectorSiHayPendientes,
  ]);

  return {
    abrirSelectorSiHayPendientes,
    handleMarcarAusente,
    handleMarcarAusenteGeocerca,
    handleNavigate,
    doIniciarRecorrido,
    handleIniciarRecorrido,
    handleConfirmarVuelta,
    handleFinalizarRecorrido,
    handleAutoFinalizarEnColegio,
  };
}
