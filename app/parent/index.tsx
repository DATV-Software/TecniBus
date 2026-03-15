import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import RouteMap from "@/components/RouteMap";
import { useAuth } from "@/contexts/AuthContext";
import { useParentAsistencia } from "@/lib/hooks/useParentAsistencia";
import { useParentEstudiantes } from "@/lib/hooks/useParentEstudiantes";
import { useParentRecorrido } from "@/lib/hooks/useParentRecorrido";
import {
  DraggableBottomSheet,
  EstimatedArrivalBadge,
  ParentTrackingHero,
  RecorridoStatusBadge,
  StudentSelector,
  TodayTimeline,
} from "@/features/parent";
import { Colors } from "@/lib/constants/colors";
import { toggleAsistencia } from "@/lib/services/asistencias.service";
import { getUbicacionColegio } from "@/lib/services/configuracion.service";
import type { EstudianteDelPadre } from "@/lib/services/padres.service";
import { type Parada } from "@/lib/services/rutas.service";
import { haptic } from "@/lib/utils/haptics";
import { calcularPolylineRestante } from "@/lib/utils/polyline";
import { formatHoraEC } from "@/lib/utils/datetime";
import { useRouter } from "expo-router";
import { CheckCircle2, ChevronDown, GraduationCap, Heart, LogOut, UserX } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ParentHomeScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  // ── Estudiantes + Selección (hook) ─────────────────────────────────────────
  const {
    estudiantes,
    estudianteSeleccionado,
    setEstudianteSeleccionado,
    loading,
    loadEstudiantes,
  } = useParentEstudiantes();
  // ── Asistencia del estudiante (hook) ────────────────────────────────────────
  const {
    isAttending,
    setIsAttending,
    estudianteRecogido,
    marcadoPorChofer,
    horaRecogida,
    cargarEstadoAsistencia,
  } = useParentAsistencia(estudianteSeleccionado?.id);

  // ── Recorrido del chofer (hook) ─────────────────────────────────────────────
  const {
    choferEnCamino,
    idAsignacion,
    horaInicioRecorrido,
    polylineCoordinates,
    estimatedMinutes,
    etaColegio,
    horaLlegadaColegio,
    nombreChofer,
    idChofer,
    ubicacionBus,
    tipoRuta,
  } = useParentRecorrido(estudianteSeleccionado);

  // ── Estado local ─────────────────────────────────────────────────────────────
  const [processingAttendance, setProcessingAttendance] = useState(false);
  const [paradasRuta, setParadasRuta] = useState<Parada[]>([]);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [ubicacionColegio, setUbicacionColegio] = useState<{
    latitud: number;
    longitud: number;
    nombre: string;
  } | null>(null);

  // Timeline dinámico con datos reales
  const timelineEvents = useMemo(() => {
    const events: {
      id: string;
      title: string;
      subtitle: string;
      time?: string;
      status: 'completed' | 'active' | 'upcoming';
      icon: 'board' | 'departure' | 'stop';
    }[] = [];

    const huboRecorrido = choferEnCamino || estudianteRecogido;
    const parada = estudianteSeleccionado?.parada;
    const nombreColegio = ubicacionColegio?.nombre || 'Colegio';

    if (tipoRuta === 'vuelta') {
      // VUELTA: Colegio (inicio) → Parada del estudiante (destino)

      // 1. Inicio desde el colegio
      events.push({
        id: 'inicio',
        title: `Salida desde ${nombreColegio}`,
        subtitle: huboRecorrido
          ? `Salió a las ${horaInicioRecorrido ? formatHoraEC(horaInicioRecorrido) : '--:--'}`
          : 'Esperando inicio del recorrido',
        time: horaInicioRecorrido && huboRecorrido ? formatHoraEC(horaInicioRecorrido) : undefined,
        status: huboRecorrido ? 'completed' : 'upcoming',
        icon: 'board',
      });

      // 2. Parada del estudiante (destino final)
      if (estudianteRecogido) {
        events.push({
          id: 'parada-casa',
          title: parada?.nombre || 'Tu parada',
          subtitle: horaRecogida
            ? `Entregado a las ${horaRecogida}`
            : 'Estudiante entregado en su parada',
          status: 'completed',
          icon: 'stop',
        });
      } else {
        events.push({
          id: 'parada-casa',
          title: parada?.nombre || 'Tu parada',
          subtitle: parada?.direccion || 'Destino del estudiante',
          time: choferEnCamino && estimatedMinutes !== null ? `~${estimatedMinutes} min` : undefined,
          status: choferEnCamino ? 'active' : 'upcoming',
          icon: 'stop',
        });
      }
    } else {
      // IDA: Inicio de recorrido → Parada del estudiante → Colegio

      // 1. Inicio de recorrido
      events.push({
        id: 'inicio',
        title: 'Inicio de recorrido',
        subtitle: huboRecorrido
          ? `Salió a las ${horaInicioRecorrido ? formatHoraEC(horaInicioRecorrido) : '--:--'}`
          : 'Esperando inicio del recorrido',
        time: horaInicioRecorrido ? formatHoraEC(horaInicioRecorrido) : undefined,
        status: huboRecorrido ? 'completed' : 'upcoming',
        icon: 'departure',
      });

      // 2. Parada del estudiante (recogida)
      if (estudianteRecogido) {
        events.push({
          id: 'parada-casa',
          title: parada?.nombre || 'Tu parada',
          subtitle: horaRecogida
            ? `Estudiante recogido a las ${horaRecogida}`
            : 'Estudiante recogido',
          status: 'completed',
          icon: 'stop',
        });
      } else {
        events.push({
          id: 'parada-casa',
          title: parada?.nombre || 'Tu parada',
          subtitle: parada?.direccion || 'Parada asignada del estudiante',
          time: choferEnCamino && estimatedMinutes !== null ? `~${estimatedMinutes} min` : undefined,
          status: choferEnCamino ? 'active' : 'upcoming',
          icon: 'stop',
        });
      }

      // 3. Llegada al colegio
      const colegioCompletado = estudianteRecogido && !choferEnCamino;
      events.push({
        id: 'colegio',
        title: nombreColegio,
        subtitle: colegioCompletado
          ? (horaLlegadaColegio ? `Llegaron a las ${horaLlegadaColegio}` : 'Llegaron al colegio')
          : 'Destino final del recorrido',
        time: !colegioCompletado && choferEnCamino && etaColegio !== null ? `~${etaColegio} min` : undefined,
        status: colegioCompletado ? 'completed' : estudianteRecogido ? 'active' : 'upcoming',
        icon: 'board',
      });
    }

    return events;
  }, [tipoRuta, choferEnCamino, horaInicioRecorrido, estudianteSeleccionado?.parada, ubicacionColegio, estimatedMinutes, etaColegio, estudianteRecogido, horaRecogida, horaLlegadaColegio]);

  useEffect(() => {
    loadEstudiantes();
    cargarUbicacionColegio();
  }, []);

  const cargarUbicacionColegio = async () => {
    try {
      const ubicacion = await getUbicacionColegio();
      setUbicacionColegio(ubicacion);
    } catch (error) {
      console.error('Error cargando ubicación del colegio:', error);
    }
  };

  // Polyline dinámica: solo los puntos desde la posición actual del bus hacia adelante
  const polylineRestante = useMemo(() => {
    if (!polylineCoordinates.length || !ubicacionBus) return polylineCoordinates;
    return calcularPolylineRestante(polylineCoordinates, { latitude: ubicacionBus.latitud, longitude: ubicacionBus.longitud });
  }, [polylineCoordinates, ubicacionBus?.latitud, ubicacionBus?.longitud]);

  // Cargar paradas cuando cambia la ruta del estudiante
  // SOLO mostramos la parada del hijo, no todas las paradas (privacidad)
  useEffect(() => {
    if (!estudianteSeleccionado?.parada) {
      setParadasRuta([]);
      return;
    }

    // Convertir a números para evitar NaN
    const latitud = typeof estudianteSeleccionado.parada.latitud === 'string'
      ? parseFloat(estudianteSeleccionado.parada.latitud)
      : estudianteSeleccionado.parada.latitud;

    const longitud = typeof estudianteSeleccionado.parada.longitud === 'string'
      ? parseFloat(estudianteSeleccionado.parada.longitud)
      : estudianteSeleccionado.parada.longitud;

    if (isNaN(latitud) || isNaN(longitud)) {
      setParadasRuta([]);
      return;
    }

    setParadasRuta([{
      id: estudianteSeleccionado.parada.id,
      nombre: estudianteSeleccionado.parada.nombre || 'Mi parada',
      latitud,
      longitud,
      direccion: estudianteSeleccionado.parada.direccion ?? null,
      id_ruta: estudianteSeleccionado.parada.ruta?.id || '',
    }]);
  }, [estudianteSeleccionado?.parada]);

  const handleToggleAttendance = async () => {
    if (
      !estudianteSeleccionado?.id ||
      !estudianteSeleccionado?.parada?.ruta?.id
    ) {
      showAlert({ title: "Error", message: "No se puede marcar asistencia sin estudiante o ruta asignada", type: "error" });
      return;
    }

    if (choferEnCamino) {
      haptic.error();
      showAlert({ title: "Ruta en curso", message: "No puedes cambiar la asistencia una vez que la ruta ha iniciado.", type: "info" });
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
          const msg = tipoRuta === 'vuelta'
            ? "El chofer ha sido notificado que el estudiante no irá en la ruta de vuelta."
            : "El chofer ha sido notificado que el estudiante no asistirá hoy.";
          showAlert({ title: "Ausencia registrada", message: msg, type: "info" });
        } else {
          const msg = tipoRuta === 'vuelta'
            ? "El estudiante volverá a ser entregado normalmente."
            : "El estudiante volverá a ser recogido normalmente.";
          showAlert({ title: "Asistencia actualizada", message: msg, type: "info" });
        }
      } else {
        haptic.error();
        showAlert({ title: "Error", message: "No se pudo actualizar la asistencia. Intenta nuevamente.", type: "error" });
      }
    } catch (error) {
      console.error("Error toggling attendance:", error);
      haptic.error();
      showAlert({ title: "Error", message: "Ocurrió un error al actualizar la asistencia", type: "error" });
    } finally {
      setProcessingAttendance(false);
    }
  };

  const handleSheetSnapChange = (snapPoint: number) => {
    // El sheet está expandido si está en el maxSnapPoint (0.45)
    setIsSheetExpanded(snapPoint >= 0.45);
  };

  const handleSettings = () => {
    haptic.light();
    router.push("/parent/settings");
  };

  const handleSelectStudent = (estudiante: EstudianteDelPadre) => {
    haptic.light();
    setEstudianteSeleccionado(estudiante);
    setShowStudentSelector(false);
  };

  const handleChatDriver = () => {
    if (!idAsignacion || !idChofer) {
      showAlert({ title: "Chat no disponible", message: "No hay un recorrido activo.", type: "info" });
      return;
    }
    haptic.light();
    router.push({
      pathname: "/parent/chat",
      params: {
        idAsignacion,
        idChofer,
        nombreChofer: nombreChofer ?? "Chofer",
        routeActiva: choferEnCamino ? "1" : "0",
      },
    });
  };

  // Loading state
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: Colors.tecnibus[50] }}
      >
        <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
        <Text className="text-gray-500 mt-4">Cargando información...</Text>
      </View>
    );
  }

  // Empty state
  if (estudiantes.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: Colors.tecnibus[50] }}
      >
        <View className="bg-gray-100 p-4 rounded-full mb-4">
          <GraduationCap size={48} color="#9ca3af" strokeWidth={2} />
        </View>
        <Text className="text-gray-800 text-xl font-bold mb-2 font-calsans">
          Sin estudiantes asignados
        </Text>
        <Text className="text-gray-500 text-center">
          Aún no tienes estudiantes vinculados a tu cuenta. Contacta al
          administrador para asignar estudiantes.
        </Text>
        <TouchableOpacity
          onPress={signOut}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
            backgroundColor: "#FEF2F2",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#FCA5A5",
          }}
        >
          <LogOut size={18} color="#DC2626" strokeWidth={2} />
          <Text style={{ color: "#DC2626", fontWeight: "600", fontSize: 15 }}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar
        backgroundColor={Colors.tecnibus[600]}
        barStyle="light-content"
      />

      {/* Map Background - FULL SCREEN (behind everything) */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        <View style={{ flex: 1 }}>
          <RouteMap
            paradas={paradasRuta}
            ubicacionBus={estudianteRecogido ? null : ubicacionBus}
            recorridoActivo={choferEnCamino && !estudianteRecogido}
            ubicacionColegio={ubicacionColegio}
            showsUserLocation={false}
            polylineCoordinates={estudianteRecogido ? [] : polylineRestante}
          />
        </View>
      </View>

      {/* Dashboard Header - Overlay on top of map */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <DashboardHeader
          title="PANEL DE PADRE"
          subtitle={`¡Hola ${profile?.nombre}!`}
          gradientColors={[
            Colors.tecnibus[600],
            Colors.tecnibus[500],
            Colors.tecnibus[400],
          ]}
          icon={Heart}
        />

        {/* Badges: recogido / ausente / en camino */}
        {estudianteRecogido ? (
          <View style={{ gap: 8 }}>
            <View
              style={{
                marginLeft: 16,
                marginTop: 8,
                alignSelf: "flex-start",
                backgroundColor: "#ECFDF5",
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <CheckCircle2 size={18} color="#059669" strokeWidth={2.5} />
              <View style={{ marginLeft: 10 }}>
                <Text
                  className="font-bold"
                  style={{ fontSize: 14, color: "#065F46" }}
                >
                  {tipoRuta === 'vuelta' ? 'Ya fue entregado' : 'Ya fue recogido'}
                </Text>
                <Text style={{ fontSize: 11, color: "#059669", marginTop: 2 }}>
                  {tipoRuta === 'vuelta'
                    ? horaRecogida ? `Entregado a las ${horaRecogida}` : 'La buseta lo entregó en su parada'
                    : horaRecogida ? `Recogido a las ${horaRecogida}` : 'La buseta lo recogió correctamente'}
                </Text>
              </View>
            </View>
            {tipoRuta === 'ida' && etaColegio !== null && (
              <EstimatedArrivalBadge
                minutes={etaColegio}
                onSchedule={choferEnCamino}
                label="al colegio"
              />
            )}
          </View>
        ) : !isAttending ? (
          <View
            style={{
              marginLeft: 16,
              marginTop: 8,
              alignSelf: "flex-start",
              backgroundColor: "#FEF2F2",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <UserX size={18} color="#DC2626" strokeWidth={2.5} />
            <View style={{ marginLeft: 10 }}>
              <Text
                className="font-bold"
                style={{ fontSize: 14, color: "#991B1B" }}
              >
                {tipoRuta === 'vuelta' ? 'No será entregado hoy' : 'No sera recogido hoy'}
              </Text>
              <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>
                {marcadoPorChofer
                  ? "Marcado ausente por el chofer"
                  : "Marcado ausente por ti"}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <RecorridoStatusBadge isActive={choferEnCamino} />
            {choferEnCamino && estimatedMinutes !== null && (
              <EstimatedArrivalBadge
                minutes={estimatedMinutes}
                onSchedule={choferEnCamino}
                label={tipoRuta === 'vuelta' ? 'a tu parada' : 'a tu parada'}
              />
            )}
          </>
        )}

        {/* Student Selector Chip - Solo si hay más de 1 estudiante */}
        {estudiantes.length > 1 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              haptic.light();
              setShowStudentSelector(true);
            }}
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <GraduationCap
              size={16}
              color={Colors.tecnibus[600]}
              strokeWidth={2.5}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: Colors.tecnibus[800],
                marginLeft: 6,
              }}
            >
              {estudianteSeleccionado?.nombre || "Seleccionar"}
            </Text>
            <ChevronDown
              size={14}
              color={Colors.tecnibus[500]}
              strokeWidth={2.5}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Draggable Bottom Sheet */}
      <DraggableBottomSheet
        initialSnapPoint={0.15}
        minSnapPoint={0.15}
        maxSnapPoint={0.52}
        onSnapPointChange={handleSheetSnapChange}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          scrollEnabled={isSheetExpanded}
          nestedScrollEnabled={true}
          bounces={isSheetExpanded}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 430 }}
        >
          {/* Hero Card */}
          <ParentTrackingHero
            studentName={estudianteSeleccionado?.nombreCompleto || "Estudiante"}
            driverName={nombreChofer || "—"}
            isOnline={choferEnCamino}
            isAttending={isAttending}
            isRecogido={estudianteRecogido}
            routeStarted={choferEnCamino}
            onChatPress={handleChatDriver}
            onNotifyAbsencePress={handleToggleAttendance}
          />

          {/* Timeline / ausencia */}
          {isAttending || estudianteRecogido ? (
            <TodayTimeline events={timelineEvents} isLive={choferEnCamino} />
          ) : (
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                padding: 24,
                marginHorizontal: 16,
                marginBottom: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <UserX size={32} color="#DC2626" strokeWidth={1.5} />
              </View>
              <Text
                className="font-bold"
                style={{ fontSize: 17, color: "#1F2937" }}
              >
                Estudiante ausente hoy
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 18,
                }}
              >
                {estudianteSeleccionado?.nombre || "El estudiante"}{" "}
                {tipoRuta === 'vuelta' ? 'no será entregado' : 'no sera recogido'} por la buseta hoy.
                {"\n"}
                {marcadoPorChofer
                  ? "Fue marcado ausente por el chofer."
                  : "Si cambias de opinion, puedes reactivar la asistencia arriba."}
              </Text>
            </View>
          )}
        </ScrollView>
      </DraggableBottomSheet>

      {/* Student Selector Modal */}
      <StudentSelector
        visible={showStudentSelector}
        estudiantes={estudiantes}
        selectedId={estudianteSeleccionado?.id}
        onSelect={handleSelectStudent}
        onClose={() => setShowStudentSelector(false)}
      />

      {/* Bottom Navigation - Always on top */}
      <BottomNavigation
        activeTab="home"
        activeColor={Colors.tecnibus[600]}
        onHomePress={() => {}}
        onMiddlePress={handleChatDriver}
        onSettingsPress={handleSettings}
      />
    </View>
  );
}
