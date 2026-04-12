import { supabase } from '@/lib/services/supabase';

// 1. Tipos estrictos para evitar errores de envío
export type RolUsuario = 'chofer' | 'padre';

export type CrearUsuarioParams = {
  nombre: string;
  apellido: string;
  email: string; // La UI envía 'email', la función lo mapea a 'correo'
  password: string;
  rol: RolUsuario;
};

export type CrearUsuarioResponse = {
  success: boolean;
  user?: {
    id: string;
    correo: string; // Cambiado a correo para ser fiel a tu DB
    nombre: string;
    apellido: string;
    rol: string;
  };
  error?: string;
};

/* ==========================================
   FUNCIÓN: CREAR USUARIO
   ========================================== */
export async function crearUsuario(
  params: CrearUsuarioParams
): Promise<CrearUsuarioResponse> {
  try {
    // Invocamos la Edge Function
    const { data, error } = await supabase.functions.invoke(
      'crear-usuario',
      {
        body: params,
      }
    );

    // Error de red o error crítico de la función (500)
    if (error) {
      return { 
        success: false, 
        error: `Error de servidor: ${error.message}` 
      };
    }

    // Error controlado devuelto por la lógica de la función (400)
    // Ejemplo: "Email ya registrado" o "Error en tabla choferes"
    if (!data || data.success !== true) {
      return {
        success: false,
        error: data?.error || 'No se pudo completar el registro en la base de datos',
      };
    }

    // Éxito total
    return { 
      success: true, 
      user: data.user 
    };

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ocurrió un error inesperado',
    };
  }
}

/* ==========================================
   FUNCIÓN: OBTENER USUARIOS POR ROL
   ========================================== */
export type Profile = {
  id: string;
  nombre: string;
  apellido?: string;
  correo: string;
  rol: string;
  created_at: string;
};

async function obtenerUsuariosPorRol(rol: RolUsuario): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('rol', rol)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export function obtenerChoferes(): Promise<Profile[]> {
  return obtenerUsuariosPorRol('chofer');
}

export function obtenerPadres(): Promise<Profile[]> {
  return obtenerUsuariosPorRol('padre');
}

/* ==========================================
   FUNCIÓN: ACTUALIZAR USUARIO
   ========================================== */
export type ActualizarUsuarioParams = {
  nombre?: string;
  apellido?: string;
  correo?: string;
  password?: string;
};

export async function actualizarUsuario(
  userId: string,
  params: ActualizarUsuarioParams,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('actualizar-usuario', {
      body: { userId, ...params },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'Error inesperado' };

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado',
    };
  }
}

/* ==========================================
   FUNCIÓN: ELIMINAR USUARIO (EDGE FUNCTION)
   ========================================== */
export type EliminarResponse = {
  success: boolean;
  error?: string;
};

export async function eliminarUsuario(userId: string): Promise<EliminarResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('eliminar-usuario', {
      body: { userId },
    });

    if (error) {
      return {
        success: false,
        error: `Error de servidor: ${error.message}`,
      };
    }

    if (!data || data.success !== true) {
      return {
        success: false,
        error: data?.error || 'No se pudo eliminar el usuario',
      };
    }

    return { success: true };

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado',
    };
  }
}