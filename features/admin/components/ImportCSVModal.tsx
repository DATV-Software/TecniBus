import { Colors } from "@/lib/constants/colors";
import { EntityType, ImportResumen, importarTextoCSV } from "@/lib/services/admin/import.service";
import { parseCSV, validarFilaEntidad } from "@/lib/utils/csvParser";
import { haptic } from "@/lib/utils/haptics";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  FileText,
  KeyRound,
  Upload,
  X,
  XCircle,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface EntityConfig {
  label: string;
  ejemplo: string;
  autoPassword?: boolean;
}

const ENTIDADES: Record<EntityType, EntityConfig> = {
  padres: {
    label: "Representantes",
    ejemplo: "nombre,apellido,correo,contraseña\nJuan,Pérez,juan@mail.com,Pass123\nMaría,Torres,maria@mail.com,",
    autoPassword: true,
  },
  conductores: {
    label: "Conductores",
    ejemplo: "nombre,apellido,correo,contraseña\nPedro,Ruiz,pedro@mail.com,Pass123\nLuis,Gómez,luis@mail.com,",
    autoPassword: true,
  },
  estudiantes: {
    label: "Estudiantes",
    ejemplo: "nombre,apellido,parada\nLuisa,Pérez,Av. Principal\nCarlos,Torres,Calle 5",
  },
  buses: {
    label: "Buses",
    ejemplo: "placa,capacidad\nABC-1234,40\nXYZ-5678,35",
  },
};

interface ImportCSVModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: EntityType;
  onSuccess: () => void;
  onToast: (message: string, type: "success" | "error" | "warning") => void;
}

export function ImportCSVModal({
  visible,
  onClose,
  entityType,
  onSuccess,
  onToast,
}: ImportCSVModalProps) {
  const [archivo, setArchivo] = useState<{
    nombre: string;
    filas: number;
    contenido: string;
  } | null>(null);
  const [importando, setImportando] = useState(false);
  const [resumen, setResumen] = useState<ImportResumen | null>(null);

  const cfg = ENTIDADES[entityType];

  const handleSeleccionarArchivo = async () => {
    haptic.light();
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    // Validar extensión CSV (el MIME type varía según plataforma/app)
    const nombre = asset.name.toLowerCase();
    if (!nombre.endsWith(".csv") && !nombre.endsWith(".txt")) {
      onToast("Por favor selecciona un archivo .csv", "error");
      return;
    }

    try {
      const file = new File(asset.uri);
      const texto = await file.text();

      const parsed = parseCSV(texto);
      if (parsed.error) {
        onToast(`Error al leer CSV: ${parsed.error}`, "error");
        return;
      }

      const validacion = validarFilaEntidad(parsed.headers, entityType);
      if (!validacion.valido) {
        onToast(
          `Columnas faltantes: ${validacion.faltantes.join(", ")}`,
          "error",
        );
        return;
      }

      setArchivo({
        nombre: asset.name,
        filas: parsed.rows.length,
        contenido: texto,
      });
      setResumen(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Error leyendo archivo: ${msg}`, "error");
    }
  };

  const handleImportar = async () => {
    if (!archivo) return;
    haptic.medium();
    setImportando(true);

    const parsed = parseCSV(archivo.contenido);
    const result = await importarTextoCSV(parsed.rows, entityType);

    setImportando(false);

    if (!result.success) {
      onToast(result.error ?? "Error de importación", "error");
      return;
    }

    haptic.success();
    setResumen(result.resumen ?? null);
    onSuccess();
  };

  const handleCerrar = () => {
    setArchivo(null);
    setResumen(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCerrar}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "90%",
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: "#E5E7EB",
              borderRadius: 2,
              alignSelf: "center",
              marginTop: 12,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>
                Importar {cfg.label}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                Cargar datos desde archivo CSV
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCerrar}
              style={{
                backgroundColor: "#F3F4F6",
                padding: 8,
                borderRadius: 10,
              }}
            >
              <X size={20} color="#374151" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Info columnas */}
            <View
              style={{
                backgroundColor: Colors.tecnibus[50],
                borderWidth: 1,
                borderColor: Colors.tecnibus[200],
                borderRadius: 12,
                padding: 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <FileText size={14} color={Colors.tecnibus[600]} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.tecnibus[700] }}>
                  Formato del CSV
                </Text>
              </View>
              <View style={{ backgroundColor: "#F3F4F6", borderRadius: 8, padding: 10 }}>
                <Text style={{ fontFamily: "monospace", fontSize: 11, color: "#374151", lineHeight: 18 }}>
                  {cfg.ejemplo}
                </Text>
              </View>
              {cfg.autoPassword && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <KeyRound size={12} color={Colors.tecnibus[500]} />
                  <Text style={{ fontSize: 11, color: Colors.tecnibus[600], flex: 1 }}>
                    Si omites la contraseña se genera automáticamente y se muestra al finalizar la importación.
                  </Text>
                </View>
              )}
            </View>

            {/* Selector de archivo */}
            <TouchableOpacity
              onPress={handleSeleccionarArchivo}
              style={{
                borderWidth: 2,
                borderColor: archivo
                  ? Colors.tecnibus[400]
                  : Colors.tecnibus[200],
                borderStyle: "dashed",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                gap: 8,
                backgroundColor: archivo
                  ? Colors.tecnibus[50]
                  : "#FAFAFA",
              }}
            >
              <View
                style={{
                  backgroundColor: archivo
                    ? Colors.tecnibus[100]
                    : "#F3F4F6",
                  padding: 12,
                  borderRadius: 24,
                }}
              >
                <Upload
                  size={24}
                  color={archivo ? Colors.tecnibus[600] : "#9CA3AF"}
                />
              </View>
              {archivo ? (
                <>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: Colors.tecnibus[700],
                    }}
                  >
                    {archivo.nombre}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    {archivo.filas} fila{archivo.filas !== 1 ? "s" : ""} detectada
                    {archivo.filas !== 1 ? "s" : ""}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.tecnibus[600],
                      fontWeight: "500",
                    }}
                  >
                    Toca para cambiar archivo
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Seleccionar archivo CSV
                  </Text>
                  <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
                    Toca para explorar archivos
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Botón importar */}
            {archivo && !resumen && (
              <TouchableOpacity
                onPress={handleImportar}
                disabled={importando}
                style={{
                  backgroundColor: importando
                    ? "#D1D5DB"
                    : Colors.tecnibus[600],
                  borderRadius: 12,
                  paddingVertical: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {importando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Upload size={18} color="#fff" />
                )}
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {importando
                    ? "Importando..."
                    : `Importar ${cfg.label}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Resultado */}
            {resumen && (
              <View
                style={{
                  backgroundColor: "#F0FDF4",
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
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#065F46",
                    }}
                  >
                    Importación completada
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    { label: "Total", value: resumen.total, color: "#6B7280" },
                    {
                      label: "Insertados",
                      value: resumen.insertados,
                      color: "#10B981",
                    },
                    {
                      label: "Errores",
                      value: resumen.errores,
                      color: "#EF4444",
                    },
                  ].map((s) => (
                    <View
                      key={s.label}
                      style={{
                        flex: 1,
                        backgroundColor: "#fff",
                        borderRadius: 10,
                        padding: 10,
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "800",
                          color: s.color,
                        }}
                      >
                        {s.value}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6B7280" }}>
                        {s.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {resumen.detalles_errores.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <AlertCircle size={13} color="#EF4444" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#DC2626",
                        }}
                      >
                        Errores por fila
                      </Text>
                    </View>
                    {resumen.detalles_errores.slice(0, 5).map((e, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          gap: 6,
                          backgroundColor: "#FEF2F2",
                          borderRadius: 8,
                          padding: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <XCircle size={13} color="#EF4444" style={{ marginTop: 1 }} />
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "#7F1D1D",
                          }}
                        >
                          <Text style={{ fontWeight: "600" }}>
                            Fila {e.row}:
                          </Text>{" "}
                          {e.error}
                        </Text>
                      </View>
                    ))}
                    {resumen.detalles_errores.length > 5 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6B7280",
                          textAlign: "center",
                        }}
                      >
                        ... y {resumen.detalles_errores.length - 5} error(es) más.
                      </Text>
                    )}
                  </View>
                )}

                {/* Credenciales autogeneradas */}
                {resumen.credenciales_generadas?.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <KeyRound size={13} color={Colors.tecnibus[600]} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.tecnibus[700] }}>
                        Contraseñas generadas automáticamente
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
                      Anota estas credenciales antes de cerrar, no se volverán a mostrar.
                    </Text>
                    {resumen.credenciales_generadas.map((c, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor: Colors.tecnibus[50],
                          borderWidth: 1,
                          borderColor: Colors.tecnibus[200],
                          borderRadius: 8,
                          padding: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1F2937" }}>
                            {c.nombre}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#6B7280" }}>{c.correo}</Text>
                          <Text style={{ fontSize: 12, color: Colors.tecnibus[700], fontFamily: "monospace", marginTop: 2 }}>
                            {c.password}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => Clipboard.setString(c.password)}
                          style={{ padding: 6, backgroundColor: Colors.tecnibus[100], borderRadius: 8 }}
                        >
                          <Copy size={14} color={Colors.tecnibus[600]} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleCerrar}
                  style={{
                    backgroundColor: Colors.tecnibus[600],
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    Listo
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
