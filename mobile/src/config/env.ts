import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Tự động nhận diện IP của máy tính phát Metro bundler khi chạy Expo Go
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : null;

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  // Nếu có EXPO_PUBLIC_API_URL hợp lệ và không phải ngrok tĩnh đang bị gián đoạn
  if (envUrl && !envUrl.includes('cleaver-distress-shush.ngrok-free.dev')) {
    return envUrl;
  }

  // Tự động phát hiện IP máy chủ từ Expo Dev Server (cho điện thoại thật cùng mạng Wi-Fi và emulator)
  if (hostIp) {
    return `http://${hostIp}:5000/api/v1`;
  }

  // Android emulator fallback (10.0.2.2 trỏ về localhost máy host)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }

  // iOS Simulator / Web fallback
  return 'http://localhost:5000/api/v1';
}

export const API_URL: string = resolveApiUrl();
