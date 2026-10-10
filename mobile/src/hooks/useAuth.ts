import { useAuthStore } from '@/store/useAuthStore';

// Mỗi hook chọn đúng một giá trị để tránh re-render thừa / vòng lặp selector của zustand.
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useAuthUser = () => useAuthStore((s) => s.user);
