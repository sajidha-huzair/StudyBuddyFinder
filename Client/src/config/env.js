const trim = (value) => (value || '').trim();

export const GOOGLE_CLIENT_ID = trim(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const isGoogleAuthEnabled = Boolean(GOOGLE_CLIENT_ID);

/** Ensures production builds work even if VITE_API_URL omits the /api suffix. */
export const getApiUrl = () => {
  const raw = trim(import.meta.env.VITE_API_URL) || 'http://127.0.0.1:8000/api';
  const base = raw.replace(/\/$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

export const getAppBasePath = () => {
  const raw = trim(import.meta.env.VITE_BASE_PATH) || '/';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
};

export const getLoginPath = () => {
  const base = getAppBasePath();
  return base === '/' ? '/login' : `${base}login`;
};

export const getWebSocketUrl = () => {
  const apiUrl = getApiUrl();
  const base = apiUrl.replace(/\/api$/, '').replace(/^http/, 'ws');
  return `${base}/ws/chat/`;
};
