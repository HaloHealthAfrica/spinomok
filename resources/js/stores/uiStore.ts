import { create } from 'zustand';

interface UIState {
  activeModal: string | null;
  sidebarOpen: boolean;
  quickAddOpen: boolean;
  openModal: (name: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  sidebarOpen: false,
  quickAddOpen: false,

  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
}));
