import { Text, TouchableOpacity, View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { Colors } from "@/lib/constants/colors";

interface ActionCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  title: string;
  description: string;
  onPress: () => void;
  badge?: string;
  variant?: "default" | "filled";
  filledBgColor?: string;
}

export function ActionCard({
  icon: Icon,
  iconColor,
  iconBgColor,
  title,
  description,
  onPress,
  badge,
  variant = "default",
  filledBgColor,
}: ActionCardProps) {
  const isFilled = variant === "filled";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        flex: 1,
        backgroundColor: isFilled ? filledBgColor : "#ffffff",
        borderRadius: 16,
        padding: 18,
        shadowColor: isFilled ? filledBgColor || "#000" : "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isFilled ? 0.25 : 0.08,
        shadowRadius: 12,
        elevation: isFilled ? 6 : 4,
      }}
    >
      {/* Icon + Badge row */}
      <View className="flex-row items-start justify-between" style={{ marginBottom: 14 }}>
        <View
          className="items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: iconBgColor,
          }}
        >
          <Icon size={22} color={iconColor} strokeWidth={2} />
        </View>
        {badge && (
          <View
            style={{
              backgroundColor: isFilled ? "rgba(255,255,255,0.25)" : Colors.tecnibus[600],
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text className="text-white font-bold" style={{ fontSize: 10, letterSpacing: 0.5 }}>
              {badge}
            </Text>
          </View>
        )}
      </View>

      {/* Text */}
      <Text
        className="font-bold font-calsans"
        style={{
          fontSize: 16,
          marginBottom: 4,
          color: isFilled ? "#ffffff" : "#111827",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 12,
          lineHeight: 16,
          color: isFilled ? "rgba(255,255,255,0.75)" : "#9CA3AF",
        }}
      >
        {description}
      </Text>
    </TouchableOpacity>
  );
}
