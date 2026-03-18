export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      asignaciones_ruta: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          dias_semana: string[] | null
          hora_fin: string
          hora_inicio: string
          id: string
          id_chofer: string
          id_ruta: string
          polyline_coordinates: Json | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          dias_semana?: string[] | null
          hora_fin: string
          hora_inicio: string
          id?: string
          id_chofer: string
          id_ruta: string
          polyline_coordinates?: Json | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          dias_semana?: string[] | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          id_chofer?: string
          id_ruta?: string
          polyline_coordinates?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_ruta_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_ruta_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "vista_conteo_choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_ruta_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_ruta_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "vista_conteo_rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencias: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_asistencia"]
          fecha: string
          hora_entrega: string | null
          hora_recogida: string | null
          id: string
          id_chofer: string
          id_estudiante: string
          id_ruta: string | null
          latitud: number | null
          longitud: number | null
          modificado_por: string | null
          notas: string | null
          ubicacion_entrega: unknown
          ubicacion_recogida: unknown
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_asistencia"]
          fecha?: string
          hora_entrega?: string | null
          hora_recogida?: string | null
          id?: string
          id_chofer: string
          id_estudiante: string
          id_ruta?: string | null
          latitud?: number | null
          longitud?: number | null
          modificado_por?: string | null
          notas?: string | null
          ubicacion_entrega?: unknown
          ubicacion_recogida?: unknown
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_asistencia"]
          fecha?: string
          hora_entrega?: string | null
          hora_recogida?: string | null
          id?: string
          id_chofer?: string
          id_estudiante?: string
          id_ruta?: string | null
          latitud?: number | null
          longitud?: number | null
          modificado_por?: string | null
          notas?: string | null
          ubicacion_entrega?: unknown
          ubicacion_recogida?: unknown
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "vista_conteo_choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "vista_conteo_estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "vista_conteo_rutas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencias_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      busetas: {
        Row: {
          capacidad: number
          id: string
          placa: string
        }
        Insert: {
          capacidad: number
          id?: string
          placa: string
        }
        Update: {
          capacidad?: number
          id?: string
          placa?: string
        }
        Relationships: []
      }
      choferes: {
        Row: {
          id: string
          id_buseta: string | null
          tipo_licencia: string | null
        }
        Insert: {
          id: string
          id_buseta?: string | null
          tipo_licencia?: string | null
        }
        Update: {
          id?: string
          id_buseta?: string | null
          tipo_licencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choferes_id_buseta_fkey"
            columns: ["id_buseta"]
            isOneToOne: true
            referencedRelation: "busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choferes_id_buseta_fkey"
            columns: ["id_buseta"]
            isOneToOne: true
            referencedRelation: "vista_conteo_busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choferes_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          created_at: string | null
          descripcion: string | null
          id: string
          updated_at: string | null
          valor: Json
        }
        Insert: {
          clave: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          updated_at?: string | null
          valor: Json
        }
        Update: {
          clave?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json
        }
        Relationships: []
      }
      estados_geocercas_recorrido: {
        Row: {
          created_at: string
          entrada_geocerca_at: string | null
          estado: Database["public"]["Enums"]["estado_geocerca"]
          id: string
          id_estudiante: string
          id_parada: string
          id_recorrido: string
          radio_metros: number
          salida_geocerca_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entrada_geocerca_at?: string | null
          estado?: Database["public"]["Enums"]["estado_geocerca"]
          id?: string
          id_estudiante: string
          id_parada: string
          id_recorrido: string
          radio_metros?: number
          salida_geocerca_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entrada_geocerca_at?: string | null
          estado?: Database["public"]["Enums"]["estado_geocerca"]
          id?: string
          id_estudiante?: string
          id_parada?: string
          id_recorrido?: string
          radio_metros?: number
          salida_geocerca_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estados_geocercas_recorrido_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_geocercas_recorrido_id_estudiante_fkey"
            columns: ["id_estudiante"]
            isOneToOne: false
            referencedRelation: "vista_conteo_estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_geocercas_recorrido_id_parada_fkey"
            columns: ["id_parada"]
            isOneToOne: false
            referencedRelation: "paradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_geocercas_recorrido_id_recorrido_fkey"
            columns: ["id_recorrido"]
            isOneToOne: false
            referencedRelation: "estados_recorrido"
            referencedColumns: ["id"]
          },
        ]
      }
      estados_recorrido: {
        Row: {
          activo: boolean
          created_at: string | null
          eta_paradas: Json | null
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          id_asignacion: string
          id_chofer: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          eta_paradas?: Json | null
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          id_asignacion: string
          id_chofer: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          eta_paradas?: Json | null
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          id_asignacion?: string
          id_chofer?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estados_recorrido_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_ruta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_recorrido_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_recorrido_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "vista_conteo_choferes"
            referencedColumns: ["id"]
          },
        ]
      }
      estudiantes: {
        Row: {
          apellido: string
          created_at: string | null
          id: string
          id_padre: string | null
          id_parada: string | null
          nombre: string
        }
        Insert: {
          apellido: string
          created_at?: string | null
          id?: string
          id_padre?: string | null
          id_parada?: string | null
          nombre: string
        }
        Update: {
          apellido?: string
          created_at?: string | null
          id?: string
          id_padre?: string | null
          id_parada?: string | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudiantes_id_padre_fkey"
            columns: ["id_padre"]
            isOneToOne: false
            referencedRelation: "padres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estudiantes_id_parada_fkey"
            columns: ["id_parada"]
            isOneToOne: false
            referencedRelation: "paradas"
            referencedColumns: ["id"]
          },
        ]
      }
      padres: {
        Row: {
          id: string
          ref_domicilio: string | null
          tipo_representante: string | null
        }
        Insert: {
          id: string
          ref_domicilio?: string | null
          tipo_representante?: string | null
        }
        Update: {
          id?: string
          ref_domicilio?: string | null
          tipo_representante?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "padres_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas: {
        Row: {
          direccion: string | null
          hora_aprox: string | null
          id: string
          id_ruta: string | null
          latitud: number
          longitud: number
          nombre: string | null
          orden: number | null
        }
        Insert: {
          direccion?: string | null
          hora_aprox?: string | null
          id?: string
          id_ruta?: string | null
          latitud: number
          longitud: number
          nombre?: string | null
          orden?: number | null
        }
        Update: {
          direccion?: string | null
          hora_aprox?: string | null
          id?: string
          id_ruta?: string | null
          latitud?: number
          longitud?: number
          nombre?: string | null
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "paradas_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: false
            referencedRelation: "vista_conteo_rutas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellido: string
          avatar_url: string | null
          correo: string
          created_at: string | null
          id: string
          nombre: string
          onboarding_completed: boolean
          push_token: string | null
          rol: string
          telefono: string | null
        }
        Insert: {
          apellido: string
          avatar_url?: string | null
          correo: string
          created_at?: string | null
          id: string
          nombre: string
          onboarding_completed?: boolean
          push_token?: string | null
          rol: string
          telefono?: string | null
        }
        Update: {
          apellido?: string
          avatar_url?: string | null
          correo?: string
          created_at?: string | null
          id?: string
          nombre?: string
          onboarding_completed?: boolean
          push_token?: string | null
          rol?: string
          telefono?: string | null
        }
        Relationships: []
      }
      rutas: {
        Row: {
          estado: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          nombre: string
          tipo: string | null
        }
        Insert: {
          estado?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nombre: string
          tipo?: string | null
        }
        Update: {
          estado?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nombre?: string
          tipo?: string | null
        }
        Relationships: []
      }
      ubicaciones_bus: {
        Row: {
          created_at: string | null
          heading: number | null
          id: string
          id_asignacion: string
          id_chofer: string
          latitud: number
          longitud: number
          precision_gps: number | null
          ubicacion_timestamp: string
          velocidad: number | null
        }
        Insert: {
          created_at?: string | null
          heading?: number | null
          id?: string
          id_asignacion: string
          id_chofer: string
          latitud: number
          longitud: number
          precision_gps?: number | null
          ubicacion_timestamp?: string
          velocidad?: number | null
        }
        Update: {
          created_at?: string | null
          heading?: number | null
          id?: string
          id_asignacion?: string
          id_chofer?: string
          latitud?: number
          longitud?: number
          precision_gps?: number | null
          ubicacion_timestamp?: string
          velocidad?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_bus_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_ruta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ubicaciones_bus_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "choferes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ubicaciones_bus_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: false
            referencedRelation: "vista_conteo_choferes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vista_conteo_busetas: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
      vista_conteo_choferes: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choferes_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_conteo_estudiantes: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
      vista_conteo_rutas: {
        Row: {
          estado: string | null
          id: string | null
        }
        Insert: {
          estado?: string | null
          id?: string | null
        }
        Update: {
          estado?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      clear_push_token: { Args: never; Returns: boolean }
      entrada_geocerca: {
        Args: {
          p_id_asignacion: string
          p_id_chofer: string
          p_id_estudiante: string
        }
        Returns: Json
      }
      es_hora_recorrido: { Args: { p_id_asignacion: string }; Returns: boolean }
      esta_en_buseta: { Args: { p_id_estudiante: string }; Returns: boolean }
      finalizar_recorrido: {
        Args: { p_id_asignacion: string }
        Returns: boolean
      }
      get_chofer_de_ruta: { Args: { p_id_ruta: string }; Returns: string }
      get_estado_recorrido: {
        Args: { p_id_asignacion: string }
        Returns: {
          activo: boolean
          hora_fin: string
          hora_inicio: string
        }[]
      }
      get_estado_recorrido_por_ruta: {
        Args: { p_id_ruta: string }
        Returns: {
          activo: boolean
          hora_fin: string
          hora_inicio: string
          id_asignacion: string
        }[]
      }
      get_mis_estudiantes_con_ruta: {
        Args: never
        Returns: {
          apellido: string
          id: string
          id_parada: string
          nombre: string
          parada_direccion: string
          parada_latitud: number
          parada_longitud: number
          parada_nombre: string
          parada_orden: number
          ruta_id: string
          ruta_nombre: string
        }[]
      }
      get_nombre_chofer_de_ruta: {
        Args: { p_id_ruta: string }
        Returns: string
      }
      get_polyline_asignacion: {
        Args: { p_id_asignacion: string }
        Returns: Json
      }
      get_push_tokens_padres_ruta: {
        Args: { p_id_asignacion: string }
        Returns: {
          id_padre: string
          nombre_padre: string
          push_token: string
        }[]
      }
      get_recorridos_chofer_hoy: {
        Args: { p_id_chofer: string }
        Returns: {
          descripcion: string
          estado_ruta: string
          hora_fin: string
          hora_inicio: string
          id: string
          id_ruta: string
          nombre_ruta: string
          tipo_ruta: string
        }[]
      }
      get_siguiente_estudiante_geocerca: {
        Args: { p_id_asignacion: string }
        Returns: {
          apellido: string
          estado: Database["public"]["Enums"]["estado_geocerca"]
          id_estudiante: string
          id_parada: string
          nombre: string
          orden_parada: number
          parada_latitud: number
          parada_longitud: number
          parada_nombre: string
        }[]
      }
      get_ultima_asistencia_hoy: {
        Args: { p_id_estudiante: string }
        Returns: {
          fecha_hora: string
          id: string
          tipo: string
        }[]
      }
      get_ultima_ubicacion_bus: {
        Args: { p_id_asignacion: string }
        Returns: {
          heading: number
          latitud: number
          longitud: number
          precision_gps: number
          ubicacion_timestamp: string
          velocidad: number
        }[]
      }
      guardar_ubicacion_chofer: {
        Args: {
          p_heading?: number
          p_id_asignacion: string
          p_id_chofer: string
          p_latitud: number
          p_longitud: number
          p_precision_gps?: number
          p_velocidad?: number
        }
        Returns: string
      }
      inicializar_estados_geocercas: {
        Args: { p_id_asignacion: string; p_id_chofer: string }
        Returns: undefined
      }
      iniciar_recorrido: { Args: { p_id_asignacion: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      marcar_estudiante_completado: {
        Args: {
          p_estado_asistencia: string
          p_id_asignacion: string
          p_id_chofer: string
          p_id_estudiante: string
        }
        Returns: undefined
      }
      salida_geocerca: {
        Args: {
          p_id_asignacion: string
          p_id_chofer: string
          p_id_estudiante: string
        }
        Returns: undefined
      }
      update_push_token: { Args: { p_push_token: string }; Returns: boolean }
    }
    Enums: {
      estado_asistencia: "presente" | "ausente" | "completado"
      estado_geocerca: "pendiente" | "en_zona" | "completado" | "omitido"
      user_role: "admin" | "padre" | "chofer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_asistencia: ["presente", "ausente", "completado"],
      estado_geocerca: ["pendiente", "en_zona", "completado", "omitido"],
      user_role: ["admin", "padre", "chofer"],
    },
  },
} as const
