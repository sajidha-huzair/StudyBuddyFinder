export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const isGoogleAuthEnabled = Boolean(GOOGLE_CLIENT_ID);
