import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import RouteMap from "@/components/RouteMap";
import { useAuth } from "@/contexts/AuthContext";
import { RecorridoSelector } from "@/features/driver";
import { Colors } from "@/lib/constants/colors";
import { useDriverEstudiantes } from "@/lib/hooks/useDriverEstudiantes";
import { useDriverETAs } from "@/lib/hooks/useDriverETAs";
import { useDriverRecorrido } from "@/lib/hooks/useDriverRecorrido";
import { useGeofencePushNotifications } from "@/lib/hooks/useGeofencePushNotifications";
import { useGeofencing } from "@/lib/hooks/useGeofencing";
import type { UbicacionLocal } from "@/lib/hooks/useGPSTracking";
import { useGPSTracking } from "@/lib/hooks/useGPSTracking";
import { marcarAusente } from "@/lib/services/asistencias.service";
import { getUbicacionColegio } from "@/lib/services/configuracion.service";
import {
  calcularDistancia,
  inicializarEstadosGeocercas,
  marcarEstudianteCompletado,
} from "@/lib/services/geocercas.service";
import {
  finalizarRecorrido,
  guardarPolylineRuta,
  iniciarRecorrido,
} from "@/lib/services/recorridos.service";
import {
  calcularRutaOptimizada,
  type Parada,
} from "@/lib/services/rutas.service";
import { sendPushToParents } from "@/lib/services/notifications.service";
import type { UbicacionActual } from "@/lib/services/ubicaciones.service";
import { haptic } from "@/lib/utils/haptics";
import { formatHoraEC } from "@/lib/utils/datetime";
import { calcularPolylineRestante } from "@/lib/utils/polyline";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Bus,
  CheckCircle2,
  Clock,
  MapPin,
  Play,
  UserX,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/AlertBox/useAlert";

export default function DriverHomeScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  // Altura del header medida via onLayout para posicionar pills correctamente
  const [headerHeight, setHeaderHeight] = useState(160);

  // ── Recorrido + Paradas + Estado (hook) ────────────────────────────────────
  const {
    recorridos,
    recorridoActual,
    setRecorridoActual,
    loadingRecorridos,
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

  // ── Estudiantes + Realtime (hook) ──────────────────────────────────────────
  const { estudiantes, setEstudiantes, loading, cargarEstudiantes } = useDriverEstudiantes(
    recorridoActual,
    profile?.id,
    routeActive,
  );

  // ── State local ────────────────────────────────────────────────────────────
  const [processingStudent, setProcessingStudent] = useState<string | null>(null);
  const [showRecorridoSelector, setShowRecorridoSelector] = useState(false);
  const [ubicacionBus, setUbicacionBus] = useState<UbicacionActual | null>(null);
  const [optimizandoRuta, setOptimizandoRuta] = useState(false);
  const [ubicacionColegio, setUbicacionColegio] = useState<{
    latitud: number;
    longitud: number;
    nombre: string;
  } | null>(null);

  // ── GPS ────────────────────────────────────────────────────────────────────
  const { error: errorGPS, tracking, ubicacionActual } = useGPSTracking({
    idAsignacion: recorridoActual?.id || null,
    idChofer: profile?.id || "",
    recorridoActivo: routeActive,
  });
  const ubicacionChofer: UbicacionLocal | null = ubicacionActual;

  // ── Geofencing ─────────────────────────────────────────────────────────────
  const {
    estudianteActual: estudianteGeocerca,
    dentroDeZona,
    distanciaMetros,
    marcarCompletadoManual,
  } = useGeofencing({
    idAsignacion: recorridoActual?.id ?? null,
    idChofer: profile?.id || "",
    recorridoActivo: routeActive,
    ubicacionActual: ubicacionChofer,
    radioMetros: 150,
    estudiantes,
    paradas,
  });

  const colegioGeofenceActivadoRef = useRef(false);

  // ── Geofence push notifications (hook) ─────────────────────────────────────
  useGeofencePushNotifications(dentroDeZona, estudianteGeocerca, recorridoActual);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = estudiantes.filter(
      (e) => e.estado === "completado",
    ).length;
    const absent = estudiantes.filter((e) => e.estado === "ausente").length;
    const total = estudiantes.length;
    const remaining = total - completed - absent;
    return { completed, absent, total, remaining };
  }, [estudiantes]);

  const nextStudent = useMemo(() => {
    const pending = estudiantes
      .filter((e) => e.estado !== "ausente" && e.estado !== "completado")
      .sort((a, b) => (a.apellido ?? "").localeCompare(b.apellido ?? ""));
    return pending[0] || null;
  }, [estudiantes]);

  const enCaminoAlColegio = routeActive && !nextStudent && !estudianteGeocerca;

  const paradasAusentesIds = useMemo(() => {
    if (estudiantes.length === 0) return new Set<string>();
    const activos = new Map<string, number>();
    const totales = new Map<string, number>();
    for (const e of estudiantes) {
      if (!e.parada?.id) continue;
      totales.set(e.parada.id, (totales.get(e.parada.id) || 0) + 1);
      if (e.estado !== "ausente" && e.estado !== "completado") {
        activos.set(e.parada.id, (activos.get(e.parada.id) || 0) + 1);
      }
    }
    const ausentes = new Set<string>();
    for (const [paradaId, total] of totales) {
      if ((activos.get(paradaId) || 0) === 0 && total > 0) {
        ausentes.add(paradaId);
      }
    }
    return ausentes;
  }, [estudiantes]);

  const paradasVisibles = useMemo(() => {
    if (paradasAusentesIds.size === 0) return paradas;
    return paradas.filter((p) => !paradasAusentesIds.has(p.id));
  }, [paradas, paradasAusentesIds]);

  const paradaMasCercana = useMemo(() => {
    if (!ubicacionChofer || paradasVisibles.length === 0 || !routeActive) return null;
    const paradasPendientes = paradasVisibles.filter((p) =>
      estudiantes.some(
        (e) =>
          e.parada?.id === p.id &&
          e.estado !== "ausente" &&
          e.estado !== "completado",
      ),
    );
    if (paradasPendientes.length === 0) return null;
    let menor = Infinity;
    let cercana: (typeof paradasPendientes)[0] | null = null;
    for (const p of paradasPendientes) {
      const dist = calcularDistancia(
        ubicacionChofer.latitude,
        ubicacionChofer.longitude,
        p.latitud,
        p.longitud,
      );
      if (dist < menor) { menor = dist; cercana = p; }
    }
    return cercana ? { parada: cercana, distanciaMetros: menor } : null;
  }, [ubicacionChofer, paradasVisibles, estudiantes, routeActive]);

  // ── ETAs por parada (hook) ─────────────────────────────────────────────────
  const { etasPorParada, etaFinRuta } = useDriverETAs({
    ubicacionChofer,
    routeActive,
    paradasVisibles,
    estudiantes,
    ubicacionColegio,
    idAsignacion: recorridoActual?.id,
  });

  useEffect(() => {
    if (!routeActive) colegioGeofenceActivadoRef.current = false;
  }, [routeActive]);

  const etaProximaParada = paradaMasCercana
    ? (etasPorParada[paradaMasCercana.parada.id] ?? null)
    : null;

  const polylineRestante = useMemo(() => {
    if (!polylineCoordinates.length || !ubicacionChofer) return polylineCoordinates;
    return calcularPolylineRestante(polylineCoordinates, ubicacionChofer);
  }, [polylineCoordinates, ubicacionChofer?.latitude, ubicacionChofer?.longitude]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getUbicacionColegio().then(setUbicacionColegio).catch(console.error);
  }, []);


  // Auto-finalizar al llegar al colegio
  useEffect(() => {
    if (!enCaminoAlColegio || !ubicacionColegio || !ubicacionChofer) return;
    if (colegioGeofenceActivadoRef.current) return;
    const distancia = calcularDistancia(
      ubicacionChofer.latitude, ubicacionChofer.longitude,
      ubicacionColegio.latitud, ubicacionColegio.longitud,
    );
    if (distancia > 50) return;
    colegioGeofenceActivadoRef.current = true;
    const horaLlegada = new Date().toLocaleTimeString("es-EC", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Guayaquil",
    });
    if (recorridoActual?.id) {
      sendPushToParents(recorridoActual.id, "🏫 Llegaron al colegio",
        `Tus hijos llegaron al colegio a las ${horaLlegada}. ¡Buen día escolar!`,
        { tipo: "llegada_colegio", hora: horaLlegada },
      ).catch((err) => console.warn("Error push colegio:", err));
      finalizarRecorrido(recorridoActual.id).then((success) => {
        if (success) {
          setRouteActive(false);
          setHoraLlegadaColegio(horaLlegada);
          setRutaCompletada(true);
          haptic.success();
        }
      }).catch((err) => console.error("Error finalizando recorrido (colegio):", err));
    }
  }, [enCaminoAlColegio, ubicacionChofer?.latitude, ubicacionChofer?.longitude, ubicacionColegio, recorridoActual?.id]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMarcarAusente = async () => {
    if (!profile?.id || !recorridoActual || !nextStudent) return;
    try {
      setProcessingStudent(nextStudent.id);
      haptic.medium();
      const result = await marcarAusente(nextStudent.id, recorridoActual.id_ruta, profile.id);
      if (result) { await cargarEstudiantes(); haptic.success(); }
      else { haptic.error(); showAlert({ title: "Error", message: "No se pudo marcar como ausente", type: "error" }); }
    } catch {
      haptic.error();
      showAlert({ title: "Error", message: "Ocurrio un error", type: "error" });
    } finally {
      setProcessingStudent(null);
    }
  };

  const handleMarcarAusenteGeocerca = async () => {
    if (!profile?.id || !recorridoActual || !estudianteGeocerca) return;
    try {
      setProcessingStudent(estudianteGeocerca.id_estudiante);
      haptic.medium();
      const result = await marcarAusente(estudianteGeocerca.id_estudiante, recorridoActual.id_ruta, profile.id);
      if (result) {
        await marcarEstudianteCompletado(recorridoActual.id, estudianteGeocerca.id_estudiante, profile.id, "ausente");
        await marcarCompletadoManual();
        await cargarEstudiantes();
        haptic.success();
      } else {
        haptic.error();
        showAlert({ title: "Error", message: "No se pudo marcar como ausente", type: "error" });
      }
    } catch {
      haptic.error();
      showAlert({ title: "Error", message: "Ocurrio un error", type: "error" });
    } finally {
      setProcessingStudent(null);
    }
  };

  const handleNavigate = () => {
    if (!nextStudent?.parada) return;
    const paradaData = paradas.find((p) => p.id === nextStudent.parada?.id);
    if (!paradaData) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${paradaData.latitud},${paradaData.longitud}&travelmode=driving`;
    Linking.openURL(url);
  };

  const handleIniciarRecorrido = async () => {
    if (!recorridoActual) return;
    haptic.heavy();
    setOptimizandoRuta(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setOptimizandoRuta(false);
        showAlert({ title: "Permisos necesarios", message: "Necesitas habilitar permisos de ubicación para iniciar el recorrido", type: "warning" });
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const ubicacionChoferLocal = { lat: location.coords.latitude, lng: location.coords.longitude };
      const ubicacionColegioLocal = await getUbicacionColegio();
      if (paradasVisibles.length > 0) {
        try {
          const resultado = await calcularRutaOptimizada(
            ubicacionChoferLocal, paradasVisibles, recorridoActual.tipo_ruta,
            { lat: ubicacionColegioLocal.latitud, lng: ubicacionColegioLocal.longitud },
          );
          if (resultado) {
            setParadas(resultado.paradasOptimizadas);
            setPolylineCoordinates(resultado.polylineCoordinates);
            await guardarPolylineRuta(recorridoActual.id, resultado.polylineCoordinates);
          }
        } catch (error) {
          console.error("Error optimizando ruta:", error);
        } finally {
          setOptimizandoRuta(false);
        }
      }
      const success = await iniciarRecorrido(recorridoActual.id);
      if (success) {
        setRouteActive(true);
        haptic.success();
        inicializarEstadosGeocercas(recorridoActual.id, profile?.id || "")
          .catch((err) => console.warn("Error inicializando geocercas:", err));
      } else {
        haptic.error();
        showAlert({ title: "Error", message: "No se pudo iniciar el recorrido", type: "error" });
      }
    } catch {
      haptic.error();
      showAlert({ title: "Error", message: "Ocurrió un error al iniciar el recorrido", type: "error" });
    }
  };

  const handleFinalizarRecorrido = async () => {
    if (!recorridoActual) return;
    showAlert({ title: "Finalizar Recorrido", message: "¿Estás seguro de que deseas finalizar el recorrido?", type: "warning", buttons: [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar", style: "destructive",
        onPress: async () => {
          haptic.heavy();
          const success = await finalizarRecorrido(recorridoActual.id);
          if (success) { setRouteActive(false); haptic.success(); }
          else { haptic.error(); showAlert({ title: "Error", message: "No se pudo finalizar el recorrido", type: "error" }); }
        },
      },
    ] });
  };

  // ── Derived for bottom card ────────────────────────────────────────────────
  const estaEnGeocerca = !!(routeActive && dentroDeZona && estudianteGeocerca);
  // Panel estudiante → solo cuando estamos en la geocerca de su parada
  const hayEstudianteActivo = routeActive && estaEnGeocerca;
  // Estado intermedio → hay siguiente parada pero aún no llegamos a su geocerca
  const hayCaminoASiguiente = routeActive && !estaEnGeocerca && !!nextStudent;

  const estudianteActivoNombre = estaEnGeocerca
    ? estudianteGeocerca?.nombreCompleto
    : nextStudent ? `${nextStudent.nombre} ${nextStudent.apellido}` : undefined;
  const estudianteActivoDireccion = estaEnGeocerca
    ? estudianteGeocerca?.parada_nombre
    : nextStudent?.parada
      ? (paradas.find((p) => p.id === nextStudent.parada?.id)?.direccion || nextStudent.parada.nombre)
      : undefined;
  const estudianteActivoId = estaEnGeocerca
    ? estudianteGeocerca?.id_estudiante
    : nextStudent?.id;

  // ── Render ─────────────────────────────────────────────────────────────────
  // Nav bar: bottom=7, altura ≈ 87px. Card flota sobre ella con gap garantizado.
  const BOTTOM_CARD_BOTTOM = Math.max(insets.bottom + 88, 98);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* ── CAPA 0: Mapa — fondo absoluto fullscreen ── */}
      <View style={StyleSheet.absoluteFillObject}>
        <RouteMap
          paradas={paradasVisibles}
          ubicacionBus={ubicacionBus}
          recorridoActivo={routeActive}
          polylineCoordinates={routeActive ? polylineRestante : undefined}
          ubicacionColegio={ubicacionColegio}
          mostrarUbicacionChofer={true}
          ubicacionChofer={ubicacionChofer}
          showsUserLocation={false}
        />
      </View>

      {/* ── CAPA 1: Header (tiene fondo propio via LinearGradient) ── */}
      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <DashboardHeader
          title="PANEL DE CHOFER"
          subtitle={recorridoActual?.nombre_ruta || "Panel de Chofer"}
          icon={Bus}
          rightBadge={
            routeActive
              ? { text: "EN CURSO", bgColor: "rgba(255,255,255,0.25)", textColor: "#ffffff" }
              : null
          }
        />
        {/* "Salió X:XX" — en el espacio paddingBottom del header */}
        {routeActive && horaInicioRecorrido && (
          <View style={{ position: "absolute", bottom: 14, left: 24 }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "500" }}>
              Salió {formatHoraEC(horaInicioRecorrido)}
            </Text>
          </View>
        )}
      </View>

      {/* ── CAPA 2: Pills flotando sobre el mapa, debajo del header ── */}
      {routeActive && (
        <View
          style={{
            position: "absolute",
            top: headerHeight + 8,
            left: 16,
            zIndex: 10,
          }}
        >
          {/* Pill: RECOGIDOS */}
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.97)",
            borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 9,
            gap: 7,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
          }}>
            <CheckCircle2 size={16} color="#10B981" strokeWidth={2.5} />
            <Text style={{ color: "#1F2937", fontWeight: "700", fontSize: 13 }}>
              {stats.completed}/{stats.total} RECOGIDOS
            </Text>
          </View>

          {/* Pill: ETA FINAL */}
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.97)",
            borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 9,
            gap: 7, marginTop: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
          }}>
            <Clock size={16} color="#10B981" strokeWidth={2.5} />
            <Text style={{ color: "#1F2937", fontWeight: "700", fontSize: 13 }}>
              {etaFinRuta !== null ? `ETA FINAL: ${etaFinRuta} MIN` : "ETA FINAL: —"}
            </Text>
          </View>
        </View>
      )}

      {/* ── CAPA 3: GPS dot — sobre el mapa ── */}
      {routeActive && tracking && (
        <View style={{
          position: "absolute",
          top: headerHeight + 12,
          right: 12,
          zIndex: 10,
          flexDirection: "row", alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.92)",
          borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
          shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981", marginRight: 5 }} />
          <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "600" }}>GPS activo</Text>
        </View>
      )}

      {/* ── CAPA 4: Bottom card — mismo estilo glass que BottomNavigation ── */}
      <View style={{
        position: "absolute",
        left: 30, right: 30, bottom: BOTTOM_CARD_BOTTOM,
        borderRadius: 28,
        shadowColor: Colors.tecnibus[800],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 14,
        zIndex: 5,
      }}>
        <LinearGradient
          colors={["rgba(235, 248, 255, 0.95)", "rgba(244, 250, 253, 0.97)", "rgba(255, 255, 255, 0.93)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(209, 235, 247, 0.6)",
            paddingHorizontal: 18,
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          {/* Inner highlight — igual que BottomNavigation */}
          <View style={{
            position: "absolute", top: 1, left: 20, right: 20,
            height: 1, backgroundColor: "rgba(255, 255, 255, 0.8)", borderRadius: 1,
          }} />

        {/* STATE: Ruta completada */}
        {rutaCompletada && (
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <CheckCircle2 size={30} color="#10B981" strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#1F2937" }}>¡Ruta Completada!</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 3 }}>
              Todos los estudiantes llegaron al colegio.
            </Text>
            {horaLlegadaColegio && (
              <View style={{ marginTop: 10, backgroundColor: "#D1FAE5", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 20, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#059669" }}>Llegada al colegio</Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#065F46", marginTop: 1 }}>{horaLlegadaColegio}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { setRutaCompletada(false); setHoraLlegadaColegio(null); setPolylineCoordinates([]); }}
              activeOpacity={0.8}
              style={{ marginTop: 14, backgroundColor: Colors.tecnibus[600], borderRadius: 14, paddingVertical: 14, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Bus size={16} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATE: Loading recorridos */}
        {!rutaCompletada && loadingRecorridos && (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <ActivityIndicator size="small" color={Colors.tecnibus[600]} />
            <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 14 }}>Cargando recorridos...</Text>
          </View>
        )}

        {/* STATE: Sin recorridos */}
        {!rutaCompletada && !loadingRecorridos && recorridos.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Bus size={32} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 15, fontWeight: "600" }}>No hay recorridos hoy</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>Contacta al administrador</Text>
          </View>
        )}

        {/* STATE: Recorrido activo — próximo estudiante */}
        {!rutaCompletada && !loadingRecorridos && recorridos.length > 0 && hayEstudianteActivo && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1, marginRight: 12 }}>
                <MapPin size={20} color={Colors.tecnibus[600]} strokeWidth={2} style={{ marginTop: 3, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" }}>
                    Llegando a:
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#1F2937", lineHeight: 24, marginTop: 1 }} numberOfLines={1}>
                    {estudianteActivoNombre || "—"}
                  </Text>
                  {estudianteActivoDireccion ? (
                    <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>
                      {estudianteActivoDireccion}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={{ alignItems: "flex-end", minWidth: 56 }}>
                {etaProximaParada !== null ? (
                  <>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.tecnibus[600] }}>
                      ~{etaProximaParada} min
                    </Text>
                    <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.5 }}>
                      LLEGADA
                    </Text>
                  </>
                ) : estaEnGeocerca ? (
                  <>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#10B981" }}>¡Ya!</Text>
                    <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700" }}>LLEGASTE</Text>
                  </>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleMarcarAusenteGeocerca}
              disabled={!!processingStudent}
              activeOpacity={0.8}
              style={{
                marginTop: 14,
                borderWidth: 1.5, borderColor: "#EF4444", borderRadius: 14,
                paddingVertical: 13, flexDirection: "row", alignItems: "center",
                justifyContent: "center", gap: 8,
                opacity: processingStudent ? 0.55 : 1,
              }}
            >
              {processingStudent === estudianteActivoId ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <UserX size={15} color="#EF4444" strokeWidth={2.5} />
                  <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13, letterSpacing: 0.8 }}>
                    MARCAR AUSENCIA
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STATE: En camino a la siguiente parada (fuera de geocerca) */}
        {!rutaCompletada && !loadingRecorridos && recorridos.length > 0 && hayCaminoASiguiente && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: Colors.tecnibus[50],
              alignItems: "center", justifyContent: "center",
            }}>
              <MapPin size={22} color={Colors.tecnibus[600]} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" }}>
                En camino a
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#1F2937" }} numberOfLines={1}>
                {nextStudent ? `${nextStudent.nombre} ${nextStudent.apellido}` : "—"}
              </Text>
              {nextStudent?.parada && (
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }} numberOfLines={1}>
                  {paradas.find((p) => p.id === nextStudent.parada?.id)?.direccion || nextStudent.parada.nombre}
                </Text>
              )}
            </View>
            {etaProximaParada !== null && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.tecnibus[600] }}>
                  ~{etaProximaParada} min
                </Text>
                <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.5 }}>
                  LLEGADA
                </Text>
              </View>
            )}
          </View>
        )}

        {/* STATE: En camino al colegio */}
        {!rutaCompletada && !loadingRecorridos && recorridos.length > 0 && enCaminoAlColegio && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.tecnibus[100], alignItems: "center", justifyContent: "center" }}>
              <Bus size={24} color={Colors.tecnibus[600]} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#1F2937" }}>En camino al colegio</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>Todos los estudiantes recogidos</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>La ruta finaliza automáticamente al llegar</Text>
            </View>
            {etaFinRuta !== null && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.tecnibus[600] }}>~{etaFinRuta} min</Text>
                <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700" }}>AL COLEGIO</Text>
              </View>
            )}
          </View>
        )}

        {/* STATE: Pre-recorrido */}
        {!rutaCompletada && !loadingRecorridos && recorridos.length > 0 && !routeActive && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.tecnibus[100], alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Bus size={22} color={Colors.tecnibus[600]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 }}>
                  Tu ruta:
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#1F2937" }} numberOfLines={1}>
                  {recorridoActual?.nombre_ruta || "Sin recorrido"}
                </Text>
                <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                  {recorridoActual ? `${recorridoActual.hora_inicio} - ${recorridoActual.hora_fin}` : ""}
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.tecnibus[500]} />
              ) : (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: "rgba(209, 235, 247, 0.5)",
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.tecnibus[600] }}>{estudiantes.length}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.tecnibus[500] }}> estudiantes</Text>
                </View>
              )}
            </View>

            {recorridoActual && (
              <TouchableOpacity
                onPress={handleIniciarRecorrido}
                activeOpacity={0.8}
                style={{
                  backgroundColor: Colors.tecnibus[600], borderRadius: 16,
                  paddingVertical: 16, flexDirection: "row", alignItems: "center",
                  justifyContent: "center", gap: 10,
                  shadowColor: Colors.tecnibus[600],
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
                }}
              >
                <Play size={18} color="#ffffff" strokeWidth={2.5} fill="#ffffff" />
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 }}>
                  Iniciar Recorrido
                </Text>
              </TouchableOpacity>
            )}

            {recorridos.length > 1 && (
              <TouchableOpacity
                onPress={() => setShowRecorridoSelector(true)}
                activeOpacity={0.7}
                style={{ marginTop: 10, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13, color: Colors.tecnibus[600], fontWeight: "600" }}>
                  Cambiar recorrido
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        </LinearGradient>
      </View>

      {/* ── Modals ── */}
      <RecorridoSelector
        visible={showRecorridoSelector}
        recorridos={recorridos}
        selectedId={recorridoActual?.id}
        onSelect={(rec) => { haptic.light(); setRecorridoActual(rec); setShowRecorridoSelector(false); }}
        onClose={() => setShowRecorridoSelector(false)}
      />

      {/* GPS error */}
      {errorGPS && (
        <View style={{
          position: "absolute", bottom: BOTTOM_CARD_BOTTOM + 60, left: 16, right: 16,
          backgroundColor: "#EF4444", padding: 12, borderRadius: 16, zIndex: 20,
        }}>
          <Text style={{ color: "#ffffff", fontSize: 13, textAlign: "center", fontWeight: "600" }}>
            {errorGPS}
          </Text>
        </View>
      )}

      {/* Overlay: Optimizando ruta */}
      {optimizandoRuta && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center", alignItems: "center", zIndex: 999,
        }}>
          <View style={{ backgroundColor: "#ffffff", borderRadius: 20, padding: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#1F2937", marginTop: 16 }}>
              Optimizando ruta...
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
              Calculando mejor recorrido{"\n"}con Google Maps
            </Text>
          </View>
        </View>
      )}

      {/* ── Bottom navigation — ya flotante via BottomNavigation ── */}
      <BottomNavigation
        activeTab="home"
        onHomePress={() => {}}
        onMiddlePress={() => router.push("/driver/chat")}
        onSettingsPress={() => router.push("/driver/settings")}
      />
    </View>
  );
}
