import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { Colors } from "@/lib/constants/colors";
import { SubScreenHeader } from "@/features/admin";
import {
  createAsignacion,
  deleteAsignacion,
  getAsignacionesChofer,
  getDatosAsignaciones,
  type AsignacionRuta,
  type ChoferAsignacion,
  type BusetaAsignacion,
  type RutaAsignacion,
  type CreateAsignacionDto,
} from "@/lib/services/asignaciones.service";
import { supabase } from "@/lib/services/supabase";
import { haptic } from "@/lib/utils/haptics";
import { useRouter } from "expo-router";
import {
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  UserCircle,
  X,
  XCircle,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRefresh } from "@/lib/hooks/useRefresh";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";

type Chofer = ChoferAsignacion;
type Ruta = RutaAsignacion;
type Buseta = BusetaAsignacion;

const DIAS_SEMANA = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

export default function AsignacionesScreen() {
  const { showAlert } = useAlert();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [busetas, setBusetas] = useState<Buseta[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionRuta[]>([]);
  const [choferSeleccionado, setChoferSeleccionado] = useState<Chofer | null>(null);
  const [busetaFilter, setBusetaFilter] = useState("");

  // Modal crear asignación
  const [modalVisible, setModalVisible] = useState(false);
  const [modalBusetaVisible, setModalBusetaVisible] = useState(false);
  const [formData, setFormData] = useState<CreateAsignacionDto>({
    id_chofer: "",
    id_ruta: "",
    hora_inicio: "06:00:00",
    hora_fin: "07:00:00",
    descripcion: "",
    dias_semana: ["lunes", "martes", "miércoles", "jueves", "viernes"],
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const { choferes, rutas, busetas } = await getDatosAsignaciones();
      setChoferes(choferes);
      setRutas(rutas);
      setBusetas(busetas);
    } catch (error) {
      showAlert({ title: "Error", message: "No se pudieron cargar los datos", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const { refreshing, onRefresh } = useRefresh(cargarDatos);
  const keyboardHeight = useKeyboardHeight();

  const cargarAsignacionesChofer = async (idChofer: string) => {
    try {
      const data = await getAsignacionesChofer(idChofer);
      setAsignaciones(data);
    } catch (error) {
    }
  };

  const handleSeleccionarChofer = (chofer: Chofer) => {
    haptic.light();
    setChoferSeleccionado(chofer);
    cargarAsignacionesChofer(chofer.id);
  };

  const handleAbrirModalAsignacion = () => {
    if (!choferSeleccionado) {
      showAlert({ title: "Atención", message: "Selecciona un chofer primero", type: "warning" });
      return;
    }
    setFormData({
      id_chofer: choferSeleccionado.id,
      id_ruta: rutas[0]?.id || "",
      hora_inicio: "06:00:00",
      hora_fin: "07:00:00",
      descripcion: "",
      dias_semana: undefined,
    });
    setModalVisible(true);
  };

  const handleCrearAsignacion = async () => {
    try {
      if (!formData.id_ruta) {
        showAlert({ title: "Error", message: "Selecciona una ruta", type: "error" });
        return;
      }
      haptic.medium();
      const result = await createAsignacion(formData);
      if (result) {
        haptic.success();
        showAlert({ title: "Éxito", message: "Recorrido asignado correctamente", type: "success" });
        setModalVisible(false);
        if (choferSeleccionado) cargarAsignacionesChofer(choferSeleccionado.id);
      } else {
        haptic.error();
        showAlert({ title: "Error", message: "No se pudo crear la asignación", type: "error" });
      }
    } catch (error) {
      haptic.error();
      showAlert({ title: "Error", message: "Ocurrió un error al crear la asignación", type: "error" });
    }
  };

  const handleEliminarAsignacion = (id: string) => {
    showAlert({ title: "Confirmar eliminación", message: "¿Estás seguro de eliminar este recorrido?", type: "warning", buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            haptic.medium();
            const success = await deleteAsignacion(id);
            if (success) {
              haptic.success();
              if (choferSeleccionado) cargarAsignacionesChofer(choferSeleccionado.id);
            } else {
              haptic.error();
              showAlert({ title: "Error", message: "No se pudo eliminar el recorrido", type: "error" });
            }
          },
        },
      ] });
  };

  const handleAsignarBuseta = async (idChofer: string, idBuseta: string) => {
    try {
      haptic.medium();
      const { error } = await supabase
        .from("choferes")
        .update({ id_buseta: idBuseta })
        .eq("id", idChofer);

      if (error) throw error;

      haptic.success();
      showAlert({ title: "Éxito", message: "Buseta asignada correctamente", type: "success" });
      setModalBusetaVisible(false);
      cargarDatos();
    } catch (error) {
      haptic.error();
      showAlert({ title: "Error", message: "No se pudo asignar la buseta", type: "error" });
    }
  };

  const toggleTodosDias = () => {
    if (formData.dias_semana === undefined) {
      setFormData({ ...formData, dias_semana: [] });
    } else {
      setFormData({ ...formData, dias_semana: undefined });
    }
  };

  const toggleDia = (dia: string) => {
    if (formData.dias_semana === undefined) return;
    const dias = formData.dias_semana;
    if (dias.includes(dia)) {
      const newDias = dias.filter((d) => d !== dia);
      setFormData({ ...formData, dias_semana: newDias.length === 0 ? undefined : newDias });
    } else {
      setFormData({ ...formData, dias_semana: [...dias, dia] });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.tecnibus[700]} translucent={false} />

      <SubScreenHeader
        title="ASIGNACIONES"
        subtitle="Busetas y recorridos"
        onBack={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.tecnibus[600]]}
            tintColor={Colors.tecnibus[600]}
          />
        }
      >
        {/* Choferes */}
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937" }}>Choferes</Text>
            <View style={{ backgroundColor: Colors.tecnibus[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: Colors.tecnibus[700], fontWeight: "700", fontSize: 12 }}>{choferes.length} total</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
              <Text style={{ color: "#6B7280", marginTop: 12 }}>Cargando choferes...</Text>
            </View>
          ) : choferes.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <UserCircle size={48} color={Colors.tecnibus[300]} strokeWidth={1.5} />
              <Text style={{ color: "#6B7280", marginTop: 12, fontWeight: "600" }}>No hay choferes</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {choferes.map((chofer) => {
                  const isSelected = choferSeleccionado?.id === chofer.id;
                  return (
                    <TouchableOpacity
                      key={chofer.id}
                      onPress={() => handleSeleccionarChofer(chofer)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        minWidth: 160,
                        backgroundColor: isSelected ? Colors.tecnibus[100] : "#ffffff",
                        borderColor: isSelected ? Colors.tecnibus[600] : "#E5E7EB",
                      }}
                    >
                      <Text style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color: isSelected ? Colors.tecnibus[800] : "#374151",
                      }}>
                        {chofer.nombre} {chofer.apellido}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                        <Bus size={14} color={chofer.id_buseta ? "#16A34A" : "#9CA3AF"} />
                        <Text style={{
                          fontSize: 11,
                          marginLeft: 4,
                          color: chofer.id_buseta ? "#16A34A" : "#9CA3AF",
                        }}>
                          {chofer.buseta_placa || "Sin buseta"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Chofer seleccionado - Buseta + Recorridos */}
        {choferSeleccionado && (
          <>
            {/* Buseta Asignada */}
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 2,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937" }}>Buseta Asignada</Text>
                <TouchableOpacity
                  onPress={() => setModalBusetaVisible(true)}
                  style={{ backgroundColor: Colors.tecnibus[100], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ color: Colors.tecnibus[700], fontWeight: "600", fontSize: 12 }}>Cambiar</Text>
                </TouchableOpacity>
              </View>

              {choferSeleccionado.id_buseta ? (
                <View style={{
                  backgroundColor: Colors.tecnibus[50],
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: Colors.tecnibus[200],
                  flexDirection: "row",
                  alignItems: "center",
                }}>
                  <View style={{ backgroundColor: Colors.tecnibus[600], padding: 8, borderRadius: 10 }}>
                    <Bus size={24} color="#ffffff" strokeWidth={2.5} />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: Colors.tecnibus[800], fontWeight: "700", fontSize: 15 }}>
                      {choferSeleccionado.buseta_placa}
                    </Text>
                    <Text style={{ color: Colors.tecnibus[600], fontSize: 12 }}>Placa asignada</Text>
                  </View>
                </View>
              ) : (
                <View style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#D1D5DB",
                }}>
                  <Text style={{ color: "#6B7280", textAlign: "center" }}>Sin buseta asignada</Text>
                </View>
              )}
            </View>

            {/* Recorridos */}
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 32,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 2,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1F2937" }}>Recorridos</Text>
                <TouchableOpacity
                  onPress={handleAbrirModalAsignacion}
                  style={{
                    backgroundColor: Colors.tecnibus[600],
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Plus size={14} color="#ffffff" strokeWidth={2.5} />
                  <Text style={{ color: "#ffffff", fontWeight: "600", marginLeft: 4, fontSize: 12 }}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {asignaciones.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Calendar size={48} color={Colors.tecnibus[300]} strokeWidth={1.5} />
                  <Text style={{ color: "#6B7280", marginTop: 12, fontWeight: "600" }}>Sin recorridos asignados</Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>Agrega un recorrido con horario</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {asignaciones.map((asig) => {
                    const ruta = rutas.find((r) => r.id === asig.id_ruta);
                    return (
                      <View
                        key={asig.id}
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: "#1F2937", fontWeight: "700", fontSize: 15 }}>
                              {ruta?.nombre || "Ruta desconocida"}
                            </Text>
                            {asig.descripcion && (
                              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>{asig.descripcion}</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleEliminarAsignacion(asig.id)}
                            style={{ backgroundColor: "#FEF2F2", padding: 8, borderRadius: 8 }}
                          >
                            <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                          <Clock size={14} color={Colors.tecnibus[600]} strokeWidth={2} />
                          <Text style={{ color: Colors.tecnibus[700], fontSize: 13, marginLeft: 4, fontWeight: "600" }}>
                            {asig.hora_inicio.substring(0, 5)} - {asig.hora_fin.substring(0, 5)}
                          </Text>
                        </View>

                        {asig.dias_semana && (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                            {asig.dias_semana.map((dia) => (
                              <View key={dia} style={{ backgroundColor: Colors.tecnibus[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                <Text style={{ color: Colors.tecnibus[700], fontSize: 11, fontWeight: "600" }}>
                                  {dia.substring(0, 3).toUpperCase()}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                          {asig.activo ? (
                            <CheckCircle2 size={14} color="#16A34A" strokeWidth={2} />
                          ) : (
                            <XCircle size={14} color="#EF4444" strokeWidth={2} />
                          )}
                          <Text style={{
                            fontSize: 12,
                            marginLeft: 4,
                            fontWeight: "600",
                            color: asig.activo ? "#16A34A" : "#EF4444",
                          }}>
                            {asig.activo ? "Activo" : "Inactivo"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Crear Asignación */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 24, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : 24, maxHeight: "90%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Nuevo Recorrido</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ backgroundColor: "#F3F4F6", padding: 8, borderRadius: 10 }}>
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Seleccionar Ruta */}
              <Text style={{ color: "#374151", fontWeight: "600", marginBottom: 8, fontSize: 13 }}>Ruta</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {rutas.map((ruta) => (
                  <TouchableOpacity
                    key={ruta.id}
                    onPress={() => setFormData({ ...formData, id_ruta: ruta.id })}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      marginRight: 8,
                      backgroundColor: formData.id_ruta === ruta.id ? Colors.tecnibus[600] : "#F3F4F6",
                      borderWidth: formData.id_ruta === ruta.id ? 0 : 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{
                      fontWeight: "600",
                      color: formData.id_ruta === ruta.id ? "#ffffff" : "#374151",
                    }}>
                      {ruta.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Horarios */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#374151", fontWeight: "600", marginBottom: 8, fontSize: 13 }}>Hora Inicio</Text>
                  <TextInput
                    value={formData.hora_inicio}
                    onChangeText={(text) => setFormData({ ...formData, hora_inicio: text })}
                    placeholder="06:00:00"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: "#1F2937",
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#374151", fontWeight: "600", marginBottom: 8, fontSize: 13 }}>Hora Fin</Text>
                  <TextInput
                    value={formData.hora_fin}
                    onChangeText={(text) => setFormData({ ...formData, hora_fin: text })}
                    placeholder="07:00:00"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: "#1F2937",
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  />
                </View>
              </View>

              {/* Descripción */}
              <Text style={{ color: "#374151", fontWeight: "600", marginBottom: 8, fontSize: 13 }}>Descripción</Text>
              <TextInput
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                placeholder="Ej: Llevar estudiantes al colegio"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: "#1F2937",
                  fontSize: 14,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              />

              {/* Días de la semana */}
              <Text style={{ color: "#374151", fontWeight: "600", marginBottom: 8, fontSize: 13 }}>Días activos</Text>

              <TouchableOpacity
                onPress={toggleTodosDias}
                style={{
                  marginBottom: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: formData.dias_semana === undefined ? Colors.tecnibus[600] : "#F3F4F6",
                  borderWidth: formData.dias_semana === undefined ? 0 : 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Calendar size={18} color={formData.dias_semana === undefined ? "#ffffff" : "#374151"} />
                <Text style={{
                  fontWeight: "700",
                  marginLeft: 8,
                  color: formData.dias_semana === undefined ? "#ffffff" : "#374151",
                }}>
                  Todos los días
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {DIAS_SEMANA.map((dia) => {
                  const todosDias = formData.dias_semana === undefined;
                  const isSelected = formData.dias_semana?.includes(dia);
                  return (
                    <TouchableOpacity
                      key={dia}
                      onPress={() => toggleDia(dia)}
                      disabled={todosDias}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        opacity: todosDias ? 0.5 : 1,
                        backgroundColor: todosDias
                          ? "#E5E7EB"
                          : isSelected
                            ? Colors.tecnibus[600]
                            : "#F3F4F6",
                        borderWidth: todosDias || isSelected ? 0 : 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Text style={{
                        fontWeight: "600",
                        fontSize: 12,
                        color: todosDias
                          ? "#9CA3AF"
                          : isSelected
                            ? "#ffffff"
                            : "#374151",
                      }}>
                        {dia.substring(0, 3).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Botones */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1,
                    backgroundColor: "#F3F4F6",
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#374151", fontWeight: "700" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCrearAsignacion}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.tecnibus[600],
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "700" }}>Crear</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Asignar Buseta */}
      <Modal
        visible={modalBusetaVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalBusetaVisible(false); setBusetaFilter(""); }}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 24, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : 24, maxHeight: "90%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>Seleccionar Buseta</Text>
              <TouchableOpacity
                onPress={() => { setModalBusetaVisible(false); setBusetaFilter(""); }}
                style={{ backgroundColor: "#F3F4F6", padding: 8, borderRadius: 10 }}
              >
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={busetaFilter}
              onChangeText={setBusetaFilter}
              placeholder="Buscar por placa..."
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 16,
                color: "#1F2937",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {busetas
                .filter((b) => b.placa.toLowerCase().includes(busetaFilter.toLowerCase()))
                .map((buseta) => (
                  <TouchableOpacity
                    key={buseta.id}
                    onPress={() => {
                      if (!buseta.ocupada && choferSeleccionado) {
                        handleAsignarBuseta(choferSeleccionado.id, buseta.id);
                      } else if (buseta.ocupada) {
                        haptic.error();
                        showAlert({ title: "Buseta ocupada", message: `Esta buseta ya está asignada a ${buseta.chofer_nombre}. Primero desasigna al otro chofer.`, type: "info" });
                      }
                    }}
                    disabled={buseta.ocupada}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 2,
                      opacity: buseta.ocupada ? 0.6 : 1,
                      backgroundColor: buseta.ocupada ? "#F9FAFB" : Colors.tecnibus[50],
                      borderColor: buseta.ocupada ? "#D1D5DB" : Colors.tecnibus[200],
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={{
                          padding: 8,
                          borderRadius: 10,
                          backgroundColor: buseta.ocupada ? "#9CA3AF" : Colors.tecnibus[600],
                        }}>
                          <Bus size={24} color="#ffffff" strokeWidth={2.5} />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{
                            fontWeight: "700",
                            fontSize: 16,
                            color: buseta.ocupada ? "#6B7280" : Colors.tecnibus[800],
                          }}>
                            {buseta.placa}
                          </Text>
                          {buseta.ocupada && (
                            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
                              Asignada a {buseta.chofer_nombre}
                            </Text>
                          )}
                        </View>
                      </View>
                      {buseta.ocupada ? (
                        <XCircle size={20} color="#EF4444" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 size={20} color="#16A34A" strokeWidth={2} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
