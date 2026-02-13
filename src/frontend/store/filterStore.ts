import { create } from 'zustand';

type SortOption = 'popular' | 'newest' | 'downloads';

interface FilterState {
  keyword: string;
  edition: string[];
  version: string[];
  sizeCategory: string[];
  sortBy: SortOption;
}

interface FilterActions {
  setKeyword: (keyword: string) => void;
  setEdition: (edition: string[]) => void;
  setVersion: (version: string[]) => void;
  setSizeCategory: (sizeCategory: string[]) => void;
  setSortBy: (sortBy: SortOption) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  keyword: '',
  edition: [],
  version: [],
  sizeCategory: [],
  sortBy: 'popular',
};

export const useFilterStore = create<FilterState & FilterActions>((set) => ({
  ...initialState,

  setKeyword: (keyword) => set({ keyword }),
  setEdition: (edition) => set({ edition }),
  setVersion: (version) => set({ version }),
  setSizeCategory: (sizeCategory) => set({ sizeCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set(initialState),
}));
