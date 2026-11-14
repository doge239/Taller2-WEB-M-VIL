import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface StudyMotionPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(event: 'sample', listener: (sample: { magnitude: number }) => void): Promise<PluginListenerHandle>;
}
const StudyMotion = registerPlugin<StudyMotionPlugin>('StudyMotion');
export interface LugarEstudio { latitud: number; longitud: number; precision_metros: number; }

@Injectable({ providedIn: 'root' })
export class MovilService {
  async escanearQr(): Promise<string> {
    try {
      const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import('@capacitor/barcode-scanner');
      const resultado = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Apunta al QR de una asignatura del gestor',
        scanButton: true, scanText: 'Escanear asignatura',
      });
      if (!resultado.ScanResult) throw new Error('Lectura cancelada.');
      return resultado.ScanResult;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      if (/permission|denied|notallowed/i.test(mensaje))
        throw new Error('La cámara necesita permiso. Actívalo en Ajustes > Aplicaciones > Gestor de notas > Permisos.');
      if (/cancel/i.test(mensaje)) throw new Error('Lectura cancelada. Puedes volver a intentarlo.');
      throw new Error('No se pudo leer el QR. Comprueba la cámara y sus permisos e intenta nuevamente.');
    }
  }

  async ubicacion(): Promise<LugarEstudio> {
    try {
      if (Capacitor.isNativePlatform()) {
        const permisos = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (permisos.location !== 'granted' && permisos.coarseLocation !== 'granted')
          throw new Error('permission denied');
      }
      const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      return { latitud: coords.latitude, longitud: coords.longitude, precision_metros: coords.accuracy };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/permission|denied|0003|0008/i.test(msg))
        throw new Error('No hay permiso de ubicación. Puedes activarlo en Ajustes o estudiar sin guardar ubicación.');
      throw new Error('No se pudo obtener la ubicación. Activa el GPS y reintenta, o continúa sin ubicación.');
    }
  }

  async observarMovimiento(muestra: (magnitud: number) => void): Promise<() => Promise<void>> {
    if (Capacitor.getPlatform() !== 'android')
      throw new Error('El registro de movimientos está disponible en la aplicación Android.');
    const listener = await StudyMotion.addListener('sample', ({ magnitude }) => muestra(magnitude));
    try { await StudyMotion.start(); }
    catch (e) { await listener.remove(); throw e; }
    return async () => { await StudyMotion.stop(); await listener.remove(); };
  }
}
