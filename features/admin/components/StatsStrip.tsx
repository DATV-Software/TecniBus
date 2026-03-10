import { Colors } from "@/lib/constants/colors";
import { LucideIcon } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

interface StatsStripProps {
  stats: { label: string; value: number | string; icon?: LucideIcon }[];
}

export function StatsStrip({ stats }: StatsStripProps) {
  return (
    <View style={{ height: 40 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 8,
          alignItems: "center",
          height: 40,
        }}
      >
        {stats.map((stat, index) => (
          <View
            key={index}
            style={{
              backgroundColor: Colors.tecnibus[50],
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.tecnibus[200],
            }}
          >
            {stat.icon && (
              <stat.icon
                size={12}
                color={Colors.tecnibus[600]}
                strokeWidth={2}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: Colors.tecnibus[700],
                marginRight: 3,
              }}
            >
              {stat.value}
            </Text>
            <Text style={{ fontSize: 12, color: Colors.tecnibus[600] }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
