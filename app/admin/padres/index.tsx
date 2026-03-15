import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { Colors } from "@/lib/constants/colors";
import {
  CreateUserModal,
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
import { Plus, Upload, Users } from "lucide-react-native";
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
  eliminarUsuario,
  obtenerPadres,
  type Profile,
} from "@/lib/services/admin.service";

export default function ListaPadresScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: padres = [], isLoading: loading, refetch, isRefetching: refreshing } = useQuery({
    queryKey: QUERY_KEYS.padres,
    queryFn: obtenerPadres,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return padres;
    const q = search.toLowerCase();
    return padres.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.apellido && p.apellido.toLowerCase().includes(q)) ||
        p.correo.toLowerCase().includes(q)
    );
  }, [padres, search]);

  const confirmarEliminar = (padre: Profile) => {
    haptic.medium();
    showAlert({ title: "Eliminar Representante", message: `¿Eliminar a ${padre.nombre} ${padre.apellido || ""}? Esta acción no se puede deshacer.`, type: "warning", buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => handleEliminar(padre.id),
        },
      ] });
  };

  const handleEliminar = async (userId: string) => {
    setDeletingId(userId);
    const result = await eliminarUsuario(userId);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.padres });
      showToast("Representante eliminado correctamente", "success");
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
        title="REPRESENTANTES"
        subtitle={`${padres.length} registrados`}
        icon={Users}
        onBack={() => router.back()}
      />

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
          onPress={() => { haptic.medium(); setShowModal(true); }}
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
            Agregar Representante
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
        placeholder="Buscar representante..."
      />

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
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
              icon={Users}
              title={`${item.nombre} ${item.apellido || ""}`}
              subtitle={item.correo}
              onPress={() => { haptic.light(); router.push(`/admin/padres/${item.id}` as never); }}
              onDelete={() => confirmarEliminar(item)}
              deleting={deletingId === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Users}
              title="Sin representantes registrados"
              subtitle="Toca el botón de arriba para agregar el primer representante"
              isSearching={!!search}
              searchSubtitle={`No se encontró ningún representante con "${search}"`}
            />
          }
        />
      )}

      <CreateUserModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        userType="padre"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.padres })}
        onToast={showToast}
      />

      <ImportCSVModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        entityType="padres"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.padres })}
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
