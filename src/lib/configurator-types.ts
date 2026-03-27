// ─── Configuration Schema Types ─────────────────────────────────────

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
  textureUrl?: string; // optional texture image (data URL or uploaded URL)
}

export interface MaterialPreset {
  id: string;
  label: string;
  color?: string;
  metalness?: number;
  roughness?: number;
  // Extended PBR properties
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  aoMapUrl?: string;
  emissive?: string;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  sheenRoughness?: number;
}

export interface TextureOption {
  id: string;
  label: string;
  url: string;        // server URL to the texture image
  thumbnail?: string; // smaller preview URL (falls back to url)
}

export interface ConfigOption {
  id: string;
  label: string;
  type: "color" | "material" | "visibility" | "logo" | "texture";
  colors?: ColorOption[];
  materials?: MaterialPreset[];
  textures?: TextureOption[];
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

// ─── Viewer Settings ────────────────────────────────────────────────

export interface ViewerSettings {
  bgColor: string;           // hex background color
  envPreset: string;         // drei Environment preset
  ambientIntensity: number;  // 0–2
  keyLightIntensity: number; // 0–3
  shadowOpacity: number;     // 0–1
  shadowEnabled: boolean;
  cameraAngle: number;       // 0–1 (how high above model camera sits)
  cameraAzimuth?: number;    // horizontal rotation in radians (saved from admin orbit)
  cameraPolar?: number;      // vertical rotation in radians (saved from admin orbit)
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  bgColor: "#e8e8e8",
  envPreset: "studio",
  ambientIntensity: 0.7,
  keyLightIntensity: 1.2,
  shadowOpacity: 0.35,
  shadowEnabled: true,
  cameraAngle: 0.15,
};

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
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

// ─── Selections (what the user chose) ───────────────────────────────

export type Selections = Record<string, Record<string, string>>;
// e.g. { "seat": { "color": "#ff0000", "material": "leather" } }
