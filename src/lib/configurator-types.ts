// ─── Configuration Schema Types ─────────────────────────────────────

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface MaterialPreset {
  id: string;
  label: string;
  color?: string;
  metalness?: number;
  roughness?: number;
}

export interface ConfigOption {
  id: string;
  label: string;
  type: "color" | "material" | "visibility" | "logo";
  colors?: ColorOption[];
  materials?: MaterialPreset[];
  defaultVisible?: boolean;
  defaultValue: string;
}

export interface LogoPlacement {
  dataUrl: string;
  x: number;     // 0–1, horizontal position (0=left, 1=right)
  y: number;     // 0–1, vertical position (0=top, 1=bottom)
  scale: number; // 0–1, fraction of texture size
  flipH: boolean;
  flipV: boolean;
}

export interface ConfigPart {
  id: string;
  label: string;
  meshNames: string[];
  options: ConfigOption[];
}

export interface ConfigSchema {
  version: number;
  parts: ConfigPart[];
}

// ─── Product Types ──────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  modelUrl: string;
  thumbnailUrl?: string;
  configSchema: ConfigSchema;
  meshNames: string[];
  materialNames: string[];
  cameraZoom?: number; // multiplier: 1 = default fit, <1 = closer, >1 = further
}

// ─── Selections (what the user chose) ───────────────────────────────

export type Selections = Record<string, Record<string, string>>;
// e.g. { "seat": { "color": "#ff0000", "material": "leather" } }
