import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, fuente } from './tema';

/** Ventana del "Sistema": panel con borde azul y título en mayúsculas. */
export function Ventana({ titulo, children, estilo }: { titulo?: string; children: ReactNode; estilo?: ViewStyle }) {
  return (
    <View style={[estilos.ventana, estilo]}>
      {titulo ? <Text style={[fuente.titulo, estilos.tituloVentana]}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

export function Boton({
  texto,
  onPress,
  variante = 'primario',
  deshabilitado,
}: {
  texto: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        estilos.boton,
        variante === 'secundario' && estilos.botonSecundario,
        pressed && { opacity: 0.7 },
        deshabilitado && { opacity: 0.4 },
      ]}
    >
      <Text style={[estilos.textoBoton, variante === 'secundario' && { color: color.acento }]}>{texto}</Text>
    </Pressable>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <Text style={estilos.vacio}>{children}</Text>;
}

export function MensajeError({ texto }: { texto: string | null }) {
  return texto ? <Text style={estilos.error}>{texto}</Text> : null;
}

const estilos = StyleSheet.create({
  ventana: {
    backgroundColor: color.panel,
    borderColor: color.borde,
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    shadowColor: color.acento,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  tituloVentana: { marginBottom: 10, textAlign: 'center' },
  boton: {
    backgroundColor: color.borde,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  botonSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.borde },
  textoBoton: { color: '#fff', fontWeight: '700', letterSpacing: 1 },
  vacio: { color: color.tenue, textAlign: 'center', paddingVertical: 12 },
  error: { color: color.fallo, marginBottom: 10 },
});
