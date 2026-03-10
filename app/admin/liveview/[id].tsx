import RouteMap from "@/components/RouteMap";
import { Colors } from "@/lib/constants/colors";
import { getRutaActivaDetalle } from "@/lib/services/liveview.service";
import { getParadasByRuta, type Parada } from "@/lib/services/rutas.service";
import {
  getUltimaUbicacion,
  suscribirseAUbicaciones,
  type UbicacionActual,
} from "@/lib/services/ubicaciones.service";
import { getUbicacionColegio } from "@/lib/services/configuracion.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Bus,
  Clock,
  MapPin,
  Radio,
  User,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SubScreenHeader } from "@/features/admin";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

function formatHora(hora: string | null): string {
  if (!hora) return "—";
  if (hora.includes("T")) {
    return new Date(hora).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Guayaquil",
    });
  }
  const [h, m] = hora.split(":");
  const hNum = parseInt(h, 10);
  const suffix = hNum >= 12 ? "PM" : "AM";
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

export default function LiveViewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rutaNombre, setRutaNombre] = useState("");
  const [tipoRuta, setTipoRuta] = useState("");
  const [nombreChofer, setNombreChofer] = useState("");
  const [horaInicio, setHoraInicio] = useState<string | null>(null);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [polyline, setPolyline] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [ubicacionBus, setUbicacionBus] = useState<UbicacionActual | null>(
    null
  );
  const [ubicacionColegio, setUbicacionColegio] = useState<{
    latitud: number;
    longitud: number;
    nombre: string;
  } | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;

    async function init() {
      setLoading(true);
      try {
        const [detalle, colegio] = await Promise.all([
          getRutaActivaDetalle(id),
          getUbicacionColegio(),
        ]);

        if (!detalle) return;

        setRutaNombre(detalle.nombre_ruta);
        setTipoRuta(detalle.tipo_ruta);
        setNombreChofer(
          `${detalle.nombre_chofer} ${detalle.apellido_chofer}`.trim()
        );
        setHoraInicio(detalle.hora_inicio_recorrido);
        setUbicacionColegio(colegio);

        if (detalle.polyline_coordinates?.length) {
          setPolyline(detalle.polyline_coordinates);
        }

        // Cargar paradas
        const paradasData = await getParadasByRuta(detalle.id_ruta);
        setParadas(paradasData);

        // Cargar última ubicación conocida
        const ultima = await getUltimaUbicacion(id);
        if (ultima) setUbicacionBus(ultima);

        // Suscribirse a actualizaciones en tiempo real
        unsubRef.current = suscribirseAUbicaciones(id, (nueva) => {
          setUbicacionBus(nueva);
        });
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      unsubRef.current?.();
    };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.tecnibus[600]}
        />
        <SubScreenHeader
          title="LIVE VIEW"
          subtitle="Cargando ruta..."
          icon={Radio}
          onBack={() => router.back()}
        />
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          <Text style={{ color: "#9CA3AF", marginTop: 12, fontSize: 14 }}>
            Conectando en tiempo real...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Mapa fullscreen */}
      <View style={StyleSheet.absoluteFillObject}>
        <RouteMap
          paradas={paradas}
          ubicacionBus={ubicacionBus}
          recorridoActivo={true}
          polylineCoordinates={polyline.length ? polyline : undefined}
          ubicacionColegio={ubicacionColegio}
          mostrarUbicacionChofer={false}
          showsUserLocation={false}
        />
      </View>

      {/* Header sobre el mapa */}
      <SubScreenHeader
        title="LIVE VIEW"
        subtitle={rutaNombre}
        icon={Radio}
        onBack={() => router.back()}
      />

      {/* Info card flotante — encima del BottomNavigation (~90px) */}
      <View
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 108,
          backgroundColor: "rgba(255, 255, 255, 0.97)",
          borderRadius: 20,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 12,
          borderWidth: 1,
          borderColor: "rgba(209, 235, 247, 0.6)",
        }}
      >
        {/* Indicador en vivo */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 14,
            gap: 8,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#10B981",
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#10B981",
              letterSpacing: 0.8,
            }}
          >
            EN VIVO
          </Text>
          <View style={{ flex: 1 }} />
          <View
            style={{
              backgroundColor:
                tipoRuta === "ida"
                  ? Colors.tecnibus[100]
                  : "rgba(245, 158, 11, 0.15)",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: tipoRuta === "ida" ? Colors.tecnibus[700] : "#B45309",
              }}
            >
              {tipoRuta === "ida" ? "IDA" : "VUELTA"}
            </Text>
          </View>
        </View>

        {/* Datos de la ruta */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Colors.tecnibus[50],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={15} color={Colors.tecnibus[600]} strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>
                CONDUCTOR
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#1F2937" }}
              >
                {nombreChofer || "—"}
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "#F3F4F6",
              marginVertical: 2,
            }}
          />

          <View style={{ flexDirection: "row", gap: 20 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Clock size={14} color="#9CA3AF" strokeWidth={2} />
              <View>
                <Text
                  style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}
                >
                  INICIO
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#374151",
                  }}
                >
                  {formatHora(horaInicio)}
                </Text>
              </View>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <MapPin size={14} color="#9CA3AF" strokeWidth={2} />
              <View>
                <Text
                  style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}
                >
                  PARADAS
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#374151",
                  }}
                >
                  {paradas.length}
                </Text>
              </View>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Bus size={14} color="#9CA3AF" strokeWidth={2} />
              <View>
                <Text
                  style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}
                >
                  VELOCIDAD
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#374151",
                  }}
                >
                  {ubicacionBus?.velocidad
                    ? `${Math.round(ubicacionBus.velocidad)} km/h`
                    : "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <BottomNavigation
        activeTab="tracking"
        middleTab="tracking"
        onHomePress={() => router.push("/admin")}
        onMiddlePress={() => router.push("/admin/liveview")}
        onSettingsPress={() => router.push("/admin/settings")}
      />
    </View>
  );
}
