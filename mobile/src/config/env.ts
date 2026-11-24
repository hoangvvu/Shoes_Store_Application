import Constants from 'expo-constants';
import { Platform } from 'react-native';

const NGROK_API_URL = 'https://cleaver-distress-shush.ngrok-free.dev/api/v1';

// Tự động nhận diện IPv4 của máy tính phát Metro bundler khi chạy Expo Go trong mạng LAN
const hostUri = Constants.expoConfig?.hostUri;
const rawHost = hostUri ? hostUri.split(':')[0] : null;
const isIpv4 = rawHost ? /^\d{1,3}(\.\d{1,3}){3}$/.test(rawHost) : false;
const lanApiUrl = isIpv4 && rawHost ? `http://${rawHost}:5000/api/v1` : null;

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Bỏ qua IP cũ không còn tồn tại (10.10.31.218) trong trường hợp Metro cache biến môi trường cũ
  if (envUrl && !envUrl.includes('10.10.31.218')) {
    return envUrl.replace(/\/+$/, '');
  }

  return NGROK_API_URL;
}

export let API_URL: string = resolveApiUrl();

export function setActiveApiUrl(nextUrl: string): void {
  API_URL = nextUrl.replace(/\/+$/, '');
}

export const API_FALLBACK_URLS: string[] = Array.from(
  new Set(
    [
      API_URL,
      NGROK_API_URL,
      lanApiUrl,
      'http://192.168.101.39:5000/api/v1',
      Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1',
    ].filter((u): u is string => Boolean(u)),
  ),
);
