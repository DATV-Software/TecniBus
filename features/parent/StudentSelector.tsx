import { Colors } from "@/lib/constants/colors";
import { EstudianteDelPadre } from "@/lib/services/students/padres.service";
import { CheckCircle2, GraduationCap, X } from "lucide-react-native";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

interface StudentSelectorProps {
  visible: boolean;
  estudiantes: EstudianteDelPadre[];
  selectedId?: string;
  onSelect: (estudiante: EstudianteDelPadre) => void;
  onClose: () => void;
}

export function StudentSelector({
  visible,
  estudiantes,
  selectedId,
  onSelect,
  onClose,
}: StudentSelectorProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "60%" }}>
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
                Cambiar Estudiante
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                {estudiantes.length} estudiante(s) vinculado(s)
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

          {/* Lista de estudiantes */}
          <FlatList
            data={estudiantes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
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
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isSelected
                        ? Colors.tecnibus[100]
                        : "#F3F4F6",
                      padding: 10,
                      borderRadius: 999,
                      marginRight: 12,
                    }}
                  >
                    <GraduationCap
                      size={22}
                      color={
                        isSelected ? Colors.tecnibus[600] : "#9CA3AF"
                      }
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: isSelected
                          ? Colors.tecnibus[800]
                          : "#374151",
                      }}
                    >
                      {item.nombreCompleto}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#6B7280",
                        marginTop: 2,
                      }}
                    >
                      {item.parada?.ruta?.nombre || "Sin ruta asignada"}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={{
                        backgroundColor: Colors.tecnibus[600],
                        padding: 4,
                        borderRadius: 999,
                      }}
                    >
                      <CheckCircle2
                        size={18}
                        color="#ffffff"
                        strokeWidth={2.5}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
