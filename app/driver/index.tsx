import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import RouteMap from "@/components/RouteMap";
import { useAuth } from "@/contexts/AuthContext";
import {
  DriverAlerts,
  DriverBottomCard,
  DriverOverlayPills,
  RecorridoSelector,
  ReturnAttendanceModal,
  useDriverActions,
  useDriverDerivedState,
} from "@/features/driver";
import { useDriverEstudiantes } from "@/lib/hooks/useDriverEstudiantes";
import { useDriverETAs } from "@/lib/hooks/useDriverETAs";
import { useDriverRecorrido } from "@/lib/hooks/useDriverRecorrido";
import { useGeofencePushNotifications } from "@/lib/hooks/useGeofencePushNotifications";
import { useGeofencing } from "@/lib/hooks/useGeofencing";
import type { UbicacionLocal } from "@/lib/hooks/useGPSTracking";
import { useGPSTracking } from "@/lib/hooks/useGPSTracking";
import { useRouteDeviation } from "@/lib/hooks/useRouteDeviation";
import { getUbicacionColegio } from "@/lib/services/configuracion.service";
import { calcularDistancia } from "@/lib/services/geocercas.service";
import { formatHoraEC } from "@/lib/utils/datetime";
import { haptic } from "@/lib/utils/haptics";
import { calcularPolylineRestante } from "@/lib/utils/polyline";
import { Bus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { TourStep, useTourAutoStart } from "@/features/tour";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function DriverHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  useTourAutoStart('driver');

  const [headerHeight, setHeaderHeight] = useState(160);

  // ── Recorrido + Paradas + Estado ────────────────────────────────────────────
  const {
    recorridos,
    recorridoActual,
    setRecorridoActual,
    loadingRecorridos,
    estadosRecorridos,
    setEstadosRecorridos,
    paradas,
    setParadas,
    polylineCoordinates,
    setPolylineCoordinates,
    routeActive,
    setRouteActive,
    horaInicioRecorrido,
    rutaCompletada,
    setRutaCompletada,
    horaLlegadaColegio,
    setHoraLlegadaColegio,
  } = useDriverRecorrido(profile?.id);

  const tipoRuta = recorridoActual?.tipo_ruta ?? 'ida';

  // ── Estudiantes + Realtime ──────────────────────────────────────────────────
  const { estudiantes, loading, cargarEstudiantes } =
    useDriverEstudiantes(recorridoActual, profile?.id, routeActive);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [processingStudent, setProcessingStudent] = useState<string | null>(null);
  const [showRecorridoSelector, setShowRecorridoSelector] = useState(false);
  const [showReturnAttendance, setShowReturnAttendance] = useState(false);
  const [optimizandoRuta, setOptimizandoRuta] = useState(false);
  const [ubicacionColegio, setUbicacionColegio] = useState<{
    latitud: number;
    longitud: number;
    nombre: string;
  } | null>(null);

  // ── GPS ─────────────────────────────────────────────────────────────────────
  const {
    error: errorGPS,
    tracking,
    ubicacionActual,
  } = useGPSTracking({
    idAsignacion: recorridoActual?.id || null,
    idChofer: profile?.id || "",
    recorridoActivo: routeActive,
  });
  const ubicacionChofer: UbicacionLocal | null = ubicacionActual;

  // ── Geofencing ──────────────────────────────────────────────────────────────
  const {
    estudianteActual: estudianteGeocerca,
    dentroDeZona,
    marcarCompletadoManual,
  } = useGeofencing({
    idAsignacion: recorridoActual?.id ?? null,
    idChofer: profile?.id || "",
    recorridoActivo: routeActive,
    ubicacionActual: ubicacionChofer,
    radioMetros: 150,
    estudiantes,
    paradas,
    tipoRuta,
  });

  const colegioGeofenceActivadoRef = useRef(false);

  // ── Route deviation ─────────────────────────────────────────────────────────
  const { desviado, distanciaDesvio } = useRouteDeviation({
    ubicacionActual: ubicacionChofer,
    polylineCoordinates,
    routeActive: routeActive && !dentroDeZona,
    idAsignacion: recorridoActual?.id ?? null,
    umbralMetros: 200,
  });

  // ── Geofence push notifications ─────────────────────────────────────────────
  useGeofencePushNotifications(
    dentroDeZona,
    estudianteGeocerca,
    recorridoActual,
    estudiantes,
    tipoRuta,
  );

  // ── Derived state ───────────────────────────────────────────────────────────
  const {
    stats,
    paradasVisibles,
    nextStudent,
    todosAtendidos,
    enCaminoAlColegio,
    todosEntregadosVuelta,
    paradaMasCercana,
    estaEnGeocerca,
    hayEstudianteActivo,
    hayCaminoASiguiente,
    estudianteActivoNombre,
    estudianteActivoDireccion,
    estudianteActivoId,
    idPadreActivo,
    BOTTOM_CARD_BOTTOM,
  } = useDriverDerivedState({
    estudiantes,
    paradas,
    polylineCoordinates,
    ubicacionChofer,
    routeActive,
    dentroDeZona,
    estudianteGeocerca,
    tipoRuta,
  });

  // ── ETAs ────────────────────────────────────────────────────────────────────
  const { etasPorParada, etaFinRuta } = useDriverETAs({
    ubicacionChofer,
    routeActive,
    paradasVisibles,
    estudiantes,
    ubicacionColegio,
    idAsignacion: recorridoActual?.id,
  });

  const etaProximaParada = paradaMasCercana
    ? (etasPorParada[paradaMasCercana.parada.id] ?? null)
    : null;

  // ── Polyline (remaining) ─────────────────────────────────────────────────────
  const polylineRestante = useMemo(() => {
    if (!polylineCoordinates.length || !ubicacionChofer) return polylineCoordinates;
    return calcularPolylineRestante(polylineCoordinates, ubicacionChofer);
  }, [
    polylineCoordinates,
    ubicacionChofer?.latitude,
    ubicacionChofer?.longitude,
  ]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const {
    abrirSelectorSiHayPendientes,
    handleMarcarAusente,
    handleMarcarAusenteGeocerca,
    handleNavigate,
    doIniciarRecorrido,
    handleIniciarRecorrido,
    handleConfirmarVuelta,
    handleFinalizarRecorrido,
    handleAutoFinalizarEnColegio,
  } = useDriverActions({
    profileId: profile?.id,
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
  });

  // ── Stable callbacks for memoized child components ──────────────────────────
  // Inline arrow functions in JSX defeat React.memo — the child always sees a
  // new function reference on every render, so memo never short-circuits.
  const handleDismissCompletada = useCallback(() => {
    setRutaCompletada(false);
    setHoraLlegadaColegio(null);
    setPolylineCoordinates([]);
  }, [setRutaCompletada, setHoraLlegadaColegio, setPolylineCoordinates]);

  const handleCambiarRecorrido = useCallback(() => setShowRecorridoSelector(true), []);

  const handleRecorridoSelect = useCallback(
    (rec: import("@/lib/services/asignaciones.service").RecorridoChofer) => {
      haptic.light();
      setRecorridoActual(rec);
      setRutaCompletada(false);
      setHoraLlegadaColegio(null);
      setPolylineCoordinates([]);
      colegioGeofenceActivadoRef.current = false;
      setShowRecorridoSelector(false);
    },
    [setRecorridoActual, setRutaCompletada, setHoraLlegadaColegio, setPolylineCoordinates],
  );

  const handleCloseRecorridoSelector = useCallback(() => setShowRecorridoSelector(false), []);
  const handleCloseReturnAttendance = useCallback(() => setShowReturnAttendance(false), []);
  const handleHomePress = useCallback(() => {}, []);
  const handleMiddlePress = useCallback(() => router.push("/driver/chat"), [router]);
  const handleSettingsPress = useCallback(() => router.push("/driver/settings"), [router]);

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getUbicacionColegio().then(setUbicacionColegio).catch(console.error);
  }, []);

  useEffect(() => {
    if (!routeActive) colegioGeofenceActivadoRef.current = false;
  }, [routeActive]);

  // Auto-finalize on school arrival (IDA only)
  useEffect(() => {
    if (!enCaminoAlColegio || !ubicacionColegio || !ubicacionChofer) return;
    if (colegioGeofenceActivadoRef.current) return;
    const distancia = calcularDistancia(
      ubicacionChofer.latitude,
      ubicacionChofer.longitude,
      ubicacionColegio.latitud,
      ubicacionColegio.longitud,
    );
    if (distancia > 50) return;
    colegioGeofenceActivadoRef.current = true;
    void handleAutoFinalizarEnColegio();
  }, [
    enCaminoAlColegio,
    ubicacionChofer?.latitude,
    ubicacionChofer?.longitude,
    ubicacionColegio,
    handleAutoFinalizarEnColegio,
  ]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* ── LAYER 0: Map (fullscreen background) ── */}
      <View style={StyleSheet.absoluteFillObject}>
        <RouteMap
          paradas={paradasVisibles}
          ubicacionBus={null}
          recorridoActivo={routeActive}
          polylineCoordinates={routeActive ? polylineRestante : undefined}
          ubicacionColegio={ubicacionColegio}
          mostrarUbicacionChofer={true}
          ubicacionChofer={ubicacionChofer}
          showsUserLocation={false}
        />
      </View>

      {/* ── LAYER 1: Header — TourStep 1 ── */}
      <TourStep
        scope="driver"
        id="driver-header"
        order={1}
        title="Tu Panel de Chofer"
        description="Aquí ves tu ruta asignada para el día. Cuando el recorrido esté activo aparece el badge 'EN CURSO' con la hora de salida. Selecciona la ruta desde aquí antes de arrancar."
        borderRadius={24}
        padding={0}
      >
        <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <DashboardHeader
            title="PANEL DE CHOFER"
            subtitle={recorridoActual?.nombre_ruta || "Panel de Chofer"}
            icon={Bus}
            rightBadge={
              routeActive
                ? {
                    text: "EN CURSO",
                    bgColor: "rgba(255,255,255,0.25)",
                    textColor: "#ffffff",
                  }
                : null
            }
          />
          {routeActive && horaInicioRecorrido && (
            <View style={{ position: "absolute", bottom: 14, left: 24 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Salió {formatHoraEC(horaInicioRecorrido)}
              </Text>
            </View>
          )}
        </View>
      </TourStep>

      {/* ── LAYER 2: Overlay pills ── */}
      <DriverOverlayPills
        routeActive={routeActive}
        tracking={tracking}
        tipoRuta={tipoRuta}
        statsCompleted={stats.completed}
        statsTotal={stats.total}
        etaFinRuta={etaFinRuta}
        topOffset={headerHeight + 8}
      />

      {/* ── LAYER 3: Bottom card — TourStep 2 ── */}
      <DriverBottomCard
        recorridos={recorridos}
        recorridoActual={recorridoActual}
        estadosRecorridos={estadosRecorridos}
        tipoRuta={tipoRuta}
        routeActive={routeActive}
        loadingRecorridos={loadingRecorridos}
        rutaCompletada={rutaCompletada}
        horaLlegadaColegio={horaLlegadaColegio}
        loading={loading}
        processingStudent={processingStudent}
        estudiantes={estudiantes}
        paradas={paradas}
        nextStudent={nextStudent}
        estudianteGeocerca={estudianteGeocerca}
        estaEnGeocerca={estaEnGeocerca}
        hayEstudianteActivo={hayEstudianteActivo}
        hayCaminoASiguiente={hayCaminoASiguiente}
        enCaminoAlColegio={enCaminoAlColegio}
        todosEntregadosVuelta={todosEntregadosVuelta}
        estudianteActivoNombre={estudianteActivoNombre}
        estudianteActivoDireccion={estudianteActivoDireccion}
        estudianteActivoId={estudianteActivoId}
        idPadreActivo={idPadreActivo}
        etaProximaParada={etaProximaParada}
        etaFinRuta={etaFinRuta}
        bottomOffset={BOTTOM_CARD_BOTTOM}
        onIniciarRecorrido={handleIniciarRecorrido}
        onFinalizarRecorrido={handleFinalizarRecorrido}
        onMarcarAusenteGeocerca={handleMarcarAusenteGeocerca}
        onDismissCompletada={handleDismissCompletada}
        onCambiarRecorrido={handleCambiarRecorrido}
        setRutaCompletada={setRutaCompletada}
        setHoraLlegadaColegio={setHoraLlegadaColegio}
        setPolylineCoordinates={setPolylineCoordinates}
        setRecorridoActual={setRecorridoActual}
        setShowRecorridoSelector={setShowRecorridoSelector}
      />

      {/* ── Modals ── */}
      <RecorridoSelector
        visible={showRecorridoSelector}
        recorridos={recorridos}
        estadosRecorridos={estadosRecorridos}
        selectedId={recorridoActual?.id}
        onSelect={handleRecorridoSelect}
        onClose={handleCloseRecorridoSelector}
      />

      <ReturnAttendanceModal
        visible={showReturnAttendance}
        estudiantes={estudiantes}
        loading={loading}
        nombreRuta={recorridoActual?.nombre_ruta ?? "Ruta de vuelta"}
        onConfirm={handleConfirmarVuelta}
        onCancel={handleCloseReturnAttendance}
      />

      {/* ── Alerts: deviation, GPS error, optimizing overlay ── */}
      <DriverAlerts
        routeActive={routeActive}
        desviado={desviado}
        distanciaDesvio={distanciaDesvio}
        errorGPS={errorGPS}
        optimizandoRuta={optimizandoRuta}
        topOffset={headerHeight + 56}
        bottomCardBottom={BOTTOM_CARD_BOTTOM}
      />

      {/* ── Bottom navigation ── */}
      <BottomNavigation
        activeTab="home"
        onHomePress={handleHomePress}
        onMiddlePress={handleMiddlePress}
        onSettingsPress={handleSettingsPress}
      />

      {/* ── TOUR ANCHOR: Bottom Navigation (step 3) ── */}
      <TourStep
        scope="driver"
        id="driver-nav"
        order={3}
        title="Chat con los Padres"
        description="Usa el botón central para abrir el chat y comunicarte con los padres de tus estudiantes durante el recorrido. El ícono de ajustes te lleva a la configuración."
        style={{
          position: 'absolute',
          bottom: 7 + Math.max(insets.bottom, 8),
          left: 30,
          right: 30,
          height: 64,
        }}
        borderRadius={28}
        padding={0}
        pointerEvents="none"
      >
        <View style={{ flex: 1 }} collapsable={false} />
      </TourStep>
    </View>
  );
}
