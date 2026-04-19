import RouteMap from "@/components/RouteMap";
import { Colors } from "@/lib/constants/colors";
import { Parada } from "@/lib/services/routing/rutas.service";
import { UbicacionActual } from "@/lib/services/fleet/ubicaciones.service";
import { Bus, Info } from "lucide-react-native";
import { Text, View } from "react-native";

interface RouteTrackingCardProps {
  paradas: Parada[];
  ubicacionBus: UbicacionActual | null;
  recorridoActivo: boolean;
  rutaNombre?: string;
  hasRoute: boolean;
}

export function RouteTrackingCard({
  paradas,
  ubicacionBus,
  recorridoActivo,
  rutaNombre,
  hasRoute,
}: RouteTrackingCardProps) {
  if (!hasRoute) {
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
        <View className="bg-amber-50 rounded-xl p-4 flex-row items-start border-2 border-amber-200">
          <Info size={20} color="#f59e0b" strokeWidth={2} />
          <View className="flex-1 ml-3">
            <Text className="text-amber-800 font-semibold text-sm">
              Sin ruta asignada
            </Text>
            <Text
              className="text-amber-700 text-xs mt-1"
              style={{ lineHeight: 16 }}
            >
              Este estudiante aún no tiene una ruta asignada. Contacta al
              administrador para asignar una ruta.
            </Text>
          </View>
        </View>
      </View>
    );
  }

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
      {/* Mapa */}
      <RouteMap
        paradas={paradas}
        ubicacionBus={ubicacionBus}
        recorridoActivo={recorridoActivo}
      />

      {/* Info del bus */}
      <View
        className="rounded-xl p-4 flex-row items-center mt-4"
        style={{ backgroundColor: Colors.tecnibus[50] }}
      >
        <View
          className="items-center justify-center"
          style={{
            backgroundColor: Colors.tecnibus[600],
            padding: 8,
            borderRadius: 999,
          }}
        >
          <Bus size={24} color="#ffffff" strokeWidth={2.5} />
        </View>
        <View className="flex-1 ml-3">
          <Text
            className="font-bold text-base"
            style={{ color: Colors.tecnibus[800] }}
          >
            {recorridoActivo ? "En camino" : "No iniciado"}
          </Text>
          <Text className="text-sm" style={{ color: Colors.tecnibus[600] }}>
            Ruta: {rutaNombre || "Sin ruta"}
          </Text>
          {ubicacionBus && (
            <Text
              className="text-xs mt-1"
              style={{ color: Colors.tecnibus[500] }}
            >
              Última actualización:{" "}
              {new Date(ubicacionBus.ubicacion_timestamp).toLocaleTimeString(
                "es-CO",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
