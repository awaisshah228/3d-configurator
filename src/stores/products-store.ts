import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ConfigSchema } from "@/lib/configurator-types";

// Default dummy products with config schemas
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "tshirt-1",
    name: "Classic T-Shirt",
    description: "A customizable 3D t-shirt model",
    modelUrl: "/models/tshirt.glb",
    configSchema: {
      version: 1,
      parts: [
        {
          id: "body",
          label: "Body",
          meshNames: ["Object_2", "Object_3", "Object_4"],
          options: [
            {
              id: "body-color",
              label: "Color",
              type: "color",
              colors: [
                { id: "white", label: "White", hex: "#ffffff" },
                { id: "black", label: "Black", hex: "#1a1a1a" },
                { id: "red", label: "Red", hex: "#e53e3e" },
                { id: "blue", label: "Blue", hex: "#3182ce" },
                { id: "green", label: "Green", hex: "#38a169" },
                { id: "yellow", label: "Yellow", hex: "#ecc94b" },
              ],
              defaultValue: "white",
            },
            {
              id: "body-material",
              label: "Material",
              type: "material",
              materials: [
                { id: "cotton", label: "Cotton", roughness: 0.9, metalness: 0 },
                { id: "silk", label: "Silk", roughness: 0.3, metalness: 0.1 },
                { id: "polyester", label: "Polyester", roughness: 0.6, metalness: 0.05 },
              ],
              defaultValue: "cotton",
            },
          ],
        },
      ],
    },
    meshNames: ["Object_2", "Object_3", "Object_4"],
    materialNames: ["Material"],
  },
  {
    id: "shoe-1",
    name: "Sport Shoe",
    description: "A customizable 3D shoe model",
    modelUrl: "/models/scanned_adidas_sports_shoe.glb",
    configSchema: {
      version: 1,
      parts: [
        {
          id: "upper",
          label: "Upper",
          meshNames: ["shoe_upper", "shoe_1", "shoe_2"],
          options: [
            {
              id: "upper-color",
              label: "Color",
              type: "color",
              colors: [
                { id: "white", label: "White", hex: "#ffffff" },
                { id: "black", label: "Black", hex: "#1a1a1a" },
                { id: "red", label: "Red", hex: "#e53e3e" },
                { id: "blue", label: "Blue", hex: "#3182ce" },
                { id: "pink", label: "Pink", hex: "#ed64a6" },
              ],
              defaultValue: "white",
            },
            {
              id: "upper-material",
              label: "Material",
              type: "material",
              materials: [
                { id: "leather", label: "Leather", roughness: 0.5, metalness: 0 },
                { id: "suede", label: "Suede", roughness: 0.95, metalness: 0 },
                { id: "synthetic", label: "Synthetic", roughness: 0.4, metalness: 0.1 },
              ],
              defaultValue: "leather",
            },
          ],
        },
        {
          id: "sole",
          label: "Sole",
          meshNames: ["shoe_sole", "sole", "shoe_3"],
          options: [
            {
              id: "sole-color",
              label: "Color",
              type: "color",
              colors: [
                { id: "white", label: "White", hex: "#f7f7f7" },
                { id: "black", label: "Black", hex: "#1a1a1a" },
                { id: "gum", label: "Gum", hex: "#c89b6e" },
              ],
              defaultValue: "white",
            },
          ],
        },
      ],
    },
    meshNames: ["shoe_upper", "shoe_sole", "shoe_1", "shoe_2", "shoe_3"],
    materialNames: ["upper_material", "sole_material"],
  },
  {
    id: "boot-1",
    name: "Classic Boot",
    description: "A customizable 3D boot model",
    modelUrl: "/models/boot.glb",
    configSchema: {
      version: 1,
      parts: [
        {
          id: "upper",
          label: "Upper",
          meshNames: ["boot_upper", "upper", "Boot_Upper"],
          options: [
            {
              id: "upper-color",
              label: "Color",
              type: "color",
              colors: [
                { id: "brown", label: "Brown", hex: "#8B5E3C" },
                { id: "black", label: "Black", hex: "#1a1a1a" },
                { id: "tan", label: "Tan", hex: "#D2A679" },
                { id: "white", label: "White", hex: "#ffffff" },
                { id: "red", label: "Red", hex: "#e53e3e" },
              ],
              defaultValue: "brown",
            },
            {
              id: "upper-material",
              label: "Material",
              type: "material",
              materials: [
                { id: "leather", label: "Leather", roughness: 0.5, metalness: 0 },
                { id: "suede", label: "Suede", roughness: 0.95, metalness: 0 },
                { id: "synthetic", label: "Synthetic", roughness: 0.4, metalness: 0.1 },
              ],
              defaultValue: "leather",
            },
          ],
        },
        {
          id: "sole",
          label: "Sole",
          meshNames: ["boot_sole", "sole", "Boot_Sole"],
          options: [
            {
              id: "sole-color",
              label: "Color",
              type: "color",
              colors: [
                { id: "black", label: "Black", hex: "#1a1a1a" },
                { id: "brown", label: "Brown", hex: "#8B5E3C" },
                { id: "gum", label: "Gum", hex: "#c89b6e" },
              ],
              defaultValue: "black",
            },
          ],
        },
      ],
    },
    meshNames: ["boot_upper", "boot_sole", "upper", "sole", "Boot_Upper", "Boot_Sole"],
    materialNames: ["upper_material", "sole_material"],
  },
];

interface ProductsState {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: DEFAULT_PRODUCTS,
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removeProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),
      getProduct: (id) => get().products.find((p) => p.id === id),
    }),
    {
      name: "3d-config-products",
      merge: (persistedState: unknown, currentState: ProductsState) => {
        const persisted = persistedState as Partial<ProductsState>;
        const persistedIds = new Set((persisted.products ?? []).map((p) => p.id));
        const missingDefaults = DEFAULT_PRODUCTS.filter((p) => !persistedIds.has(p.id));
        return {
          ...currentState,
          ...persisted,
          products: [...missingDefaults, ...(persisted.products ?? [])],
        };
      },
    }
  )
);
