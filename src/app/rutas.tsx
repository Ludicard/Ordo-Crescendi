import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { archivarRutina, nuevaRuta, rutasConProgreso, rutinasActivas } from '../application/casosDeUso';
import { Boton, MensajeError, Vacio, Ventana } from '../ui/componentes';
import { useDependencias } from '../ui/dependencias';
import { color } from '../ui/tema';
import { useCarga } from '../ui/useCarga';

export default function PantallaRutas() {
  const deps = useDependencias();
  const [nombre, setNombre] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const { datos, error, recargar } = useCarga(async () => {
    const [rutas, rutinas] = await Promise.all([rutasConProgreso(deps), rutinasActivas(deps)]);
    return { rutas, rutinas };
  });

  const crear = async () => {
    try {
      await nuevaRuta(deps, nombre);
      setNombre('');
      setErrorForm(null);
      await recargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : String(e));
    }
  };

  const archivar = (id: string, titulo: string) =>
    Alert.alert('Archivar rutina', `"${titulo}" dejará de generarse. Las misiones ya creadas se conservan.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Archivar',
        style: 'destructive',
        onPress: async () => {
          await archivarRutina(deps, id);
          await recargar();
        },
      },
    ]);

  const nombreRuta = new Map(datos?.rutas.map((r) => [r.id, r.nombre]));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <MensajeError texto={error} />
      <Ventana titulo="RUTAS">
        {datos?.rutas.length === 0 ? <Vacio>Aún no hay rutas.</Vacio> : null}
        {datos?.rutas.map((r) => (
          <View key={r.id} style={estilos.fila}>
            <View style={estilos.rango}>
              <Text style={estilos.letraRango}>{r.rango}</Text>
            </View>
            <Text style={estilos.nombre}>{r.nombre}</Text>
            <Text style={estilos.exp}>{r.exp} EXP</Text>
          </View>
        ))}
        <View style={estilos.form}>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nueva ruta"
            placeholderTextColor={color.tenue}
            style={estilos.input}
            onSubmitEditing={crear}
          />
          <Boton texto="Crear" onPress={crear} deshabilitado={!nombre.trim()} />
        </View>
        <MensajeError texto={errorForm} />
      </Ventana>

      <Ventana titulo="RUTINAS">
        {datos?.rutinas.length === 0 ? <Vacio>No hay rutinas activas.</Vacio> : null}
        {datos?.rutinas.map((p) => (
          <View key={p.id} style={estilos.fila}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.nombre}>{p.titulo}</Text>
              <Text style={estilos.meta}>
                hasta {p.horaLimite}
                {p.rutaId ? ` · ${nombreRuta.get(p.rutaId) ?? ''} · +${p.exp} EXP` : ''}
              </Text>
            </View>
            <Boton texto="Archivar" variante="secundario" onPress={() => archivar(p.id, p.titulo)} />
          </View>
        ))}
      </Ventana>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.bordeSuave,
  },
  rango: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: color.acento,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letraRango: { color: color.brillo, fontSize: 18, fontWeight: '800' },
  nombre: { color: color.texto, fontSize: 16, flex: 1 },
  meta: { color: color.tenue, fontSize: 12, marginTop: 2 },
  exp: { color: color.brillo, fontWeight: '700' },
  form: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  input: {
    flex: 1,
    color: color.texto,
    borderWidth: 1,
    borderColor: color.bordeSuave,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
