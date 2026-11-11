import { SQLiteProvider } from 'expo-sqlite';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, type ColorValue } from 'react-native';
import { migrar } from '../infrastructure/esquema';
import { ProveedorDependencias } from '../ui/dependencias';
import { color } from '../ui/tema';

const tema = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: color.fondo, card: color.panel, text: color.texto, primary: color.acento, border: color.bordeSuave },
};

function Icono({ simbolo, color: c }: { simbolo: string; color: ColorValue }) {
  return <Text style={{ color: c, fontSize: 18 }}>{simbolo}</Text>;
}

function icono(simbolo: string) {
  return function IconoPestana({ color: c }: { color: ColorValue }) {
    return <Icono simbolo={simbolo} color={c} />;
  };
}

export default function Raiz() {
  return (
    <SQLiteProvider databaseName="ordo.db" onInit={migrar}>
      <ProveedorDependencias>
        <ThemeProvider value={tema}>
          <StatusBar style="light" />
          <Tabs
            screenOptions={{
              headerStyle: { backgroundColor: color.fondo },
              headerTitleStyle: { color: color.brillo, letterSpacing: 2 },
              tabBarStyle: { backgroundColor: color.panel, borderTopColor: color.bordeSuave },
              tabBarActiveTintColor: color.brillo,
              tabBarInactiveTintColor: color.tenue,
              sceneStyle: { backgroundColor: color.fondo },
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Misiones', tabBarIcon: icono('◆') }} />
            <Tabs.Screen name="castigos" options={{ title: 'Castigos', tabBarIcon: icono('✕') }} />
            <Tabs.Screen name="rutas" options={{ title: 'Rutas', tabBarIcon: icono('▲') }} />
            <Tabs.Screen name="importar" options={{ title: 'Importar', tabBarIcon: icono('⇩') }} />
          </Tabs>
        </ThemeProvider>
      </ProveedorDependencias>
    </SQLiteProvider>
  );
}
