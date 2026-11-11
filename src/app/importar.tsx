import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { analizarTextoImportacion, importar, rutasConProgreso } from '../application/casosDeUso';
import { instruccionesParaIA } from '../application/instruccionesIA';
import { diaLocal } from '../domain/fechas';
import type { ResultadoImportacion } from '../domain/importacion';
import { Boton, Ventana } from '../ui/componentes';
import { useDependencias } from '../ui/dependencias';
import { color } from '../ui/tema';

export default function PantallaImportar() {
  const deps = useDependencias();
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  const compartirInstrucciones = async () => {
    const rutas = await rutasConProgreso(deps);
    await Share.share({ message: instruccionesParaIA(rutas.map((r) => r.nombre), diaLocal(deps.reloj())) });
  };

  const analizar = async () => setResultado(await analizarTextoImportacion(deps, texto));

  const confirmar = async () => {
    const r = await importar(deps, texto);
    setResultado(r);
    if (r.ok) {
      setTexto('');
      setResultado(null);
      Alert.alert(
        'Importación completada',
        `${r.plan.plantillas.length} rutinas, ${r.plan.misiones.length} misiones y ${r.plan.rutasNuevas.length} rutas nuevas.`,
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Ventana titulo="GENERAR CON IA">
        <Text style={estilos.ayuda}>
          Comparte las instrucciones con tu IA, añade tus objetivos y pega aquí el JSON que te devuelva. La IA asigna la
          EXP de cada misión.
        </Text>
        <Boton texto="Compartir instrucciones para la IA" variante="secundario" onPress={compartirInstrucciones} />
      </Ventana>

      <Ventana titulo="IMPORTAR MISIONES">
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setResultado(null);
          }}
          placeholder='{ "version": 1, "misiones": [ ... ] }'
          placeholderTextColor={color.tenue}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={estilos.input}
        />
        <Boton texto="Analizar" onPress={analizar} deshabilitado={!texto.trim()} />
      </Ventana>

      {resultado && !resultado.ok ? (
        <Ventana titulo="ERRORES">
          {resultado.errores.map((e, i) => (
            <Text key={i} style={estilos.error}>
              • {e}
            </Text>
          ))}
        </Ventana>
      ) : null}

      {resultado?.ok ? (
        <Ventana titulo="VISTA PREVIA">
          <Text style={estilos.linea}>Rutinas: {resultado.plan.plantillas.length}</Text>
          <Text style={estilos.linea}>Misiones puntuales: {resultado.plan.misiones.length}</Text>
          {resultado.plan.rutasNuevas.length > 0 ? (
            <Text style={estilos.linea}>
              Rutas nuevas: {resultado.plan.rutasNuevas.map((r) => r.nombre).join(', ')}
            </Text>
          ) : null}
          {[...resultado.plan.plantillas, ...resultado.plan.misiones].map((m) => (
            <Text key={m.id} style={estilos.item}>
              · {m.titulo} — hasta {m.horaLimite} · {m.exp} EXP
            </Text>
          ))}
          {resultado.plan.avisos.map((a, i) => (
            <Text key={i} style={estilos.aviso}>
              ⚠ {a}
            </Text>
          ))}
          <View style={{ marginTop: 12 }}>
            <Boton texto="Confirmar importación" onPress={confirmar} />
          </View>
        </Ventana>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  ayuda: { color: color.tenue, marginBottom: 12 },
  input: {
    minHeight: 180,
    color: color.texto,
    fontFamily: 'monospace',
    fontSize: 12,
    borderWidth: 1,
    borderColor: color.bordeSuave,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  error: { color: color.fallo, marginBottom: 4 },
  linea: { color: color.texto, marginBottom: 4 },
  item: { color: color.tenue, fontSize: 13, marginTop: 2 },
  aviso: { color: '#F5C26B', fontSize: 13, marginTop: 6 },
});
