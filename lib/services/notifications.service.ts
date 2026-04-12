import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configurar comportamiento de notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Devuelve el estado actual del permiso de notificaciones push.
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!Device.isDevice) return 'undetermined';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Registra el dispositivo para notificaciones push y guarda el token en Supabase
 * @returns El push token o null si falla
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Solo funciona en dispositivos físicos
  if (!Device.isDevice) {
    return null;
  }

  try {
    // Verificar permisos existentes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si no hay permisos, solicitarlos
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Obtener el token de Expo Push
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      '4132942f-bfce-4c85-82e2-fb5127ae8fea';


    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenData.data;

    // Guardar el token en Supabase
    const { data: rpcResult, error } = await supabase.rpc('update_push_token', {
      p_push_token: pushToken,
    });

    if (error) {
    } else {
    }

    // Configurar canal de notificaciones en Android
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannel();
    }

    return pushToken;
  } catch (error) {
    // Mostrar más detalle del error
    if (error instanceof Error) {
    }
    return null;
  }
}

/**
 * Configura el canal de notificaciones para Android
 */
async function setupAndroidNotificationChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync('recorrido', {
    name: 'Recorrido de Buseta',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3DA7D7', // Color personalizado para las notificaciones
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('general', {
    name: 'Notificaciones Generales',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/**
 * Elimina el push token del usuario (usar al cerrar sesión)
 */
export async function clearPushToken(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('clear_push_token');

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Envía una notificación push al padre de un estudiante específico.
 * Usa notificar-asistencia con título/mensaje custom.
 */
export async function sendPushToStudentParent(
  idEstudiante: string,
  titulo: string,
  mensaje: string,
): Promise<void> {
  try {
    await supabase.functions.invoke('notificar-asistencia', {
      body: {
        id_estudiante: idEstudiante,
        tipo: 'subio', // tipo base requerido, será overrideado por custom
        titulo_custom: titulo,
        mensaje_custom: mensaje,
      },
    });
  } catch (error) {
  }
}

/**
 * Envía una notificación push a los padres de una ruta (llamar desde el servicio de recorridos)
 * @param idAsignacion ID de la asignación de ruta
 * @param titulo Título de la notificación
 * @param mensaje Cuerpo de la notificación
 * @param data Datos adicionales
 */
export async function sendPushToParents(
  idAsignacion: string,
  titulo: string,
  mensaje: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: {
          id_asignacion: idAsignacion,
          titulo,
          mensaje,
          data,
        },
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, sent: result?.sent || 0 };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Listeners para manejar notificaciones recibidas
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Obtiene la última notificación que abrió la app (si aplica)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}
