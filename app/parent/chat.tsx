import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/lib/constants/colors";
import { QUICK_MESSAGES_PADRE } from "@/lib/constants/quickMessages";
import { LinearGradient } from "expo-linear-gradient";
import {
  enviarMensaje,
  getMensajes,
  getOrCreateChat,
  isRecorridoActivo,
  marcarLeidos,
  Mensaje,
  suscribirseAMensajes,
} from "@/lib/services/chat.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
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

export default function ParentChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{
    idAsignacion: string;
    idChofer: string;
    nombreChofer: string;
  }>();

  const { idAsignacion, idChofer, nombreChofer } = params;

  const [idChat, setIdChat] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [inputText, setInputText] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recorridoActivo, setRecorridoActivo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Inicializar chat
  useEffect(() => {
    if (!idAsignacion || !idChofer || !profile?.id) return;

    const init = async () => {
      setCargando(true);
      const chatId = await getOrCreateChat(idAsignacion, profile.id, idChofer);
      if (!chatId) {
        setCargando(false);
        return;
      }
      setIdChat(chatId);
      const [msgs, activo] = await Promise.all([
        getMensajes(chatId),
        isRecorridoActivo(idAsignacion),
      ]);
      setMensajes(msgs);
      setRecorridoActivo(activo);
      setCargando(false);
    };

    init();
  }, [idAsignacion, idChofer, profile?.id]);

  // Realtime: suscribirse a nuevos mensajes
  useEffect(() => {
    if (!idChat) return;

    const channel = suscribirseAMensajes(idChat, (msg) => {
      setMensajes((prev) => [...prev, msg]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [idChat]);

  // Marcar mensajes como leídos cuando llegan
  useEffect(() => {
    if (!idChat || !profile?.id || mensajes.length === 0) return;
    marcarLeidos(idChat, profile.id);
  }, [mensajes, idChat, profile?.id]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensajes]);

  const handleEnviar = async (texto: string, tipo: "quick" | "custom" = "custom") => {
    if (!idChat || !profile?.id || !texto.trim() || !recorridoActivo) return;
    setEnviando(true);
    const ok = await enviarMensaje(idChat, profile.id, "padre", texto.trim(), tipo);
    if (ok) setInputText("");
    setEnviando(false);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar backgroundColor={Colors.tecnibus[700]} barStyle="light-content" translucent={false} />

      <LinearGradient
        colors={[Colors.tecnibus[700], Colors.tecnibus[600], Colors.tecnibus[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top + 8, 44),
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: 8, borderRadius: 12 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700" }}>
            {nombreChofer ?? "Chofer"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 }}>
            {recorridoActivo ? "En camino" : "Recorrido finalizado"}
          </Text>
        </View>
      </LinearGradient>

      {/* Banner solo lectura */}
      {!recorridoActivo && !cargando && (
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

      {/* Lista de mensajes */}
      {cargando ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.tecnibus[600]} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          renderItem={renderMensaje}
          contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                No hay mensajes aún. ¡Inicia la conversación!
              </Text>
            </View>
          }
        />
      )}

      {/* Área de input */}
      {recorridoActivo && (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingBottom: insets.bottom + 8,
          }}
        >
          {/* Quick messages */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 12,
              paddingTop: 10,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {QUICK_MESSAGES_PADRE.map((msg) => (
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

          {/* Input row */}
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
  );
}
