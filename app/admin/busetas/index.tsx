import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { Colors } from "@/lib/constants/colors";
import {
  BusetaModal,
  EntityCard,
  SearchBar,
  SubScreenHeader,
} from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { Bus, Plus, Users } from "lucide-react-native";
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
import Toast from "@/components/Toast";
import {
  Buseta,
  deleteBuseta,
  getBusetas,
} from "@/lib/services/busetas.service";

export default function BusetasListScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editBuseta, setEditBuseta] = useState<Buseta | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ visible: false, message: "", type: "success" });

  const { data: busetas = [], isLoading: loading, refetch, isRefetching: refreshing } = useQuery({
    queryKey: ['busetas'],
    queryFn: getBusetas,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const showToast = (message: string, type: "success" | "error" | "warning") => {
    setToast({ visible: true, message, type });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return busetas;
    const q = search.toLowerCase();
    return busetas.filter((b) => b.placa.toLowerCase().includes(q));
  }, [busetas, search]);

  const handleEdit = (buseta: Buseta) => {
    haptic.light();
    setEditBuseta(buseta);
    setShowModal(true);
  };

  const handleCreate = () => {
    haptic.medium();
    setEditBuseta(null);
    setShowModal(true);
  };

  const confirmarEliminar = (buseta: Buseta) => {
    haptic.medium();
    showAlert({
      title: "Eliminar Buseta",
      message: `¿Eliminar la buseta ${buseta.placa}? Esta acción no se puede deshacer.`,
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => handleEliminar(buseta) },
      ],
    });
  };

  const handleEliminar = async (buseta: Buseta) => {
    setDeletingId(buseta.id);
    const result = await deleteBuseta(buseta.id);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['busetas'] });
      showToast("Buseta eliminada correctamente", "success");
    } else {
      showToast(result.error || "Error al eliminar", "error");
    }
    setDeletingId(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.tecnibus[700]}
        translucent={false}
      />

      <SubScreenHeader
        title="BUSETAS"
        subtitle={`${busetas.length} registradas`}
        icon={Bus}
        onBack={() => router.back()}
      />

      {/* Action bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <TouchableOpacity
          onPress={handleCreate}
          style={{
            backgroundColor: Colors.tecnibus[600],
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Bus size={19} color="#fff" strokeWidth={2.5} />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            Registrar Buseta
          </Text>
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por placa..."
        autoCapitalize="characters"
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          <Text style={{ color: "#6B7280", marginTop: 16 }}>Cargando busetas...</Text>
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
              icon={Bus}
              title={item.placa}
              meta={[{ icon: Users, text: `${item.capacidad} pasajeros` }]}
              onPress={() => handleEdit(item)}
              onDelete={() => confirmarEliminar(item)}
              deleting={deletingId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
              <View style={{
                backgroundColor: Colors.tecnibus[100],
                padding: 20,
                borderRadius: 24,
                marginBottom: 16,
              }}>
                <Bus size={40} color={Colors.tecnibus[400]} strokeWidth={1.5} />
              </View>
              <Text style={{ color: "#1F2937", fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
                {search ? "Sin resultados" : "Sin busetas registradas"}
              </Text>
              <Text style={{ color: "#6B7280", textAlign: "center", fontSize: 13, lineHeight: 20 }}>
                {search
                  ? `No se encontró ninguna buseta con "${search}"`
                  : "Toca el botón de arriba para registrar la primera buseta"}
              </Text>
            </View>
          }
        />
      )}

      <BusetaModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditBuseta(null); }}
        buseta={editBuseta}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['busetas'] })}
        onToast={showToast}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
