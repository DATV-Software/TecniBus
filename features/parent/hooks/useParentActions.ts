/**
 * Extracts all handler functions from the parent screen.
 */
import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAlert } from '@/components/ui/AlertBox/useAlert';
import { toggleAsistencia } from '@/lib/services/asistencias.service';
import { haptic } from '@/lib/utils/haptics';
import type { EstudianteDelPadre } from '@/lib/services/padres.service';

type Options = {
  estudianteSeleccionado: EstudianteDelPadre | null;
  isAttending: boolean;
  tipoRuta: 'ida' | 'vuelta';
  choferEnCamino: boolean;
  marcadoPorChofer: boolean;
  idAsignacion: string | null;
  idChofer: string | null;
  nombreChofer: string | null;
  // Setters
  setIsAttending: (v: boolean) => void;
  setEstudianteSeleccionado: (e: EstudianteDelPadre) => void;
  setShowStudentSelector: (v: boolean) => void;
  setIsSheetExpanded: (v: boolean) => void;
  setProcessingAttendance: (v: boolean) => void;
};

export function useParentActions({
  estudianteSeleccionado,
  isAttending,
  tipoRuta,
  choferEnCamino,
  marcadoPorChofer,
  idAsignacion,
  idChofer,
  nombreChofer,
  setIsAttending,
  setEstudianteSeleccionado,
  setShowStudentSelector,
  setIsSheetExpanded,
  setProcessingAttendance,
}: Options) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const toggleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toggle student attendance (absent / present) ───────────────────────────
  const handleToggleAttendance = useCallback(async () => {
    if (toggleDebounceRef.current) return; // debounce: ignore rapid taps
    toggleDebounceRef.current = setTimeout(() => { toggleDebounceRef.current = null; }, 800);
    if (!estudianteSeleccionado?.id || !estudianteSeleccionado?.parada?.ruta?.id) {
      showAlert({
        title: 'Error',
        message: 'No se puede marcar asistencia sin estudiante o ruta asignada',
        type: 'error',
      });
      return;
    }

    if (choferEnCamino) {
      haptic.error();
      showAlert({
        title: 'Ruta en curso',
        message: 'No puedes cambiar la asistencia una vez que la ruta ha iniciado.',
        type: 'info',
      });
      return;
    }

    try {
      setProcessingAttendance(true);
      haptic.medium();

      const marcarComoAusente = isAttending;
      const success = await toggleAsistencia(
        estudianteSeleccionado.id,
        estudianteSeleccionado.parada.ruta.id,
        marcarComoAusente,
      );

      if (success) {
        setIsAttending(!isAttending);
        haptic.success();

        if (marcarComoAusente) {
          const msg =
            tipoRuta === 'vuelta'
              ? 'El chofer ha sido notificado que el estudiante no irá en la ruta de vuelta.'
              : 'El chofer ha sido notificado que el estudiante no asistirá hoy.';
          showAlert({ title: 'Ausencia registrada', message: msg, type: 'info' });
        } else {
          const msg =
            tipoRuta === 'vuelta'
              ? 'El estudiante volverá a ser entregado normalmente.'
              : 'El estudiante volverá a ser recogido normalmente.';
          showAlert({ title: 'Asistencia actualizada', message: msg, type: 'info' });
        }
      } else {
        haptic.error();
        showAlert({
          title: 'Error',
          message: 'No se pudo actualizar la asistencia. Intenta nuevamente.',
          type: 'error',
        });
      }
    } catch (error) {
      haptic.error();
      showAlert({
        title: 'Error',
        message: 'Ocurrió un error al actualizar la asistencia',
        type: 'error',
      });
    } finally {
      setProcessingAttendance(false);
    }
  }, [
    estudianteSeleccionado,
    isAttending,
    tipoRuta,
    choferEnCamino,
    setIsAttending,
    setProcessingAttendance,
    showAlert,
  ]);

  // ── Sheet snap-point change listener ──────────────────────────────────────
  const handleSheetSnapChange = useCallback(
    (snapPoint: number) => {
      setIsSheetExpanded(snapPoint >= 0.45);
    },
    [setIsSheetExpanded],
  );

  // ── Navigate to settings ──────────────────────────────────────────────────
  const handleSettings = useCallback(() => {
    haptic.light();
    router.push('/parent/settings');
  }, [router]);

  // ── Select a different student ────────────────────────────────────────────
  const handleSelectStudent = useCallback(
    (estudiante: EstudianteDelPadre) => {
      haptic.light();
      setEstudianteSeleccionado(estudiante);
      setShowStudentSelector(false);
    },
    [setEstudianteSeleccionado, setShowStudentSelector],
  );

  // ── Open chat with driver ─────────────────────────────────────────────────
  const handleChatDriver = useCallback(() => {
    if (!idAsignacion || !idChofer) {
      showAlert({
        title: 'Chat no disponible',
        message: 'No hay un recorrido activo.',
        type: 'info',
      });
      return;
    }
    haptic.light();
    router.push({
      pathname: '/parent/chat',
      params: {
        idAsignacion,
        idChofer,
        nombreChofer: nombreChofer ?? 'Chofer',
        routeActiva: choferEnCamino ? '1' : '0',
      },
    });
  }, [idAsignacion, idChofer, nombreChofer, choferEnCamino, router, showAlert]);

  return {
    handleToggleAttendance,
    handleSheetSnapChange,
    handleSettings,
    handleSelectStudent,
    handleChatDriver,
  };
}
