import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  completar,
  eliminarMisionPendiente,
  estadoCastigos,
  misionesDeHoy,
  rutasConProgreso,
} from '../application/casosDeUso';
import { diaLocal } from '../domain/fechas';
import type { Mision } from '../domain/tipos';
import { Boton, MensajeError, Vacio, Ventana } from '../ui/componentes';
import { useDependencias } from '../ui/dependencias';
import { color } from '../ui/tema';
import { useCarga } from '../ui/useCarga';

const ETIQUETA_TIPO: Record<Mision['tipo'], string> = {
  rutina: 'Rutina',
  algo_bueno: 'Algo bueno',
  objetivo_ruta: 'Objetivo de ruta',
};

export default function PantallaMisiones() {
  const deps = useDependencias();
  const { datos, error, recargar } = useCarga(async () => {
    const misiones = await misionesDeHoy(deps);
    const [rutas, castigos] = await Promise.all([rutasConProgreso(deps), estadoCastigos(deps)]);
    return { misiones, castigos, nombreRuta: new Map(rutas.map((r) => [r.id, r.nombre])) };
  });

  const alCompletar = async (m: Mision) => {
    try {
      await completar(deps, m.id);
    } catch (e) {
      Alert.alert('No se pudo completar', e instanceof Error ? e.message : String(e));
    }
    await recargar();
  };

  const alMantener = (m: Mision) => {
    if (m.estado !== 'pendiente') return;
    Alert.alert('Eliminar misión', `¿Eliminar "${m.titulo}" de hoy?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarMisionPendiente(deps, m.id);
          await recargar();
        },
      },
    ]);
  };

  const misiones = datos?.misiones ?? [];
  const hechas = misiones.filter((m) => m.estado === 'completada').length;
  const bloqueado = datos?.castigos.bloqueado ?? false;

  return (
    <FlatList
      contentContainerStyle={estilos.contenido}
      data={misiones}
      keyExtractor={(m) => m.id}
      ListHeaderComponent={
        <>
          <Ventana titulo="MISIONES DIARIAS">
            <Text style={estilos.fecha}>{diaLocal(new Date())}</Text>
            <Text style={estilos.resumen}>
              {hechas} / {misiones.length} completadas
            </Text>
          </Ventana>
          {bloqueado ? (
            <Pressable onPress={() => router.navigate('/castigos')}>
              <Ventana titulo="CASTIGO PENDIENTE" estilo={estilos.bloqueo}>
                <Text style={estilos.textoBloqueo}>Misiones bloqueadas. Toca aquí para ir a la ruleta.</Text>
              </Ventana>
            </Pressable>
          ) : null}
          <MensajeError texto={error} />
        </>
      }
      ListEmptyComponent={datos ? <Vacio>No hay misiones hoy. Impórtalas en la pestaña Importar.</Vacio> : undefined}
      renderItem={({ item }) => (
        <TarjetaMision
          mision={item}
          ruta={item.rutaId ? datos?.nombreRuta.get(item.rutaId) : undefined}
          bloqueado={bloqueado}
          onCompletar={() => alCompletar(item)}
          onMantener={() => alMantener(item)}
        />
      )}
    />
  );
}

function TarjetaMision({
  mision: m,
  ruta,
  bloqueado,
  onCompletar,
  onMantener,
}: {
  mision: Mision;
  ruta?: string;
  bloqueado: boolean;
  onCompletar: () => void;
  onMantener: () => void;
}) {
  const colorEstado = m.estado === 'completada' ? color.exito : m.estado === 'fallida' ? color.fallo : color.borde;
  return (
    <Pressable onLongPress={onMantener} style={[estilos.tarjeta, { borderLeftColor: colorEstado }]}>
      <View style={{ flex: 1 }}>
        <Text style={[estilos.titulo, m.estado !== 'pendiente' && estilos.tituloCerrado]}>{m.titulo}</Text>
        {m.descripcion ? <Text style={estilos.descripcion}>{m.descripcion}</Text> : null}
        <Text style={estilos.meta}>
          {ETIQUETA_TIPO[m.tipo]}
          {ruta ? ` · ${ruta}` : ''} · hasta {m.horaLimite}
        </Text>
      </View>
      <View style={estilos.lado}>
        <Text style={estilos.exp}>{ruta ? `+${m.exp} EXP` : ''}</Text>
        {m.estado === 'pendiente' ? (
          <Boton texto={bloqueado ? 'Bloqueada' : 'Completar'} onPress={onCompletar} deshabilitado={bloqueado} />
        ) : (
          <Text style={{ color: colorEstado, fontWeight: '700' }}>
            {m.estado === 'completada' ? 'COMPLETADA' : 'FALLIDA'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16 },
  bloqueo: { borderColor: color.fallo, shadowColor: color.fallo },
  textoBloqueo: { color: color.fallo, textAlign: 'center', fontWeight: '700' },
  fecha: { color: color.tenue, textAlign: 'center' },
  resumen: { color: color.texto, textAlign: 'center', fontSize: 18, fontWeight: '700', marginTop: 4 },
  tarjeta: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: color.panelAlto,
    borderColor: color.bordeSuave,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  titulo: { color: color.texto, fontSize: 16, fontWeight: '600' },
  tituloCerrado: { color: color.tenue },
  descripcion: { color: color.tenue, marginTop: 2 },
  meta: { color: color.tenue, fontSize: 12, marginTop: 6 },
  lado: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  exp: { color: color.brillo, fontWeight: '700' },
});
