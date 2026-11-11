import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { color } from './tema';

const ALTO = 56;
const VUELTAS = 24;
const DURACION_MS = 3200;

/** Secuencia de castigos que pasa por el carrete antes de frenar en el resultado. */
function armarCarrete(textos: string[], resultado: string | null, giro: number): string[] {
  if (giro === 0 || !resultado) return [resultado ?? '?'];
  const base = textos.length ? textos : [resultado];
  // Variación determinista por giro: no hace falta azar real, el resultado ya está decidido.
  const pasadas = Array.from({ length: VUELTAS }, (_, i) => base[(i * 7 + giro * 3) % base.length]);
  return [...pasadas, resultado];
}

/**
 * Ruleta tipo carrete: los castigos pasan rápido y frenan en el resultado.
 * El resultado ya viene decidido y guardado; la animación solo lo muestra.
 * Cada vez que cambia `giro`, se anima hasta `resultado`.
 */
export function Ruleta({
  textos,
  resultado,
  giro,
  onFin,
}: {
  textos: string[];
  resultado: string | null;
  giro: number;
  onFin: () => void;
}) {
  const [desplazamiento] = useState(() => new Animated.Value(0));
  const carrete = useMemo(() => armarCarrete(textos, resultado, giro), [textos, resultado, giro]);
  const largo = carrete.length;
  const onFinRef = useRef(onFin);
  useEffect(() => {
    onFinRef.current = onFin;
  }, [onFin]);

  useEffect(() => {
    desplazamiento.setValue(0);
    if (largo <= 1) return;
    const anim = Animated.timing(desplazamiento, {
      toValue: -(largo - 1) * ALTO,
      duration: DURACION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onFinRef.current();
    });
    return () => anim.stop();
  }, [giro, largo, desplazamiento]);

  return (
    <View style={estilos.marco}>
      <Animated.View style={{ transform: [{ translateY: desplazamiento }] }}>
        {carrete.map((t, i) => (
          <View key={i} style={estilos.celda}>
            <Text style={estilos.texto} numberOfLines={2}>
              {t}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: {
    height: ALTO,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: color.fallo,
    borderRadius: 4,
    backgroundColor: color.fondo,
    marginVertical: 14,
    shadowColor: color.fallo,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  celda: { height: ALTO, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  texto: { color: color.texto, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
