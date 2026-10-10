import { create } from 'zustand';

interface User {
  userId: number;
  username: string;
  role: string;
  fullName: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('access_token') || 'demo_admin_jwt_token',
  user: {
    userId: 1,
    username: 'admin',
    role: 'ADMIN',
    fullName: 'Vũ Việt Hoàng (Quản trị viên)',
  },
  isAuthenticated: true,

  setAuth: (token, user) => {
    localStorage.setItem('access_token', token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
