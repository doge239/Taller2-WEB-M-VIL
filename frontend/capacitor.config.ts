import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.gestornotas.app',
  appName: 'Gestor de notas',
  webDir: 'dist/frontend/browser',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Usa las bibliotecas HTTP de Android para fetch y XMLHttpRequest.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
