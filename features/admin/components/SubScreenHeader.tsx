import { Colors } from "@/lib/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, LucideIcon } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SubScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** @deprecated El icono ya no se muestra en el header */
  icon?: LucideIcon;
  onBack: () => void;
  rightAction?: { icon: LucideIcon; onPress: () => void };
}

export function SubScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
}: SubScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top + 8, 44);

  return (
    <LinearGradient
      colors={[
        Colors.tecnibus[600],
        Colors.tecnibus[500],
        Colors.tecnibus[400],
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{
        paddingTop,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}
    >
      {/* Fila 1: back button + título de sección + acción derecha */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <ArrowLeft size={18} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "600",
            fontFamily: "CalSans",
          }}
        >
          {title}
        </Text>

        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <rightAction.icon size={18} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Fila 2: subtítulo grande (igual que DashboardHeader) */}
      {subtitle && (
        <Text
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontWeight: "700",
            fontFamily: "CalSans",
          }}
        >
          {subtitle}
        </Text>
      )}
    </LinearGradient>
  );
}
