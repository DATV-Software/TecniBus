import { useAlert } from "@/components/ui/AlertBox/useAlert";
import { SubScreenHeader } from "@/features/admin";
import {
  CATEGORIAS_TEMPLATES,
  TEMPLATES_ANUNCIOS,
  TemplateAnuncio,
} from "@/lib/constants/anuncios-templates";
import { Colors } from "@/lib/constants/colors";
import { supabase } from "@/lib/services/core/supabase";
import { haptic } from "@/lib/utils/haptics";
import { router } from "expo-router";
import { ArrowLeft, FileText, Megaphone, Send, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type Audiencia = "todos" | "padres" | "choferes";

export default function AnunciosScreen() {
  const { showAlert } = useAlert();
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [audiencia, setAudiencia] = useState<Audiencia>("todos");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    string | null
  >(null);

  const handleEnviar = async () => {
    if (!titulo.trim()) {
      showAlert({
        title: "Error",
        message: "El título es obligatorio",
        type: "error",
      });
      return;
    }
    if (!mensaje.trim()) {
      showAlert({
        title: "Error",
        message: "El mensaje es obligatorio",
        type: "error",
      });
      return;
    }
    if (titulo.length > 100) {
      showAlert({
        title: "Error",
        message: "El título no puede superar 100 caracteres",
        type: "error",
      });
      return;
    }
    if (mensaje.length > 500) {
      showAlert({
        title: "Error",
        message: "El mensaje no puede superar 500 caracteres",
        type: "error",
      });
      return;
    }

    const audienciaText =
      audiencia === "todos"
        ? "todos los usuarios"
        : audiencia === "padres"
          ? "todos los padres"
          : "todos los choferes";

    showAlert({
      title: "Confirmar envío",
      message: `¿Enviar este anuncio a ${audienciaText}?\n\n"${titulo}"\n\nEsta acción no se puede deshacer.`,
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        { text: "Enviar", style: "default", onPress: enviarAnuncio },
      ],
    });
  };

  const enviarAnuncio = async () => {
    setLoading(true);
    haptic.light();

    try {
      const { data, error } = await supabase.functions.invoke(
        "broadcast-anuncio",
        {
          body: { titulo: titulo.trim(), mensaje: mensaje.trim(), audiencia },
        },
      );

      if (error) {
        let debugMsg = error.message || 'Error desconocido';
        try {
          if ('context' in error && error.context instanceof Response) {
            const errBody = await error.context.json();
            debugMsg = JSON.stringify(errBody, null, 2);
          }
        } catch (_) { /* ignore parse error */ }
        showAlert({
          title: "Error Debug",
          message: debugMsg,
          type: "error",
        });
        return;
      }

      const enviados = data?.sent || 0;
      const fallidos = data?.failed || 0;

      showAlert({
        title: "Anuncio enviado",
        message: `Se enviaron ${enviados} notificaciones correctamente.${fallidos > 0 ? `\n\n${fallidos} notificaciones fallaron.` : ""}`,
        type: "success",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              setTitulo("");
              setMensaje("");
              setAudiencia("todos");
            },
          },
        ],
      });

      haptic.success();
    } catch (_error) {
      showAlert({
        title: "Error",
        message: "Ocurrió un error inesperado. Intenta nuevamente.",
        type: "error",
      });
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarTemplate = (template: TemplateAnuncio) => {
    setTitulo(template.titulo);
    setMensaje(template.mensaje);
    setAudiencia(template.audienciaSugerida);
    setShowTemplates(false);
    haptic.success();
  };

  const templatesFiltrados = categoriaSeleccionada
    ? TEMPLATES_ANUNCIOS.filter((t) => t.categoria === categoriaSeleccionada)
    : TEMPLATES_ANUNCIOS;

  const audienciaOptions: { key: Audiencia; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "padres", label: "Padres" },
    { key: "choferes", label: "Choferes" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.tecnibus[50] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.tecnibus[700]}
        translucent={false}
      />

      <SubScreenHeader
        title="ANUNCIOS"
        subtitle="Notificar Usuarios"
        icon={Megaphone}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
      >
        {/* Usar Template */}
        <TouchableOpacity
          onPress={() => {
            haptic.light();
            setShowTemplates(true);
          }}
          style={{
            backgroundColor: "#ffffff",
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: Colors.tecnibus[200],
          }}
        >
          <FileText size={20} color={Colors.tecnibus[700]} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: Colors.tecnibus[700],
            }}
          >
            Usar Template
          </Text>
        </TouchableOpacity>

        {/* Audiencia */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 8,
            }}
          >
            Audiencia
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {audienciaOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  haptic.light();
                  setAudiencia(opt.key);
                }}
                style={{
                  flex: 1,
                  backgroundColor:
                    audiencia === opt.key ? Colors.tecnibus[600] : "#ffffff",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  borderWidth: audiencia === opt.key ? 0 : 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: audiencia === opt.key ? "#ffffff" : "#6B7280",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Título */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 8,
            }}
          >
            Título
          </Text>
          <TextInput
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título del anuncio (max. 100 caracteres)"
            placeholderTextColor="#9CA3AF"
            maxLength={100}
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 16,
              fontSize: 15,
              color: "#1F2937",
            }}
          />
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {titulo.length}/100
          </Text>
        </View>

        {/* Mensaje */}
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#374151",
              marginBottom: 8,
            }}
          >
            Mensaje
          </Text>
          <TextInput
            value={mensaje}
            onChangeText={setMensaje}
            placeholder="Escribe el mensaje del anuncio (max. 500 caracteres)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            maxLength={500}
            textAlignVertical="top"
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 16,
              fontSize: 15,
              color: "#1F2937",
              minHeight: 120,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {mensaje.length}/500
          </Text>
        </View>

        {/* Vista Previa */}
        {(titulo || mensaje) && (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: Colors.tecnibus[200],
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Megaphone size={16} color={Colors.tecnibus[600]} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: Colors.tecnibus[600],
                  textTransform: "uppercase",
                }}
              >
                Vista Previa
              </Text>
            </View>
            {titulo ? (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#1F2937",
                  marginBottom: 4,
                }}
              >
                {titulo}
              </Text>
            ) : null}
            {mensaje ? (
              <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 20 }}>
                {mensaje}
              </Text>
            ) : null}
          </View>
        )}

        {/* Enviar */}
        <TouchableOpacity
          onPress={handleEnviar}
          disabled={loading || !titulo.trim() || !mensaje.trim()}
          style={{
            backgroundColor:
              loading || !titulo.trim() || !mensaje.trim()
                ? Colors.tecnibus[300]
                : Colors.tecnibus[600],
            paddingVertical: 16,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Send size={20} color="#ffffff" />
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}
              >
                Enviar Anuncio
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info tip */}
        <View
          style={{
            backgroundColor: Colors.tecnibus[50],
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.tecnibus[200],
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: Colors.tecnibus[800],
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            Las notificaciones se enviarán solo a usuarios con notificaciones
            habilitadas y dispositivos registrados.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      {/* Modal de Templates */}
      <Modal
        visible={showTemplates}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTemplates(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "85%",
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#D1D5DB",
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
              }}
            >
              <View
                style={{
                  backgroundColor: Colors.tecnibus[100],
                  padding: 10,
                  borderRadius: 14,
                }}
              >
                <FileText
                  size={22}
                  color={Colors.tecnibus[600]}
                  strokeWidth={2}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}
                >
                  Templates de Anuncios
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                  {categoriaSeleccionada
                    ? "Selecciona un template"
                    : "Elige una categoría"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowTemplates(false);
                  setCategoriaSeleccionada(null);
                }}
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: 8,
                  borderRadius: 10,
                }}
              >
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
            >
              {!categoriaSeleccionada ? (
                CATEGORIAS_TEMPLATES.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    onPress={() => {
                      haptic.light();
                      setCategoriaSeleccionada(categoria.id);
                    }}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: Colors.tecnibus[100],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{categoria.icono}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        {categoria.nombre}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}
                      >
                        {
                          TEMPLATES_ANUNCIOS.filter(
                            (t) => t.categoria === categoria.id,
                          ).length
                        }{" "}
                        templates
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      haptic.light();
                      setCategoriaSeleccionada(null);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 8,
                    }}
                  >
                    <ArrowLeft size={18} color={Colors.tecnibus[600]} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: Colors.tecnibus[600],
                      }}
                    >
                      Ver categorías
                    </Text>
                  </TouchableOpacity>

                  {templatesFiltrados.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      onPress={() => handleSeleccionarTemplate(template)}
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{template.icono}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: "600",
                              color: "#1F2937",
                            }}
                          >
                            {template.nombre}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#6B7280",
                              marginTop: 2,
                            }}
                          >
                            Audiencia:{" "}
                            {template.audienciaSugerida === "todos"
                              ? "Todos"
                              : template.audienciaSugerida === "padres"
                                ? "Padres"
                                : "Choferes"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={{
                          backgroundColor: Colors.tecnibus[50],
                          padding: 12,
                          borderRadius: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: Colors.tecnibus[500],
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#1F2937",
                            marginBottom: 4,
                          }}
                        >
                          {template.titulo}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                            lineHeight: 18,
                          }}
                          numberOfLines={3}
                        >
                          {template.mensaje}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
