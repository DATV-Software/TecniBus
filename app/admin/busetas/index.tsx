import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { Colors } from "@/lib/constants/colors";
import {
  BusetaModal,
  EntityCard,
  ImportCSVModal,
  SearchBar,
  SubScreenHeader,
} from "@/features/admin";
import { haptic } from "@/lib/utils/haptics";
import { useToast } from "@/lib/hooks/useToast";
import { QUERY_KEYS } from "@/lib/constants/queryKeys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { Bus, Plus, Upload, Users } from "lucide-react-native";
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
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Buseta,
  deleteBuseta,
  getBusetas,
} from "@/lib/services/busetas.service";

export default function BusetasListScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editBuseta, setEditBuseta] = useState<Buseta | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: busetas = [], isLoading: loading, refetch, isRefetching: refreshing } = useQuery({
    queryKey: QUERY_KEYS.busetas,
    queryFn: getBusetas,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.busetas });
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
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 10 }}>
        <TouchableOpacity
          onPress={handleCreate}
          style={{
            flex: 1,
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
        <TouchableOpacity
          onPress={() => { haptic.light(); setShowImport(true); }}
          style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderWidth: 1,
            borderColor: Colors.tecnibus[200],
          }}
        >
          <Upload size={17} color={Colors.tecnibus[600]} />
          <Text style={{ color: Colors.tecnibus[600], fontWeight: "600", fontSize: 13 }}>CSV</Text>
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
            <EmptyState
              icon={Bus}
              title="Sin busetas registradas"
              subtitle="Toca el botón de arriba para registrar la primera buseta"
              isSearching={!!search}
              searchSubtitle={`No se encontró ninguna buseta con "${search}"`}
            />
          }
        />
      )}

      <ImportCSVModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        entityType="buses"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.busetas })}
        onToast={showToast}
      />

      <BusetaModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditBuseta(null); }}
        buseta={editBuseta}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.busetas })}
        onToast={showToast}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}
