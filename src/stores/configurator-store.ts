import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Selections, LogoPlacement } from "@/lib/configurator-types";

const MAX_HISTORY = 30;

interface ConfiguratorState {
  /** Per-product saved selections: productId → partId → optionId → value */
  savedSelections: Record<string, Selections>;
  /** Currently active product id */
  activeProductId: string | null;
  /** In-memory selections for the active product (fast access for rendering) */
  selections: Selections;
  logos: Record<string, LogoPlacement | null>;

  /** Undo/redo history stacks */
  history: Selections[];
  historyIndex: number;

  setSelection: (partId: string, optionType: string, value: string) => void;
  setLogo: (partId: string, optionId: string, placement: LogoPlacement | null) => void;
  resetSelections: () => void;
  /** Load saved selections for productId, falling back to defaults */
  initSelections: (productId: string, defaults: Selections) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      savedSelections: {},
      activeProductId: null,
      selections: {},
      logos: {},
      history: [],
      historyIndex: -1,

      setSelection: (partId, optionType, value) =>
        set((state) => {
          const newSelections = {
            ...state.selections,
            [partId]: { ...state.selections[partId], [optionType]: value },
          };
          const savedSelections = state.activeProductId
            ? { ...state.savedSelections, [state.activeProductId]: newSelections }
            : state.savedSelections;

          // Push to undo history (truncate any future states after current index)
          const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
          const newHistory = [...truncatedHistory, state.selections].slice(-MAX_HISTORY);

          return {
            selections: newSelections,
            savedSelections,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
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
          return { selections: {}, logos: {}, activeProductId: null, savedSelections, history: [], historyIndex: -1 };
        }),

      initSelections: (productId, defaults) => {
        const saved = get().savedSelections[productId];
        const initial = saved ?? defaults;
        set({
          activeProductId: productId,
          selections: initial,
          logos: {},
          history: [initial],
          historyIndex: 0,
        });
      },

      undo: () =>
        set((state) => {
          if (state.historyIndex <= 0) return state;
          const newIndex = state.historyIndex - 1;
          const prevSelections = state.history[newIndex];
          const savedSelections = state.activeProductId
            ? { ...state.savedSelections, [state.activeProductId]: prevSelections }
            : state.savedSelections;
          return { selections: prevSelections, historyIndex: newIndex, savedSelections };
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state;
          const newIndex = state.historyIndex + 1;
          const nextSelections = state.history[newIndex];
          const savedSelections = state.activeProductId
            ? { ...state.savedSelections, [state.activeProductId]: nextSelections }
            : state.savedSelections;
          return { selections: nextSelections, historyIndex: newIndex, savedSelections };
        }),

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,
    }),
    {
      name: "3d-config-selections",
      // Only persist savedSelections, not the ephemeral active state
      partialize: (state) => ({ savedSelections: state.savedSelections }),
    }
  )
);
