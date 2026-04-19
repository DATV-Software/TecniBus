import { Colors } from "@/lib/constants/colors";
import {
  getRutasActivas,
  suscribirseARutasActivas,
  type RutaActiva,
} from "@/lib/services/admin/liveview.service";
import { haptic } from "@/lib/utils/haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Activity,
  Bus,
  ChevronRight,
  Clock,
  MapPin,
  Radio,
  User,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SubScreenHeader } from "@/features/admin";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

function formatHora(hora: string | null): string {
  if (!hora) return "—";
  // Si es ISO string
  if (hora.includes("T")) {
    return new Date(hora).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Guayaquil",
    });
  }
  // Si es TIME "HH:MM:SS"
  const [h, m] = hora.split(":");
  const hNum = parseInt(h, 10);
  const suffix = hNum >= 12 ? "PM" : "AM";
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

function TipoRutaBadge({ tipo }: { tipo: string }) {
  const isIda = tipo === "ida";
  return (
    <View
      style={{
        backgroundColor: isIda
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
          color: isIda ? Colors.tecnibus[700] : "#B45309",
          letterSpacing: 0.5,
        }}
      >
        {isIda ? "IDA" : "VUELTA"}
      </Text>
    </View>
  );
}

function RutaCard({
  ruta,
  onPress,
}: {
  ruta: RutaActiva;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(209, 235, 247, 0.6)",
      }}
    >
      {/* Fila 1: nombre ruta + badge tipo + flecha */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.tecnibus[50],
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Bus size={20} color={Colors.tecnibus[600]} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#1F2937",
            }}
            numberOfLines={1}
          >
            {ruta.nombre_ruta}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 3,
              gap: 4,
            }}
          >
            {/* Indicador verde activo */}
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: "#10B981",
              }}
            />
            <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "600" }}>
              EN CURSO
            </Text>
          </View>
        </View>
        <TipoRutaBadge tipo={ruta.tipo_ruta} />
        <ChevronRight
          size={18}
          color="#D1D5DB"
          strokeWidth={2.5}
          style={{ marginLeft: 8 }}
        />
      </View>

      {/* Fila 2: chofer + hora */}
      <View
        style={{
          flexDirection: "row",
          gap: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}
        >
          <User size={14} color="#9CA3AF" strokeWidth={2} />
          <Text style={{ fontSize: 13, color: "#6B7280" }} numberOfLines={1}>
            {ruta.nombre_chofer} {ruta.apellido_chofer}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Clock size={14} color="#9CA3AF" strokeWidth={2} />
          <Text style={{ fontSize: 13, color: "#6B7280" }}>
            Salió {formatHora(ruta.hora_inicio_recorrido)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LiveViewListScreen() {
  const router = useRouter();
  const [rutas, setRutas] = useState<RutaActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const cargar = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getRutasActivas();
      setRutas(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
      unsubRef.current = suscribirseARutasActivas(() => cargar());
      return () => {
        unsubRef.current?.();
      };
    }, [cargar])
  );

  const handlePress = (ruta: RutaActiva) => {
    haptic.light();
    router.push(`/admin/liveview/${ruta.id_asignacion}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.tecnibus[600]}
      />

      <SubScreenHeader
        title="LIVE VIEW"
        subtitle="Rutas en tiempo real"
        icon={Radio}
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => cargar(true)}
            colors={[Colors.tecnibus[600]]}
            tintColor={Colors.tecnibus[600]}
          />
        }
      >
        {/* Info bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#ffffff",
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            gap: 10,
            borderWidth: 1,
            borderColor: "rgba(209, 235, 247, 0.8)",
          }}
        >
          <Activity size={16} color={Colors.tecnibus[600]} strokeWidth={2} />
          <Text style={{ fontSize: 13, color: "#6B7280", flex: 1 }}>
            {loading
              ? "Buscando rutas activas..."
              : rutas.length === 0
              ? "No hay rutas activas en este momento"
              : `${rutas.length} ruta${rutas.length > 1 ? "s" : ""} activa${rutas.length > 1 ? "s" : ""} ahora mismo`}
          </Text>
          {!loading && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: rutas.length > 0 ? "#10B981" : "#D1D5DB",
              }}
            />
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
            <Text style={{ color: "#9CA3AF", marginTop: 12, fontSize: 14 }}>
              Cargando rutas activas...
            </Text>
          </View>
        )}

        {/* Empty state */}
        {!loading && rutas.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: Colors.tecnibus[50],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <MapPin size={32} color="#D1D5DB" strokeWidth={1.5} />
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}
            >
              Sin rutas activas
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#9CA3AF",
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Cuando un chofer inicie un recorrido{"\n"}aparecerá aquí en tiempo
              real
            </Text>
          </View>
        )}

        {/* Lista de rutas */}
        {!loading &&
          rutas.map((ruta) => (
            <RutaCard
              key={ruta.id_asignacion}
              ruta={ruta}
              onPress={() => handlePress(ruta)}
            />
          ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation
        activeTab="tracking"
        middleTab="tracking"
        onHomePress={() => router.push("/admin")}
        onMiddlePress={() => {}}
        onSettingsPress={() => router.push("/admin/settings")}
      />
    </View>
  );
}
