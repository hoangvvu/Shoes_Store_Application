import { Platform } from 'react-native';

const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1';
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? fallback;
