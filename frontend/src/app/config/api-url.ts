/** Solo redirige nuestras rutas relativas: nunca envía tokens a otras URLs. */
export function resolveApiUrl(url: string, native: boolean, apiOrigin: string): string {
  if (!native || !url.startsWith('/api/')) return url;

  const origin = new URL(apiOrigin);
  if (
    origin.protocol !== 'https:' ||
    origin.username || origin.password ||
    origin.pathname !== '/' || origin.search || origin.hash
  ) {
    throw new Error('El servidor Android debe ser un origen HTTPS sin ruta ni credenciales.');
  }
  return `${origin.origin}${url}`;
}
