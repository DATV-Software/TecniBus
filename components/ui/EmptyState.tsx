import { Colors } from "@/lib/constants/colors";
import { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  searchTitle?: string;
  searchSubtitle?: string;
  isSearching?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  searchTitle = "Sin resultados",
  searchSubtitle = "Intenta con otro término de búsqueda",
  isSearching = false,
}: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
      <View
        style={{
          backgroundColor: Colors.tecnibus[100],
          padding: 20,
          borderRadius: 24,
          marginBottom: 16,
        }}
      >
        <Icon size={40} color={Colors.tecnibus[400]} strokeWidth={1.5} />
      </View>
      <Text
        style={{
          color: "#1F2937",
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 6,
        }}
      >
        {isSearching ? searchTitle : title}
      </Text>
      <Text
        style={{
          color: "#6B7280",
          textAlign: "center",
          fontSize: 13,
          lineHeight: 20,
          paddingHorizontal: 32,
        }}
      >
        {isSearching ? searchSubtitle : subtitle}
      </Text>
    </View>
  );
}
