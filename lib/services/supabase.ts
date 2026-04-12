import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const mockStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};
// Implementación para poder correr app en web para pruebas mas eficientes
const getStorage = () => {
  if (Platform.OS === 'web') {// Para web, usamos localStorage
    if (typeof window !== 'undefined') {
      return window.localStorage;
    }
    return mockStorage;//
  }
  // Para móvil, importamos AsyncStorage dinámicamente o lo requerimos
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default;
};
// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Falta configurar las variables de entorno EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

