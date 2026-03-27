import { create } from "zustand";
import type { Selections, LogoPlacement } from "@/lib/configurator-types";

interface ConfiguratorState {
  selections: Selections;
  logos: Record<string, LogoPlacement | null>; // key: `${partId}.${optionId}`
  setSelection: (partId: string, optionType: string, value: string) => void;
  setLogo: (partId: string, optionId: string, placement: LogoPlacement | null) => void;
  resetSelections: () => void;
  initSelections: (defaults: Selections) => void;
}

export const useConfiguratorStore = create<ConfiguratorState>((set) => ({
  selections: {},
  logos: {},

  setSelection: (partId, optionType, value) =>
    set((state) => ({
      selections: {
        ...state.selections,
        [partId]: {
          ...state.selections[partId],
          [optionType]: value,
        },
      },
    })),

  setLogo: (partId, optionId, placement) =>
    set((state) => ({
      logos: {
        ...state.logos,
        [`${partId}.${optionId}`]: placement,
      },
    })),

  resetSelections: () => set({ selections: {}, logos: {} }),

  initSelections: (defaults) => set({ selections: defaults }),
}));
