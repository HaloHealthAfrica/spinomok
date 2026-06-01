import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { SharedProps } from '@/types';

export function useAuth() {
  const { auth } = usePage<SharedProps>().props;
  const { setAuth, user, farm, role, permissions, hasPermission, isRole } = useAuthStore();

  useEffect(() => {
    if (auth?.user) {
      setAuth(auth.user, auth.farm, auth.role, auth.permissions);
    }
  }, [auth, setAuth]);

  return {
    user: user ?? auth?.user,
    farm: farm ?? auth?.farm,
    role: role ?? auth?.role,
    permissions: permissions.length > 0 ? permissions : (auth?.permissions ?? []),
    hasPermission,
    isRole,
    isOwner: (role ?? auth?.role) === 'farm_owner',
    isManager: ['farm_owner', 'farm_manager'].includes((role ?? auth?.role) ?? ''),
    isWorker: (role ?? auth?.role) === 'farm_worker',
    isVet: (role ?? auth?.role) === 'veterinarian',
  };
}
