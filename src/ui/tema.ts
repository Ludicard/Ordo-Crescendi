/** Paleta inspirada en las ventanas del "Sistema": fondo casi negro y azul brillante. */
export const color = {
  fondo: '#05070D',
  panel: '#0B1322',
  panelAlto: '#111C31',
  borde: '#1F5FD1',
  bordeSuave: '#1A2A47',
  acento: '#4DA3FF',
  brillo: '#8CC8FF',
  texto: '#DCE7FF',
  tenue: '#7A8BA8',
  exito: '#3DDC97',
  fallo: '#FF5C7A',
} as const;

export const fuente = {
  titulo: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 3, color: color.brillo },
};
