import { create } from 'zustand';

interface DashboardState {
  cachedData: any | null;
  lastFetched: number | null;
  setCachedData: (data: any) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  cachedData: null,
  lastFetched: null,
  setCachedData: (data) => set({ cachedData: data, lastFetched: Date.now() }),
}));
