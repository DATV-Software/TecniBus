import { Colors } from "@/lib/constants/colors";
import {
  EntityCard,
  ImportCSVModal,
  SearchBar,
  StatsStrip,
  SubScreenHeader,
} from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import {
  GraduationCap,
  MapPin,
  Plus,
  Upload,
  User,
  UserX,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Estudiante,
  getEstudiantes,
} from "@/lib/services/estudiantes.service";

export default function EstudiantesListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  const { data: estudiantes = [], isLoading: loading, refetch, isRefetching: refreshing } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: getEstudiantes,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return estudiantes;
    const q = search.toLowerCase();
    return estudiantes.filter(
      (est) =>
        est.nombre.toLowerCase().includes(q) ||
        est.apellido.toLowerCase().includes(q) ||
        est.padre?.nombre.toLowerCase().includes(q) ||
        est.padre?.apellido.toLowerCase().includes(q)
    );
  }, [estudiantes, search]);

  const conParada = estudiantes.filter((e) => e.parada).length;
  const sinParada = estudiantes.length - conParada;

  const stats = useMemo(
    () => [
      { label: "Con Parada", value: conParada, icon: MapPin },
      { label: "Sin Parada", value: sinParada, icon: UserX },
    ],
    [conParada, sinParada]
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.tecnibus[700]}
        translucent={false}
      />

      <SubScreenHeader
        title="ESTUDIANTES"
        subtitle={`${estudiantes.length} registrados`}
        icon={GraduationCap}
        onBack={() => router.back()}
      />

      <StatsStrip stats={stats} />

      {/* Action bar */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => { haptic.medium(); router.push("/admin/estudiantes/crear"); }}
          style={{
            flex: 1,
            backgroundColor: Colors.tecnibus[600],
            borderRadius: 12,
            paddingVertical: 13,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
            Agregar Estudiante
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic.light(); setShowImport(true); }}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 13,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderWidth: 1,
            borderColor: Colors.tecnibus[200],
          }}
        >
          <Upload size={17} color={Colors.tecnibus[600]} />
          <Text style={{ color: Colors.tecnibus[600], fontWeight: "600", fontSize: 13 }}>
            CSV
          </Text>
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar estudiante..."
      />

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          <Text style={{ color: "#6B7280", marginTop: 16 }}>
            Cargando estudiantes...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refetch()}
              colors={[Colors.tecnibus[600]]}
              tintColor={Colors.tecnibus[600]}
            />
          }
          renderItem={({ item }) => (
            <EntityCard
              icon={GraduationCap}
              title={`${item.nombre} ${item.apellido}`}
              meta={[
                {
                  icon: User,
                  text: item.padre
                    ? `${item.padre.nombre} ${item.padre.apellido}`
                    : "Sin padre asignado",
                },
                {
                  icon: MapPin,
                  text: item.parada
                    ? `${item.parada.nombre || "Parada"}${item.parada.ruta ? ` - ${item.parada.ruta.nombre}` : ""}`
                    : "Sin parada asignada",
                },
              ]}
              onPress={() => {
                haptic.light();
                router.push(`/admin/estudiantes/${item.id}` as never);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <View style={{ backgroundColor: Colors.tecnibus[100], padding: 20, borderRadius: 24, marginBottom: 16 }}>
                <GraduationCap size={40} color={Colors.tecnibus[400]} strokeWidth={1.5} />
              </View>
              <Text style={{ color: "#1F2937", fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
                {search ? "Sin resultados" : "Sin estudiantes registrados"}
              </Text>
              <Text style={{ color: "#6B7280", textAlign: "center", fontSize: 13, lineHeight: 20 }}>
                {search
                  ? `No se encontró ningún estudiante con "${search}"`
                  : "Toca el botón de arriba para registrar el primer estudiante"}
              </Text>
            </View>
          }
        />
      )}

      <ImportCSVModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        entityType="estudiantes"
        onSuccess={() => refetch()}
        onToast={(message, type) => console.log(type, message)}
      />
    </View>
  );
}
