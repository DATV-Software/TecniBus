import {
  getMyEstudiantes,
  type EstudianteDelPadre,
} from "@/lib/services/padres.service";
import { useEffect, useState } from "react";

export function useParentEstudiantes() {
  const [estudiantes, setEstudiantes] = useState<EstudianteDelPadre[]>([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<EstudianteDelPadre | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEstudiantes = async () => {
    setLoading(true);
    const data = await getMyEstudiantes();
    setEstudiantes(data);
    if (data.length > 0) setEstudianteSeleccionado(data[0]);
    setLoading(false);
  };

  useEffect(() => {
    void loadEstudiantes();
  }, []);  

  return {
    estudiantes,
    estudianteSeleccionado,
    setEstudianteSeleccionado,
    loading,
    loadEstudiantes,
  };
}
