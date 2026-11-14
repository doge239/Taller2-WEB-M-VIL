import { HttpInterceptorFn } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { ANDROID_API_ORIGIN } from '../config/api.config';
import { resolveApiUrl } from '../config/api-url';

// Se ejecuta DESPUÉS de authInterceptor, que reconoce las rutas /api/ relativas.
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = resolveApiUrl(req.url, Capacitor.isNativePlatform(), ANDROID_API_ORIGIN);
  return next(url === req.url ? req : req.clone({ url }));
};
