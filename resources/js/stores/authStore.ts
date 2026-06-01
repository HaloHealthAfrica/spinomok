import { create } from 'zustand';
import type { User, Farm } from '@/types';

interface AuthState {
  user: User | null;
  farm: Farm | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  setAuth: (user: User, farm: Farm, role: string, permissions: string[]) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  isRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  farm: null,
  role: null,
  permissions: [],
  isAuthenticated: false,

  setAuth: (user, farm, role, permissions) =>
    set({ user, farm, role, permissions, isAuthenticated: true }),

  clearAuth: () =>
    set({ user: null, farm: null, role: null, permissions: [], isAuthenticated: false }),

  hasPermission: (permission) => get().permissions.includes(permission),

  isRole: (role) => get().role === role,
}));
