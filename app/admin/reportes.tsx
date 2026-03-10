import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { SubScreenHeader } from "@/features/admin";
import { Colors } from "@/lib/constants/colors";
import { useRefresh } from "@/lib/hooks/useRefresh";
import {
  EstadisticasReporte,
  generarReporteAsistencia,
} from "@/lib/services/reportes.service";
import { getRutas, Ruta } from "@/lib/services/rutas.service";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle,
  Download,
  Filter,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function labelDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const ESTADOS_FILTRO = [
  { label: "Todos", value: "" },
  { label: "A bordo", value: "abordo" },
  { label: "Dejado", value: "dejado" },
  { label: "Ausente", value: "ausente" },
  { label: "Pendiente", value: "pendiente" },
];

const PERIODOS = [
  { label: "Hoy", dias: 0 },
  { label: "7 días", dias: 7 },
  { label: "15 días", dias: 15 },
  { label: "30 días", dias: 30 },
];

export default function ReportesScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();

  const today = formatDate(new Date());
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [rutaId, setRutaId] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [generando, setGenerando] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticasReporte | null>(
    null,
  );
  const [urlReporte, setUrlReporte] = useState<string | null>(null);

  const { refreshing, onRefresh } = useRefresh(() => getRutas().then(setRutas));

  useEffect(() => {
    getRutas().then(setRutas);
  }, []);

  const aplicarPeriodo = (dias: number) => {
    const fin = new Date();
    const ini = new Date();
    if (dias > 0) ini.setDate(ini.getDate() - dias);
    setFechaInicio(formatDate(ini));
    setFechaFin(formatDate(fin));
    setEstadisticas(null);
    setUrlReporte(null);
  };

  const handleGenerar = async () => {
    if (fechaInicio > fechaFin) {
      showAlert({
        title: "Fechas inválidas",
        message: "La fecha de inicio no puede ser mayor a la fecha fin.",
        type: "warning",
      });
      return;
    }
    haptic.light();
    setGenerando(true);
    setEstadisticas(null);
    setUrlReporte(null);

    const result = await generarReporteAsistencia({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      id_ruta: rutaId || undefined,
      estado: estadoFiltro || undefined,
    });

    setGenerando(false);

    if (!result.success) {
      showAlert({
        title: "Error",
        message: result.error ?? "No se pudo generar el reporte.",
        type: "error",
      });
      return;
    }

    haptic.success();
    setEstadisticas(result.estadisticas ?? null);
    setUrlReporte(result.url ?? null);
  };

  const handleDescargar = async () => {
    if (!urlReporte) return;
    haptic.light();
    await WebBrowser.openBrowserAsync(urlReporte);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        backgroundColor={Colors.tecnibus[700]}
        barStyle="light-content"
        translucent={false}
      />

      <SubScreenHeader
        title="REPORTES"
        subtitle="Exportar asistencias"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.tecnibus[600]]}
            tintColor={Colors.tecnibus[600]}
          />
        }
      >
        {/* Acceso rápido a períodos */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
            Período rápido
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {PERIODOS.map((p) => (
              <TouchableOpacity
                key={p.label}
                onPress={() => aplicarPeriodo(p.dias)}
                style={{
                  backgroundColor: Colors.tecnibus[100],
                  borderWidth: 1,
                  borderColor: Colors.tecnibus[300],
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{
                    color: Colors.tecnibus[700],
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filtros de fecha */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Calendar size={16} color={Colors.tecnibus[600]} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Rango de fechas
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                DESDE
              </Text>
              <View
                style={{
                  backgroundColor: Colors.tecnibus[50],
                  borderWidth: 1,
                  borderColor: Colors.tecnibus[200],
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{ color: "#1F2937", fontSize: 15, fontWeight: "500" }}
                >
                  {labelDate(fechaInicio)}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                HASTA
              </Text>
              <View
                style={{
                  backgroundColor: Colors.tecnibus[50],
                  borderWidth: 1,
                  borderColor: Colors.tecnibus[200],
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{ color: "#1F2937", fontSize: 15, fontWeight: "500" }}
                >
                  {labelDate(fechaFin)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
            Usa los botones de período rápido para cambiar el rango.
          </Text>
        </View>

        {/* Filtro por ruta */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Filter size={16} color={Colors.tecnibus[600]} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Filtrar por ruta
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setRutaId("")}
              style={{
                backgroundColor:
                  rutaId === "" ? Colors.tecnibus[600] : Colors.tecnibus[50],
                borderWidth: 1,
                borderColor:
                  rutaId === "" ? Colors.tecnibus[600] : Colors.tecnibus[200],
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{
                  color: rutaId === "" ? "#FFFFFF" : Colors.tecnibus[700],
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {rutas.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setRutaId(r.id)}
                style={{
                  backgroundColor:
                    rutaId === r.id
                      ? Colors.tecnibus[600]
                      : Colors.tecnibus[50],
                  borderWidth: 1,
                  borderColor:
                    rutaId === r.id
                      ? Colors.tecnibus[600]
                      : Colors.tecnibus[200],
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{
                    color: rutaId === r.id ? "#FFFFFF" : Colors.tecnibus[700],
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {r.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filtro por estado */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
            Estado de asistencia
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ESTADOS_FILTRO.map((e) => (
              <TouchableOpacity
                key={e.value}
                onPress={() => setEstadoFiltro(e.value)}
                style={{
                  backgroundColor:
                    estadoFiltro === e.value
                      ? Colors.tecnibus[600]
                      : Colors.tecnibus[50],
                  borderWidth: 1,
                  borderColor:
                    estadoFiltro === e.value
                      ? Colors.tecnibus[600]
                      : Colors.tecnibus[200],
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{
                    color:
                      estadoFiltro === e.value
                        ? "#FFFFFF"
                        : Colors.tecnibus[700],
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón generar */}
        <TouchableOpacity
          onPress={handleGenerar}
          disabled={generando}
          style={{
            backgroundColor: generando ? "#D1D5DB" : Colors.tecnibus[600],
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {generando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <BarChart2 size={20} color="#FFFFFF" />
          )}
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            {generando ? "Generando reporte..." : "Generar Reporte PDF"}
          </Text>
        </TouchableOpacity>

        {/* Resultados */}
        {estadisticas && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              gap: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <CheckCircle size={18} color="#10B981" />
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: "#1F2937" }}
              >
                Reporte generado
              </Text>
            </View>

            {/* Stats grid */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatBox
                label="Total"
                value={estadisticas.total}
                color="#6B7280"
              />
              <StatBox
                label="Presentes"
                value={estadisticas.presentes}
                color="#10B981"
              />
              <StatBox
                label="Ausentes"
                value={estadisticas.ausentes}
                color="#EF4444"
              />
              <StatBox
                label="Pendientes"
                value={estadisticas.pendientes}
                color="#F59E0B"
              />
            </View>

            <View
              style={{
                backgroundColor: Colors.tecnibus[50],
                borderRadius: 10,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: Colors.tecnibus[800], fontSize: 13 }}>
                Porcentaje de asistencia
              </Text>
              <Text
                style={{
                  color: Colors.tecnibus[700],
                  fontSize: 28,
                  fontWeight: "800",
                }}
              >
                {estadisticas.porcentaje}%
              </Text>
            </View>

            {/* Botón descargar */}
            {urlReporte && (
              <TouchableOpacity
                onPress={handleDescargar}
                style={{
                  backgroundColor: "#10B981",
                  borderRadius: 12,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Download size={20} color="#FFFFFF" />
                <Text
                  style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
                >
                  Abrir / Descargar PDF
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Nota */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            paddingBottom: 16,
          }}
        >
          <AlertCircle size={14} color="#9CA3AF" style={{ marginTop: 2 }} />
          <Text
            style={{ flex: 1, color: "#9CA3AF", fontSize: 12, lineHeight: 18 }}
          >
            El PDF se genera en el servidor y está disponible por 10 minutos.
            Descárgalo antes de que expire el enlace.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 10,
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "800", color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: "#6B7280", textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}
