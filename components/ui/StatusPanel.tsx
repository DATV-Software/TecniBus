import { Colors } from "@/lib/constants/colors";
import { Text, TouchableOpacity, View } from "react-native";

interface StatusPanelProps {
  activeCount: number;
  totalCount: number;
  label: string;
  onLiveViewPress?: () => void;
}

export function StatusPanel({
  activeCount,
  totalCount,
  label,
  onLiveViewPress,
}: StatusPanelProps) {
  const progress = totalCount > 0 ? activeCount / totalCount : 0;

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1" style={{ marginRight: 12 }}>
          {/* Status indicator */}
          <View className="flex-row items-center" style={{ marginBottom: 8 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#22C55E",
              }}
            />
            <Text
              className="font-semibold"
              style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              ESTADO ACTIVO
            </Text>
          </View>

          {/* Count */}
          <Text className="font-bold font-calsans" style={{ fontSize: 24, color: "#111827" }}>
            {activeCount}
            <Text style={{ fontSize: 16, color: "#9CA3AF", fontWeight: "normal" }}>
              {" "}/ {totalCount} Buses
            </Text>
          </Text>

          {/* Progress bar */}
          <View
            style={{
              height: 6,
              backgroundColor: "#F3F4F6",
              borderRadius: 3,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: `${progress * 100}%`,
                backgroundColor: "#22C55E",
                borderRadius: 3,
              }}
            />
          </View>

          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{label}</Text>
        </View>

        {/* tracking button */}
        {onLiveViewPress && (
          <TouchableOpacity
            onPress={onLiveViewPress}
            activeOpacity={0.7}
            className="flex-row items-center"
            style={{
              backgroundColor: Colors.tecnibus[600],
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#ffffff",
              }}
            />
            <Text className="text-white font-bold font-calsans" style={{ fontSize: 13, marginLeft: 8 }}>
              Tracking
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
