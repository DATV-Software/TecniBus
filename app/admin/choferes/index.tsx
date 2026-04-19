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
import { Plus, Upload, UserCircle } from "lucide-react-native";
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
import { useAlert } from "@/components/ui/AlertBox/useAlert";
import {
  eliminarUsuario,
  obtenerChoferes,
  type Profile,
} from "@/lib/services/admin/admin.service";

export default function ListaChoferesScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: choferes = [], isLoading: loading, refetch, isRefetching: refreshing } = useQuery({
    queryKey: QUERY_KEYS.choferes,
    queryFn: obtenerChoferes,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return choferes;
    const q = search.toLowerCase();
    return choferes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.apellido && c.apellido.toLowerCase().includes(q)) ||
        c.correo.toLowerCase().includes(q)
    );
  }, [choferes, search]);

  const confirmarEliminar = (chofer: Profile) => {
    haptic.medium();
    showAlert({ title: "Eliminar Conductor", message: `¿Eliminar a ${chofer.nombre} ${chofer.apellido || ""}? Esta acción no se puede deshacer.`, type: "warning", buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => handleEliminar(chofer.id),
        },
      ] });
  };

  const handleEliminar = async (userId: string) => {
    setDeletingId(userId);
    const result = await eliminarUsuario(userId);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.choferes });
      showToast("Conductor eliminado correctamente", "success");
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
        title="CONDUCTORES"
        subtitle={`${choferes.length} registrados`}
        icon={UserCircle}
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
            Agregar Conductor
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
        placeholder="Buscar conductor..."
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
              icon={UserCircle}
              title={`${item.nombre} ${item.apellido || ""}`}
              subtitle={item.correo}
              onPress={() => { haptic.light(); router.push(`/admin/choferes/${item.id}` as never); }}
              onDelete={() => confirmarEliminar(item)}
              deleting={deletingId === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={UserCircle}
              title="Sin conductores registrados"
              subtitle="Toca el botón de arriba para agregar el primer conductor"
              isSearching={!!search}
              searchSubtitle={`No se encontró ningún conductor con "${search}"`}
            />
          }
        />
      )}

      <CreateUserModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        userType="chofer"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.choferes })}
        onToast={showToast}
      />

      <ImportCSVModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        entityType="conductores"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.choferes })}
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
