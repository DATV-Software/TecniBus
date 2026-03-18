import { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/services/supabase';
import { Profile } from '../lib/services/useProfile';
import {
  registerForPushNotifications,
  clearPushToken,
} from '../lib/services/notifications.service';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  patchProfile: (fields: Partial<Profile>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📍 Sesión inicial:', session ? 'Existe' : 'No existe');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, 'Session:', session ? 'Existe' : 'No existe');

      // Si es un SIGNED_OUT, limpiar todo inmediatamente
      if (event === 'SIGNED_OUT') {
        console.log('🚪 Evento SIGNED_OUT detectado - limpiando estado');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-registrar push token cuando la app vuelve a primer plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && (profile?.rol === 'padre' || profile?.rol === 'chofer')) {
        registerForPushNotifications();
      }
    });
    return () => subscription.remove();
  }, [profile?.rol]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Buscando perfil para usuario:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error cargando perfil:', error);

        if (error.code === 'PGRST116') {
          console.log('⚠️ Perfil no existe, debería crearse automáticamente');
        }

        setProfile(null);
      } else {
        console.log('✅ Perfil cargado correctamente:', data);
        setProfile(data);

        // Registrar push token para padres y choferes
        if (data.rol === 'padre' || data.rol === 'chofer') {
          registerForPushNotifications().catch((err) => {
            console.warn('Error registrando push notifications:', err);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error inesperado al cargar perfil:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const patchProfile = useCallback((fields: Partial<Profile>) => {
    setProfile(prev => (prev ? { ...prev, ...fields } : prev));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // NO setear loading aquí - lo manejará el componente de login
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { error };
      }

      // El perfil se cargará automáticamente vía onAuthStateChange
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Cerrando sesión...');

      // Limpiar push token antes de cerrar sesión
      await clearPushToken().catch((err) => {
        console.warn('Error limpiando push token:', err);
      });

      // Limpiar estado local primero
      setSession(null);
      setUser(null);
      setProfile(null);

      // Luego cerrar sesión en Supabase
      await supabase.auth.signOut();
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
    }
  }, []);

  // Memoize context value so consumers only re-render when actual data changes,
  // not on every AuthProvider render cycle.
  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
    patchProfile,
  }), [session, user, profile, loading, signIn, signOut, refreshProfile, patchProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}