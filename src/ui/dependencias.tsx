import { randomUUID } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Dependencias } from '../application/casosDeUso';
import { RepositorioSqlite } from '../infrastructure/repositorioSqlite';

const Contexto = createContext<Dependencias | null>(null);

export function ProveedorDependencias({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const deps = useMemo<Dependencias>(
    () => ({ repo: new RepositorioSqlite(db), reloj: () => new Date(), nuevoId: randomUUID, azar: Math.random }),
    [db],
  );
  return <Contexto.Provider value={deps}>{children}</Contexto.Provider>;
}

export function useDependencias(): Dependencias {
  const deps = useContext(Contexto);
  if (!deps) throw new Error('useDependencias fuera de ProveedorDependencias');
  return deps;
}
