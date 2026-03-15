import { Colors } from "@/lib/constants/colors";
import type { RecorridoChofer } from "@/lib/services/asignaciones.service";
import type { EstadoRecorridoRun } from "@/lib/hooks/useDriverRecorrido";
import { CheckCircle2, Clock, X } from "lucide-react-native";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

interface RecorridoSelectorProps {
  visible: boolean;
  recorridos: RecorridoChofer[];
  estadosRecorridos: Record<string, EstadoRecorridoRun>;
  selectedId?: string;
  onSelect: (recorrido: RecorridoChofer) => void;
  onClose: () => void;
}

function DirectionBadge({ tipo }: { tipo: 'ida' | 'vuelta' }) {
  const isIda = tipo === 'ida';
  return (
    <View
      style={{
        backgroundColor: isIda ? "#EEF2FF" : "#FFF7ED",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
        marginTop: 3,
      }}
    >
      <Text style={{ fontSize: 10, color: isIda ? "#6366F1" : "#F97316", fontWeight: "700" }}>
        {isIda ? "IDA" : "VUELTA"}
      </Text>
    </View>
  );
}

function StatusBadge({ estado }: { estado: EstadoRecorridoRun }) {
  if (estado === 'activo') {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "#D1FAE5",
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#065F46" }}>EN CURSO</Text>
      </View>
    );
  }
  if (estado === 'completado') {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "#E5E7EB",
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <CheckCircle2 size={12} color="#6B7280" strokeWidth={2.5} />
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280" }}>COMPLETADO</Text>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FEF3C7",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Clock size={12} color="#D97706" strokeWidth={2.5} />
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400E" }}>PENDIENTE</Text>
    </View>
  );
}

export function RecorridoSelector({
  visible,
  recorridos,
  estadosRecorridos,
  selectedId,
  onSelect,
  onClose,
}: RecorridoSelectorProps) {
  // Sort by hora_inicio ascending
  const sorted = [...recorridos].sort((a, b) =>
    a.hora_inicio.localeCompare(b.hora_inicio)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "65%" }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <View>
              <Text
                className="font-bold font-calsans"
                style={{ fontSize: 18, color: Colors.tecnibus[800] }}
              >
                Cambiar Recorrido
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                {recorridos.length} recorrido(s) para hoy
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                backgroundColor: "#F3F4F6",
                padding: 8,
                borderRadius: 999,
              }}
            >
              <X size={20} color="#6B7280" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedId === item.id;
              const estado = estadosRecorridos[item.id] ?? 'pendiente';
              const completado = estado === 'completado';
              return (
                <TouchableOpacity
                  onPress={() => !completado && onSelect(item)}
                  activeOpacity={completado ? 1 : 0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: isSelected
                      ? Colors.tecnibus[50]
                      : "#ffffff",
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                    opacity: completado ? 0.6 : 1,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: isSelected ? Colors.tecnibus[800] : "#374151",
                        }}
                        numberOfLines={1}
                      >
                        {item.nombre_ruta}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                        marginTop: 2,
                      }}
                    >
                      {item.hora_inicio} - {item.hora_fin}
                      {item.descripcion ? ` · ${item.descripcion}` : ""}
                    </Text>
                    <DirectionBadge tipo={item.tipo_ruta} />
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6, marginLeft: 10 }}>
                    <StatusBadge estado={estado} />
                    {isSelected && !completado && (
                      <View
                        style={{
                          backgroundColor: Colors.tecnibus[600],
                          padding: 4,
                          borderRadius: 999,
                        }}
                      >
                        <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.5} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
