import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Selections, LogoPlacement } from "@/lib/configurator-types";

interface ConfiguratorState {
  /** Per-product saved selections: productId → partId → optionId → value */
  savedSelections: Record<string, Selections>;
  /** Currently active product id */
  activeProductId: string | null;
  /** In-memory selections for the active product (fast access for rendering) */
  selections: Selections;
  logos: Record<string, LogoPlacement | null>;

  setSelection: (partId: string, optionType: string, value: string) => void;
  setLogo: (partId: string, optionId: string, placement: LogoPlacement | null) => void;
  resetSelections: () => void;
  /** Load saved selections for productId, falling back to defaults */
  initSelections: (productId: string, defaults: Selections) => void;
}

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      savedSelections: {},
      activeProductId: null,
      selections: {},
      logos: {},

      setSelection: (partId, optionType, value) =>
        set((state) => {
          const newSelections = {
            ...state.selections,
            [partId]: { ...state.selections[partId], [optionType]: value },
          };
          const savedSelections = state.activeProductId
            ? { ...state.savedSelections, [state.activeProductId]: newSelections }
            : state.savedSelections;
          return { selections: newSelections, savedSelections };
        }),

      setLogo: (partId, optionId, placement) =>
        set((state) => ({
          logos: { ...state.logos, [`${partId}.${optionId}`]: placement },
        })),

      resetSelections: () =>
        set((state) => {
          const savedSelections = state.activeProductId
            ? { ...state.savedSelections, [state.activeProductId]: undefined as unknown as Selections }
            : state.savedSelections;
          return { selections: {}, logos: {}, activeProductId: null, savedSelections };
        }),

      initSelections: (productId, defaults) => {
        const saved = get().savedSelections[productId];
        set({
          activeProductId: productId,
          selections: saved ?? defaults,
          logos: {},
        });
      },
    }),
    {
      name: "3d-config-selections",
      // Only persist savedSelections, not the ephemeral active state
      partialize: (state) => ({ savedSelections: state.savedSelections }),
    }
  )
);
