import StatusBadge from "@/components/StatusBadge";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface AttendanceToggleCardProps {
  isAttending: boolean;
  marcadoPorChofer: boolean;
  processingAttendance: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function AttendanceToggleCard({
  isAttending,
  marcadoPorChofer,
  processingAttendance,
  onToggle,
  disabled = false,
}: AttendanceToggleCardProps) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Badge de estado */}
      <View className="flex-row items-center justify-end mb-4">
        <StatusBadge
          status={isAttending ? "attending" : "absent"}
          size="md"
        />
      </View>

      {/* Descripción del estado */}
      <Text className="text-gray-600 text-sm mb-4" style={{ lineHeight: 20 }}>
        {isAttending
          ? "El estudiante asistirá hoy y será recogido en el punto habitual."
          : marcadoPorChofer
          ? "⚠️ El chofer reportó que el estudiante no se presentó. Si fue un error, puede marcarlo como presente nuevamente."
          : "Has marcado que el estudiante no asistirá hoy. El chofer ha sido notificado."}
      </Text>

      {/* Botón de toggle */}
      <TouchableOpacity
        onPress={onToggle}
        disabled={disabled || processingAttendance}
        activeOpacity={0.7}
        style={{
          backgroundColor: disabled
            ? "#E5E7EB"
            : isAttending
            ? "#EF4444"
            : "#10B981",
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: disabled ? "transparent" : isAttending ? "#EF4444" : "#10B981",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: disabled ? 0 : 4,
        }}
      >
        {processingAttendance ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            {isAttending ? (
              <XCircle size={20} color="#ffffff" strokeWidth={2.5} />
            ) : (
              <CheckCircle2 size={20} color="#ffffff" strokeWidth={2.5} />
            )}
            <Text
              className="text-white font-bold ml-2"
              style={{ fontSize: 15 }}
            >
              {isAttending ? "Marcar como ausente" : "Marcar como presente"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {disabled && (
        <Text
          className="text-amber-600 text-xs mt-3 text-center"
          style={{ lineHeight: 16 }}
        >
          ⚠️ No se puede marcar asistencia sin una ruta asignada
        </Text>
      )}
    </View>
  );
}
