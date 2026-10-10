export const API_CONFIG = {
  BASE_URL: ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:5000/api/v1',
  TIMEOUT: 15000,
};
