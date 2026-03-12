import { Colors } from "@/lib/constants/colors";
import { EntityType, ImportResumen, importarTextoCSV } from "@/lib/services/import.service";
import { parseCSV, validarFilaEntidad } from "@/lib/utils/csvParser";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  FileText,
  Upload,
  Users,
  XCircle,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/AlertBox/useAlert";

interface EntityConfig {
  label: string;
  columnas: string;
  ejemplo: string;
}

const ENTIDADES: Record<EntityType, EntityConfig> = {
  padres: {
    label: "Padres",
    columnas: "email, nombre, apellido, domicilio, tipo_representante",
    ejemplo: "email,nombre,apellido\njuan@mail.com,Juan,Pérez\nana@mail.com,Ana,Torres",
  },
  conductores: {
    label: "Conductores",
    columnas: "email, nombre, apellido, cedula, licencia",
    ejemplo: "email,nombre,apellido,cedula,licencia\nchofer@mail.com,Pedro,Ruiz,0912345678,B",
  },
  estudiantes: {
    label: "Estudiantes",
    columnas: "nombre, apellido, id_padre, id_ruta, id_parada",
    ejemplo: "nombre,apellido,id_padre\nLuisa,Pérez,uuid-del-padre",
  },
  buses: {
    label: "Buses",
    columnas: "placa, capacidad",
    ejemplo: "placa,capacidad\nABC-1234,40\nXYZ-5678,35",
  },
};

export default function ImportarScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [entidad, setEntidad] = useState<EntityType>("padres");
  const [csvText, setCsvText] = useState("");
  const [importando, setImportando] = useState(false);
  const [resumen, setResumen] = useState<ImportResumen | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; count: number } | null>(null);

  const handleTextChange = (text: string) => {
    setCsvText(text);
    setResumen(null);
    setPreview(null);

    if (text.trim().length > 0) {
      const parsed = parseCSV(text);
      if (!parsed.error && parsed.rows.length > 0) {
        setPreview({ headers: parsed.headers, count: parsed.rows.length });
      } else {
        setPreview(null);
      }
    }
  };

  const handleImportar = async () => {
    if (!csvText.trim()) {
      showAlert({ title: "CSV vacío", message: "Pega el contenido CSV antes de importar.", type: "warning" });
      return;
    }

    const parsed = parseCSV(csvText);

    if (parsed.error) {
      showAlert({ title: "Error al parsear", message: parsed.error, type: "error" });
      return;
    }

    const validacion = validarFilaEntidad(parsed.headers, entidad);
    if (!validacion.valido) {
      showAlert({ title: "Columnas faltantes", message: `Faltan columnas requeridas: ${validacion.faltantes.join(", ")}`, type: "info" });
      return;
    }

    if (parsed.rows.length === 0) {
      showAlert({ title: "Sin datos", message: "El CSV no contiene filas de datos.", type: "warning" });
      return;
    }

    haptic.light();
    setImportando(true);
    setResumen(null);

    const result = await importarTextoCSV(parsed.rows, entidad);

    setImportando(false);

    if (!result.success) {
      showAlert({ title: "Error de importación", message: result.error ?? "Error desconocido.", type: "error" });
      return;
    }

    haptic.success();
    setResumen(result.resumen ?? null);
  };

  const handleLimpiar = () => {
    setCsvText("");
    setPreview(null);
    setResumen(null);
  };

  const cfg = ENTIDADES[entidad];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar backgroundColor={Colors.tecnibus[600]} barStyle="light-content" />

      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.tecnibus[600],
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            Importación Masiva
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
            Cargar datos desde CSV
          </Text>
        </View>
        <Upload size={24} color="rgba(255,255,255,0.7)" />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
      >
        {/* Selector tipo entidad */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Users size={16} color={Colors.tecnibus[600]} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Tipo de entidad
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(ENTIDADES) as EntityType[]).map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  setEntidad(key);
                  setPreview(null);
                  setResumen(null);
                }}
                style={{
                  backgroundColor: entidad === key ? Colors.tecnibus[600] : Colors.tecnibus[50],
                  borderWidth: 1,
                  borderColor: entidad === key ? Colors.tecnibus[600] : Colors.tecnibus[200],
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    color: entidad === key ? "#FFFFFF" : Colors.tecnibus[700],
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {ENTIDADES[key].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Columnas requeridas */}
        <View
          style={{
            backgroundColor: Colors.tecnibus[50],
            borderWidth: 1,
            borderColor: Colors.tecnibus[200],
            borderRadius: 12,
            padding: 14,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <FileText size={14} color={Colors.tecnibus[600]} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.tecnibus[700] }}>
              Columnas para {cfg.label}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: Colors.tecnibus[800] }}>{cfg.columnas}</Text>
          <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            Ejemplo:
          </Text>
          <View
            style={{
              backgroundColor: "#F3F4F6",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <Text style={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 11, color: "#374151" }}>
              {cfg.ejemplo}
            </Text>
          </View>
        </View>

        {/* Input CSV */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Contenido CSV
            </Text>
            {csvText.length > 0 && (
              <TouchableOpacity onPress={handleLimpiar}>
                <Text style={{ fontSize: 13, color: Colors.tecnibus[600], fontWeight: "500" }}>
                  Limpiar
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: preview ? "#10B981" : "#E5E7EB",
              borderRadius: 10,
              padding: 12,
              fontSize: 13,
              color: "#1F2937",
              minHeight: 160,
              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
              textAlignVertical: "top",
            }}
            placeholder={`Pega aquí el CSV para ${cfg.label}...\n\nEjemplo:\n${cfg.ejemplo}`}
            placeholderTextColor="#9CA3AF"
            value={csvText}
            onChangeText={handleTextChange}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />

          {/* Preview info */}
          {preview && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#F0FDF4",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <CheckCircle size={16} color="#10B981" />
              <Text style={{ flex: 1, fontSize: 13, color: "#065F46" }}>
                {preview.count} fila{preview.count !== 1 ? "s" : ""} detectada{preview.count !== 1 ? "s" : ""} · {preview.headers.join(", ")}
              </Text>
            </View>
          )}
        </View>

        {/* Botón importar */}
        <TouchableOpacity
          onPress={handleImportar}
          disabled={importando || !csvText.trim()}
          style={{
            backgroundColor:
              importando || !csvText.trim() ? "#D1D5DB" : Colors.tecnibus[600],
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {importando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Upload size={20} color="#FFFFFF" />
          )}
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            {importando ? "Importando..." : `Importar ${cfg.label}`}
          </Text>
        </TouchableOpacity>

        {/* Resumen de resultado */}
        {resumen && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1F2937" }}>
                Importación completada
              </Text>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <ResumenBox label="Total" value={resumen.total} color="#6B7280" />
              <ResumenBox label="Insertados" value={resumen.insertados} color="#10B981" />
              <ResumenBox label="Errores" value={resumen.errores} color="#EF4444" />
            </View>

            {/* Tabla de errores */}
            {resumen.detalles_errores.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} color="#EF4444" />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#DC2626" }}>
                    Errores por fila
                  </Text>
                </View>
                {resumen.detalles_errores.slice(0, 10).map((e, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 8,
                      padding: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <XCircle size={14} color="#EF4444" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 12, color: "#7F1D1D" }}>
                      <Text style={{ fontWeight: "600" }}>Fila {e.row}:</Text> {e.error}
                    </Text>
                  </View>
                ))}
                {resumen.detalles_errores.length > 10 && (
                  <Text style={{ fontSize: 12, color: "#6B7280", textAlign: "center" }}>
                    ... y {resumen.detalles_errores.length - 10} error(es) más.
                  </Text>
                )}
              </View>
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
          <Text style={{ flex: 1, color: "#9CA3AF", fontSize: 12, lineHeight: 18 }}>
            Máximo 1000 filas por importación. Para estudiantes, proporciona el UUID del padre obtenido desde la gestión de usuarios.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function ResumenBox({
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
        padding: 12,
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "800", color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#6B7280" }}>{label}</Text>
    </View>
  );
}
