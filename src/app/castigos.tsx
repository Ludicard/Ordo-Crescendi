import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  cumplirCastigo,
  estadoCastigos,
  girarRuleta,
  nuevoCastigo,
  quitarCastigo,
  rerollRuleta,
} from '../application/casosDeUso';
import { Boton, MensajeError, Vacio, Ventana } from '../ui/componentes';
import { useDependencias } from '../ui/dependencias';
import { Ruleta } from '../ui/Ruleta';
import { color } from '../ui/tema';
import { useCarga } from '../ui/useCarga';

export default function PantallaCastigos() {
  const deps = useDependencias();
  const { datos, error, recargar } = useCarga(() => estadoCastigos(deps));
  const [giro, setGiro] = useState(0);
  const [girando, setGirando] = useState(false);
  /** Resultado que muestra la ruleta; se fija junto con `giro` para animar hacia él. */
  const [mostrado, setMostrado] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const actual = datos?.actual ?? null;
  const pool = datos?.pool ?? [];

  const lanzar = async (accion: typeof girarRuleta) => {
    if (!actual) return;
    try {
      const a = await accion(deps, actual.id); // el resultado se guarda antes de animar
      setMostrado(a.texto);
      setGirando(true);
      setGiro((g) => g + 1);
      await recargar();
    } catch (e) {
      Alert.alert('Ruleta', e instanceof Error ? e.message : String(e));
    }
  };

  const confirmarCumplido = () => {
    if (!actual) return;
    Alert.alert('Castigo cumplido', `¿Cumpliste "${actual.texto}"?`, [
      { text: 'Todavía no', style: 'cancel' },
      {
        text: 'Sí, cumplido',
        onPress: async () => {
          await cumplirCastigo(deps, actual.id);
          setGiro(0);
          setMostrado(null);
          await recargar();
        },
      },
    ]);
  };

  const agregar = async () => {
    try {
      await nuevoCastigo(deps, texto);
      setTexto('');
      setErrorForm(null);
      await recargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : String(e));
    }
  };

  const quitar = (id: string, t: string) =>
    Alert.alert('Quitar castigo', `¿Quitar "${t}" de la pool?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await quitarCastigo(deps, id);
          await recargar();
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <MensajeError texto={error} />

      {actual ? (
        <Ventana titulo="CASTIGO" estilo={estilos.ventanaCastigo}>
          <Text style={estilos.aviso}>Fallaste misiones del {actual.fecha}.</Text>
          <Text style={estilos.tenue}>Las misiones están bloqueadas hasta que cumplas el castigo.</Text>
          <Ruleta
            textos={pool.map((c) => c.texto)}
            resultado={giro > 0 ? mostrado : actual.texto}
            giro={giro}
            onFin={() => setGirando(false)}
          />
          {actual.estado === 'sin_girar' ? (
            pool.length > 0 ? (
              <Boton texto="Girar ruleta" onPress={() => lanzar(girarRuleta)} deshabilitado={girando} />
            ) : (
              <Text style={estilos.aviso}>Añade castigos a la pool para poder girar.</Text>
            )
          ) : (
            <View style={{ gap: 10 }}>
              <Boton texto="Marcar como cumplido" onPress={confirmarCumplido} deshabilitado={girando} />
              {datos?.puedeReroll ? (
                <Boton
                  texto="No puedo cumplirlo: reroll (1)"
                  variante="secundario"
                  onPress={() => lanzar(rerollRuleta)}
                  deshabilitado={girando}
                />
              ) : (
                <Text style={estilos.tenue}>
                  {actual.rerollUsado ? 'Reroll ya usado.' : 'No hay otro castigo para el reroll.'}
                </Text>
              )}
            </View>
          )}
          {datos && datos.pendientes > 1 ? (
            <Text style={[estilos.tenue, { marginTop: 10 }]}>Castigos pendientes: {datos.pendientes}</Text>
          ) : null}
        </Ventana>
      ) : (
        <Ventana titulo="CASTIGOS">
          <Vacio>No tienes castigos pendientes.</Vacio>
        </Ventana>
      )}

      <Ventana titulo="POOL DE CASTIGOS">
        {pool.length === 0 ? <Vacio>Sin castigos en la pool, fallar no tiene consecuencia.</Vacio> : null}
        {pool.map((c) => (
          <View key={c.id} style={estilos.fila}>
            <Text style={estilos.texto}>{c.texto}</Text>
            <Boton texto="Quitar" variante="secundario" onPress={() => quitar(c.id, c.texto)} />
          </View>
        ))}
        <View style={estilos.form}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Ej. 4 horas sin internet"
            placeholderTextColor={color.tenue}
            style={estilos.input}
            onSubmitEditing={agregar}
          />
          <Boton texto="Añadir" onPress={agregar} deshabilitado={!texto.trim()} />
        </View>
        <MensajeError texto={errorForm} />
      </Ventana>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  ventanaCastigo: { borderColor: color.fallo, shadowColor: color.fallo },
  aviso: { color: color.fallo, fontWeight: '700', textAlign: 'center' },
  tenue: { color: color.tenue, textAlign: 'center', marginTop: 4 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.bordeSuave,
  },
  texto: { color: color.texto, fontSize: 15, flex: 1 },
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
