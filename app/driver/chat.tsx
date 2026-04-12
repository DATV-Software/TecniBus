import { useAuth } from "@/contexts/AuthContext";
import { SubScreenHeader } from "@/features/admin";
import { Colors } from "@/lib/constants/colors";
import { QUICK_MESSAGES_CHOFER } from "@/lib/constants/quickMessages";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import {
  ChatResumen,
  enviarMensaje,
  getChatsPorChofer,
  getMensajes,
  getOrCreateChat,
  isRecorridoActivo,
  marcarLeidos,
  Mensaje,
  suscribirseAMensajes,
} from "@/lib/services/chat.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle, Send } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vista = "lista" | "conversacion";

export default function DriverChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  // Params opcionales para abrir directo desde botón de chat en el mapa
  const { idPadre, idAsignacion, nombreEstudiante } = useLocalSearchParams<{
    idPadre?: string;
    idAsignacion?: string;
    nombreEstudiante?: string;
  }>();

  const [vista, setVista] = useState<Vista>("lista");
  const [chats, setChats] = useState<ChatResumen[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [chatSeleccionado, setChatSeleccionado] = useState<ChatResumen | null>(
    null,
  );

  const [idChat, setIdChat] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [inputText, setInputText] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recorridoActivo, setRecorridoActivo] = useState(false);
  const [cargandoChat, setCargandoChat] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!profile?.id) return;
    setCargandoLista(true);
    getChatsPorChofer(profile.id).then((data) => {
      setChats(data);
      setCargandoLista(false);
    });
  }, [profile?.id]);

  // Auto-abrir conversación si viene con params directos (desde botón en mapa)
  useEffect(() => {
    if (!idPadre || !idAsignacion || !profile?.id) return;
    const abrir = async () => {
      setCargandoChat(true);
      const chatId = await getOrCreateChat(idAsignacion, idPadre, profile.id);
      if (!chatId) { setCargandoChat(false); return; }

      const chatResumen: ChatResumen = {
        id_chat: chatId,
        id_asignacion: idAsignacion,
        id_padre: idPadre,
        nombre_padre: nombreEstudiante ? `Padre de ${nombreEstudiante}` : 'Padre',
        ultimo_mensaje: null,
        ultima_hora: null,
        no_leidos: 0,
      };
      setChatSeleccionado(chatResumen);
      setVista("conversacion");

      const [msgs, activo] = await Promise.all([
        getMensajes(chatId),
        isRecorridoActivo(idAsignacion),
      ]);
      setIdChat(chatId);
      setMensajes(msgs);
      setRecorridoActivo(activo);
      setCargandoChat(false);
    };
    abrir();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPadre, idAsignacion, profile?.id]);

  const abrirConversacion = async (chat: ChatResumen) => {
    setChatSeleccionado(chat);
    setVista("conversacion");
    setCargandoChat(true);
    setMensajes([]);
    setIdChat(null);

    const [msgs, activo] = await Promise.all([
      getMensajes(chat.id_chat),
      isRecorridoActivo(chat.id_asignacion),
    ]);
    setIdChat(chat.id_chat);
    setMensajes(msgs);
    setRecorridoActivo(activo);
    setCargandoChat(false);
  };

  useEffect(() => {
    if (!idChat) return;
    const channel = suscribirseAMensajes(idChat, (msg) => {
      setMensajes((prev) => [...prev, msg]);
    });
    return () => {
      channel.unsubscribe();
    };
  }, [idChat]);

  useEffect(() => {
    if (!idChat || !profile?.id || mensajes.length === 0) return;
    marcarLeidos(idChat, profile.id);
  }, [mensajes, idChat, profile?.id]);

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [mensajes]);

  const handleEnviar = async (
    texto: string,
    tipo: "quick" | "custom" = "custom",
  ) => {
    if (!idChat || !profile?.id || !texto.trim() || !recorridoActivo) return;
    setEnviando(true);
    const ok = await enviarMensaje(
      idChat,
      profile.id,
      "chofer",
      texto.trim(),
      tipo,
    );
    if (ok) setInputText("");
    setEnviando(false);
  };

  const volverALista = () => {
    setVista("lista");
    setChatSeleccionado(null);
    setIdChat(null);
    setMensajes([]);
    if (profile?.id) {
      getChatsPorChofer(profile.id).then(setChats);
    }
  };

  const renderMensaje = ({ item }: { item: Mensaje }) => {
    const esMio = item.id_autor === profile?.id;
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: esMio ? "flex-end" : "flex-start",
          marginBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            maxWidth: "75%",
            backgroundColor: esMio ? Colors.tecnibus[600] : "#F3F4F6",
            borderRadius: 16,
            borderBottomRightRadius: esMio ? 4 : 16,
            borderBottomLeftRadius: esMio ? 16 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: esMio ? "#FFFFFF" : "#1F2937", fontSize: 15 }}>
            {item.contenido}
          </Text>
          <Text
            style={{
              color: esMio ? "rgba(255,255,255,0.7)" : "#9CA3AF",
              fontSize: 11,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {new Date(item.created_at).toLocaleTimeString("es-EC", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "America/Guayaquil",
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatResumen }) => (
    <TouchableOpacity
      onPress={() => abrirConversacion(item)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
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
        <MessageCircle size={22} color={Colors.tecnibus[600]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937" }}>
          {item.nombre_padre}
        </Text>
        {item.ultimo_mensaje ? (
          <Text
            style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}
            numberOfLines={1}
          >
            {item.ultimo_mensaje}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
            Sin mensajes
          </Text>
        )}
      </View>
      {item.no_leidos > 0 && (
        <View
          style={{
            backgroundColor: Colors.tecnibus[600],
            borderRadius: 12,
            minWidth: 24,
            height: 24,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 6,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
            {item.no_leidos}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ── Vista lista ──
  if (vista === "lista") {
    return (
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <StatusBar
          backgroundColor={Colors.tecnibus[700]}
          barStyle="light-content"
          translucent={false}
        />

        <SubScreenHeader
          title="CHATS"
          subtitle="Chats con padres"
          onBack={() => router.back()}
        />

        {cargandoLista ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id_chat}
            renderItem={renderChatItem}
            contentContainerStyle={{ paddingBottom: 90 }}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 80,
                }}
              >
                <MessageCircle size={48} color="#D1D5DB" />
                <Text
                  style={{
                    color: "#9CA3AF",
                    fontSize: 16,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  No hay conversaciones activas
                </Text>
              </View>
            }
          />
        )}

        <BottomNavigation
          activeTab="chat"
          activeColor={Colors.tecnibus[600]}
          onHomePress={() => router.back()}
          onMiddlePress={() => {}}
          onSettingsPress={() => router.push("/driver/settings")}
        />
      </View>
    );
  }

  // ── Vista conversación ──
  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#F9FAFB" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar
          backgroundColor={Colors.tecnibus[700]}
          barStyle="light-content"
          translucent={false}
        />

        <SubScreenHeader
          title={chatSeleccionado?.nombre_padre ?? "Padre"}
          subtitle={recorridoActivo ? "Recorrido activo" : "Recorrido finalizado"}
          onBack={volverALista}
        />

        {!recorridoActivo && !cargandoChat && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#FDE68A",
            }}
          >
            <Text style={{ color: "#92400E", fontSize: 13, textAlign: "center" }}>
              Ruta finalizada — solo lectura
            </Text>
          </View>
        )}

        {cargandoChat ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={mensajes}
            keyExtractor={(item) => item.id}
            renderItem={renderMensaje}
            contentContainerStyle={{ paddingVertical: 16, paddingBottom: 90, flexGrow: 1 }}
            ListEmptyComponent={
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingTop: 60,
                }}
              >
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                  No hay mensajes aún.
                </Text>
              </View>
            }
          />
        )}

        {recorridoActivo && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              paddingBottom: insets.bottom + 90,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 12,
                paddingTop: 10,
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {QUICK_MESSAGES_CHOFER.map((msg) => (
                <TouchableOpacity
                  key={msg}
                  onPress={() => handleEnviar(msg, "quick")}
                  disabled={enviando}
                  style={{
                    backgroundColor: Colors.tecnibus[100],
                    borderWidth: 1,
                    borderColor: Colors.tecnibus[300],
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: Colors.tecnibus[700], fontSize: 12 }}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingTop: 8,
                gap: 8,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: "#1F2937",
                  maxHeight: 100,
                }}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => handleEnviar(inputText)}
              />
              <TouchableOpacity
                onPress={() => handleEnviar(inputText)}
                disabled={enviando || !inputText.trim()}
                style={{
                  backgroundColor:
                    enviando || !inputText.trim() ? "#D1D5DB" : Colors.tecnibus[600],
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {enviando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <BottomNavigation
        activeTab="chat"
        activeColor={Colors.tecnibus[600]}
        onHomePress={() => router.back()}
        onMiddlePress={() => {}}
        onSettingsPress={() => router.push("/driver/settings")}
      />
    </View>
  );
}
