import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EntityType = 'padres' | 'conductores' | 'estudiantes' | 'buses';

interface ImportError {
  row: number;
  error: string;
}

interface Credencial {
  correo: string;
  password: string;
  nombre: string;
}

interface ImportResult {
  total: number;
  insertados: number;
  errores: number;
  detalles_errores: ImportError[];
  credenciales_generadas: Credencial[];
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_ROWS = 1000;
const BATCH_SIZE = 10;

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function traducirErrorAuth(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already been registered') || m.includes('already registered') || m.includes('email address is already')) {
    return 'El correo ya está registrado en el sistema';
  }
  if (m.includes('invalid email')) return 'El correo no es válido';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
  if (m.includes('unable to validate email address')) return 'No se pudo validar el correo electrónico';
  if (m.includes('email rate limit exceeded')) return 'Límite de registros alcanzado, intenta más tarde';
  if (m.includes('user not found')) return 'Usuario no encontrado';
  if (m.includes('invalid login credentials')) return 'Credenciales incorrectas';
  return msg; // fallback: mostrar original si no hay traducción
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('No autenticado');
    }

    // Verificar rol admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.rol !== 'admin') {
      throw new Error('Solo administradores pueden importar entidades');
    }

    const contentType = req.headers.get('content-type') ?? '';
    let rows: Record<string, string>[];
    let entityType: EntityType;

    if (contentType.includes('application/json')) {
      // Body JSON directo: { rows: [...], entity_type: '...' }
      const body = await req.json();
      rows = body.rows;
      entityType = body.entity_type;

      if (!Array.isArray(rows)) {
        throw new Error('rows debe ser un array');
      }
    } else {
      // FormData con archivo CSV/JSON
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      entityType = formData.get('entity_type') as EntityType;

      if (!file || !entityType) {
        throw new Error('file y entity_type son requeridos');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Archivo excede el límite de 2MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      }

      const content = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array de objetos');
        rows = parsed;
      } else if (fileName.endsWith('.csv')) {
        const parsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h: string) => h.trim().toLowerCase(),
        });
        if (parsed.errors.length > 0) throw new Error(`Error parseando CSV: ${parsed.errors[0].message}`);
        rows = parsed.data as Record<string, string>[];
      } else {
        throw new Error('Formato no soportado. Use .csv o .json');
      }
    }

    const validTypes: EntityType[] = ['padres', 'conductores', 'estudiantes', 'buses'];
    if (!validTypes.includes(entityType)) {
      throw new Error(`entity_type inválido. Valores permitidos: ${validTypes.join(', ')}`);
    }

    // Validar cantidad de filas
    if (rows.length > MAX_ROWS) {
      throw new Error(`Máximo ${MAX_ROWS} filas permitidas (archivo tiene ${rows.length})`);
    }

    if (rows.length === 0) {
      throw new Error('El archivo está vacío');
    }

    // Procesar en batches
    const result: ImportResult = {
      total: rows.length,
      insertados: 0,
      errores: 0,
      detalles_errores: [],
      credenciales_generadas: [],
    };

    const addError = (row: number, error: string) => {
      result.errores++;
      result.detalles_errores.push({ row, error });
    };

    // Procesar por batches de BATCH_SIZE
    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);

      const promises = batch.map(async (row, batchIndex) => {
        // +2: +1 por índice base-0, +1 por la fila de encabezado del CSV
        const rowNum = batchStart + batchIndex + 2;

        try {
          let credencial: Credencial | null = null;
          switch (entityType) {
            case 'padres':
              credencial = await importPadre(supabaseAdmin, row, rowNum, addError);
              break;
            case 'conductores':
              credencial = await importConductor(supabaseAdmin, row, rowNum, addError);
              break;
            case 'estudiantes':
              await importEstudiante(supabaseAdmin, row, rowNum, addError);
              break;
            case 'buses':
              await importBus(supabaseAdmin, row, rowNum, addError);
              break;
          }
          if (credencial) result.credenciales_generadas.push(credencial);
          result.insertados++;
        } catch (err) {
          addError(rowNum, err.message || 'Error desconocido');
        }
      });

      await Promise.all(promises);
    }

    // Registrar en import_logs
    await supabaseAdmin.from('import_logs').insert({
      entity_type: entityType,
      total_rows: result.total,
      inserted: result.insertados,
      errors: result.errores,
      error_details: result.detalles_errores,
      admin_id: user.id,
    });

    return new Response(JSON.stringify({
      success: true,
      resumen: result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error en import-entities:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// ==========================================
// Funciones de importación por entidad
// ==========================================

async function importPadre(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, string>,
  _rowNum: number,
  _addError: (row: number, error: string) => void,
): Promise<Credencial | null> {
  const correo = row.correo?.trim();
  const nombre = row.nombre?.trim();
  const apellido = row.apellido?.trim() || '';
  const passwordProvisto = row.contraseña?.trim() || row.contrasena?.trim();
  if (passwordProvisto && passwordProvisto.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  const password = passwordProvisto || generatePassword();

  if (!correo) throw new Error('correo es obligatorio');
  if (!nombre) throw new Error('nombre es obligatorio');

  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido, rol: 'padre' },
  });

  if (authError) throw new Error(traducirErrorAuth(authError.message));

  const userId = userData.user.id;

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, correo, nombre, apellido, rol: 'padre' });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Profile: ${profileError.message}`);
  }

  const { error: roleError } = await supabase
    .from('padres')
    .insert({ id: userId });

  if (roleError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Tabla padres: ${roleError.message}`);
  }

  // Solo retornar credencial si la contraseña fue autogenerada
  return passwordProvisto ? null : { correo, password, nombre };
}

async function importConductor(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, string>,
  _rowNum: number,
  _addError: (row: number, error: string) => void,
): Promise<Credencial | null> {
  const correo = row.correo?.trim();
  const nombre = row.nombre?.trim();
  const apellido = row.apellido?.trim() || '';
  const passwordProvisto = row.contraseña?.trim() || row.contrasena?.trim();
  if (passwordProvisto && passwordProvisto.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  const password = passwordProvisto || generatePassword();

  if (!correo) throw new Error('correo es obligatorio');
  if (!nombre) throw new Error('nombre es obligatorio');

  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido, rol: 'chofer' },
  });

  if (authError) throw new Error(traducirErrorAuth(authError.message));

  const userId = userData.user.id;

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, correo, nombre, apellido, rol: 'chofer' });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Profile: ${profileError.message}`);
  }

  const { error: roleError } = await supabase
    .from('choferes')
    .insert({ id: userId });

  if (roleError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(`Tabla choferes: ${roleError.message}`);
  }

  // Solo retornar credencial si la contraseña fue autogenerada
  return passwordProvisto ? null : { correo, password, nombre };
}

async function importEstudiante(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, string>,
  _rowNum: number,
  _addError: (row: number, error: string) => void,
) {
  const nombre = row.nombre?.trim();
  const apellido = row.apellido?.trim() || '';
  const nombreParada = row.parada?.trim();

  if (!nombre) throw new Error('nombre es obligatorio');

  const insertData: Record<string, unknown> = { nombre, apellido };

  // Buscar parada por nombre si se proporcionó
  if (nombreParada) {
    const { data: parada, error } = await supabase
      .from('paradas')
      .select('id')
      .ilike('nombre', nombreParada)
      .single();

    if (error || !parada) {
      throw new Error(`Parada '${nombreParada}' no encontrada`);
    }
    insertData.id_parada = parada.id;
  }

  const { error: insertError } = await supabase
    .from('estudiantes')
    .insert(insertData);

  if (insertError) throw new Error(`Insert: ${insertError.message}`);
}

async function importBus(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, string>,
  _rowNum: number,
  _addError: (row: number, error: string) => void,
) {
  const placa = row.placa?.trim();
  const capacidad = parseInt(row.capacidad?.trim() || '0', 10);

  if (!placa) throw new Error('Placa es obligatoria');
  if (isNaN(capacidad) || capacidad <= 0) throw new Error('Capacidad debe ser un número positivo');

  const { error: insertError } = await supabase
    .from('busetas')
    .insert({ placa, capacidad });

  if (insertError) {
    throw new Error(`Insert: ${insertError.message}`);
  }
}
