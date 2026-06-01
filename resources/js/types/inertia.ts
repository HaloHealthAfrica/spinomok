import type { Farm, User } from './domain';

export interface SharedProps {
  auth: {
    user: User;
    farm: Farm;
    permissions: string[];
    role: string;
  };
  flash: {
    success?: string;
    error?: string;
    warning?: string;
  };
  sync: {
    pending_count: number;
    last_synced_at: string | null;
    has_conflicts: boolean;
  };
  errors: Record<string, string>;
}

export type PageProps<T = Record<string, unknown>> = SharedProps & T;
