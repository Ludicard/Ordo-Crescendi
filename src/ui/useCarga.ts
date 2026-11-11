import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos al enfocar la pantalla y los refresca periódicamente, para que
 * las misiones vencidas pasen a fallidas sin tener que salir y volver.
 */
export function useCarga<T>(cargar: () => Promise<T>, intervaloMs = 30_000) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  }, [cargar]);

  const recargar = useCallback(async () => {
    try {
      setDatos(await cargarRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
      const t = setInterval(() => void recargar(), intervaloMs);
      return () => clearInterval(t);
    }, [recargar, intervaloMs]),
  );

  return { datos, error, recargar };
}
