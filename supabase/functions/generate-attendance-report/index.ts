import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { makeCorsHeaders } from "../_shared/cors.ts";

interface ReportRequest {
  fecha_inicio: string;
  fecha_fin: string;
  id_ruta?: string;
  id_estudiante?: string;
  estado?: string;
}

interface AsistenciaRow {
  id: string;
  fecha: string;
  estado: string;
  estudiante_nombre: string;
  estudiante_apellido: string;
  ruta_nombre: string;
}

Deno.serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
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
      throw new Error('Solo administradores pueden generar reportes');
    }

    // Parsear body
    const { fecha_inicio, fecha_fin, id_ruta, id_estudiante, estado }: ReportRequest = await req.json();

    if (!fecha_inicio || !fecha_fin) {
      throw new Error('fecha_inicio y fecha_fin son requeridos');
    }

    // Query asistencias con JOINs
    let query = supabaseAdmin
      .from('asistencias')
      .select(`
        id,
        fecha,
        estado,
        estudiantes!inner (nombre, apellido),
        rutas (nombre)
      `)
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin)
      .order('fecha', { ascending: true });

    if (id_ruta) {
      query = query.eq('id_ruta', id_ruta);
    }
    if (id_estudiante) {
      query = query.eq('id_estudiante', id_estudiante);
    }
    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data: asistencias, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Error consultando asistencias: ${queryError.message}`);
    }

    // Transformar datos
    const rows: AsistenciaRow[] = (asistencias || []).map((a: Record<string, unknown>) => {
      const est = a.estudiantes as Record<string, string> | null;
      const ruta = a.rutas as Record<string, string> | null;
      return {
        id: a.id as string,
        fecha: a.fecha as string,
        estado: a.estado as string,
        estudiante_nombre: est?.nombre ?? '',
        estudiante_apellido: est?.apellido ?? '',
        ruta_nombre: ruta?.nombre ?? 'Sin ruta',
      };
    });

    // Calcular estadísticas
    const total = rows.length;
    const presentes = rows.filter(r => r.estado === 'presente' || r.estado === 'completado').length;
    const ausentes = rows.filter(r => r.estado === 'ausente').length;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 1000) / 10 : 0;

    const estadisticas = { total, presentes, ausentes, porcentaje };

    // Generar PDF con pdf-lib
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const margin = 50;
    const lineHeight = 18;
    const colWidths = [80, 140, 100, 175]; // fecha, estudiante, estado, ruta

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Helper: nueva página si necesario
    const ensureSpace = (needed: number) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    // Helper: dibujar texto
    const drawText = (text: string, x: number, yPos: number, options?: { font?: typeof font; size?: number; color?: ReturnType<typeof rgb> }) => {
      page.drawText(text, {
        x,
        y: yPos,
        size: options?.size ?? 10,
        font: options?.font ?? font,
        color: options?.color ?? rgb(0, 0, 0),
      });
    };

    // Helper: truncar texto
    const truncate = (text: string, maxLen: number): string => {
      return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
    };

    // === HEADER ===
    drawText('TecniBus', margin, y, { font: fontBold, size: 20, color: rgb(0.239, 0.655, 0.843) });
    y -= 24;
    drawText('Reporte de Asistencia', margin, y, { font: fontBold, size: 14 });
    y -= 20;

    // Fecha de generación
    const ahora = new Date().toISOString().split('T')[0];
    drawText(`Generado: ${ahora}`, margin, y, { size: 9, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;

    // Filtros aplicados
    drawText(`Periodo: ${fecha_inicio} a ${fecha_fin}`, margin, y, { size: 9 });
    y -= 14;
    if (id_ruta) {
      drawText(`Ruta: ${id_ruta}`, margin, y, { size: 9 });
      y -= 14;
    }
    if (id_estudiante) {
      drawText(`Estudiante: ${id_estudiante}`, margin, y, { size: 9 });
      y -= 14;
    }
    if (estado) {
      drawText(`Estado filtrado: ${estado}`, margin, y, { size: 9 });
      y -= 14;
    }

    y -= 10;

    // === LÍNEA SEPARADORA ===
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;

    // === TABLA HEADER ===
    const tableHeaders = ['Fecha', 'Estudiante', 'Estado', 'Ruta'];
    let xPos = margin;
    for (let i = 0; i < tableHeaders.length; i++) {
      drawText(tableHeaders[i], xPos, y, { font: fontBold, size: 10 });
      xPos += colWidths[i];
    }
    y -= 6;

    // Línea bajo header
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= lineHeight;

    // === FILAS DE DATOS ===
    for (const row of rows) {
      ensureSpace(lineHeight + 4);

      xPos = margin;
      drawText(row.fecha, xPos, y, { size: 9 });
      xPos += colWidths[0];

      const nombreCompleto = truncate(`${row.estudiante_nombre} ${row.estudiante_apellido}`, 22);
      drawText(nombreCompleto, xPos, y, { size: 9 });
      xPos += colWidths[1];

      // Color según estado
      const estadoColor = row.estado === 'ausente'
        ? rgb(0.8, 0.1, 0.1)
        : row.estado === 'presente' || row.estado === 'completado'
          ? rgb(0.1, 0.6, 0.1)
          : rgb(0.4, 0.4, 0.4);
      drawText(row.estado, xPos, y, { size: 9, color: estadoColor });
      xPos += colWidths[2];

      drawText(truncate(row.ruta_nombre, 28), xPos, y, { size: 9 });

      y -= lineHeight;
    }

    // === RESUMEN ESTADÍSTICO ===
    y -= 10;
    ensureSpace(80);

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;

    drawText('Resumen Estadistico', margin, y, { font: fontBold, size: 12 });
    y -= 20;
    drawText(`Total registros: ${estadisticas.total}`, margin, y, { size: 10 });
    y -= 16;
    drawText(`Presentes: ${estadisticas.presentes}`, margin, y, { size: 10, color: rgb(0.1, 0.6, 0.1) });
    y -= 16;
    drawText(`Ausentes: ${estadisticas.ausentes}`, margin, y, { size: 10, color: rgb(0.8, 0.1, 0.1) });
    y -= 16;
    drawText(`Porcentaje asistencia: ${estadisticas.porcentaje}%`, margin, y, { font: fontBold, size: 10 });

    // Serializar PDF
    const pdfBytes = await pdfDoc.save();

    // Subir a bucket reportes
    const fileName = `reporte_asistencia_${fecha_inicio}_${fecha_fin}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('reportes')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error subiendo PDF: ${uploadError.message}`);
    }

    // Crear signed URL (10 minutos)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('reportes')
      .createSignedUrl(fileName, 600);

    if (signedError) {
      throw new Error(`Error generando URL firmada: ${signedError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      url: signedData.signedUrl,
      estadisticas,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error en generate-attendance-report:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
