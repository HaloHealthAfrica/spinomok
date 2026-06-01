export const queryKeys = {
  animals: {
    all: ['animals'] as const,
    list: (filters?: Record<string, unknown>) => ['animals', 'list', filters] as const,
    detail: (id: string) => ['animals', 'detail', id] as const,
    timeline: (id: string) => ['animals', 'timeline', id] as const,
    lactating: ['animals', 'lactating'] as const,
    pregnant: ['animals', 'pregnant'] as const,
  },
  milk: {
    all: ['milk'] as const,
    records: (filters?: Record<string, unknown>) => ['milk', 'records', filters] as const,
    byAnimal: (animalId: string) => ['milk', 'animal', animalId] as const,
    dailySummary: (date?: string) => ['milk', 'daily-summary', date] as const,
    monthlySummary: (year: number, month: number) => ['milk', 'monthly-summary', year, month] as const,
    lactationCurve: (animalId: string) => ['milk', 'lactation-curve', animalId] as const,
  },
  dashboard: {
    kpis: ['dashboard', 'kpis'] as const,
    recentActivity: ['dashboard', 'activity'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    active: ['alerts', 'active'] as const,
    unreadCount: ['alerts', 'unread-count'] as const,
  },
} as const;
