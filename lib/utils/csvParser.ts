/**
 * csvParser.ts
 * Utilidad para parsear texto CSV en el cliente (preview y validación básica).
 * El parsing definitivo y la inserción ocurren en la Edge Function import-entities.
 */

export type FilaCSV = Record<string, string>;

export interface ParseResult {
  headers: string[];
  rows: FilaCSV[];
  error?: string;
}

/** Parsea texto CSV con encabezado. Soporta comas y puntos y coma como separador. */
export function parseCSV(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], error: "El archivo está vacío." };
  }

  // Detectar separador (coma o punto y coma)
  const separator = lines[0].includes(";") ? ";" : ",";

  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase());

  if (headers.length === 0) {
    return { headers: [], rows: [], error: "No se encontraron columnas." };
  }

  const rows: FilaCSV[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map((v) => v.trim());
    if (values.length === 0 || (values.length === 1 && values[0] === "")) {
      continue;
    }
    const row: FilaCSV = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

/** Columnas requeridas por tipo de entidad */
const COLUMNAS_REQUERIDAS: Record<string, string[]> = {
  padres:      ["nombre", "correo"],
  conductores: ["nombre", "correo"],
  estudiantes: ["nombre"],
  buses:       ["placa", "capacidad"],
};

/** Valida que el CSV tenga las columnas mínimas para la entidad indicada */
export function validarFilaEntidad(
  headers: string[],
  entityType: string,
): { valido: boolean; faltantes: string[] } {
  const requeridas = COLUMNAS_REQUERIDAS[entityType] ?? [];
  const faltantes = requeridas.filter((col) => !headers.includes(col));
  return { valido: faltantes.length === 0, faltantes };
}

/** Convierte filas parseadas a texto JSON para enviar a la Edge Function */
export function rowsToJSON(rows: FilaCSV[]): string {
  return JSON.stringify(rows);
}
