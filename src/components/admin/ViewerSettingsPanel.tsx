"use client";

import type { ViewerSettings } from "@/lib/configurator-types";

const ENV_PRESETS = [
  "studio", "city", "warehouse", "forest", "sunset",
  "dawn", "lobby", "night", "park", "apartment",
];

const BG_PRESETS = [
  { label: "Light Gray", value: "#e8e8e8" },
  { label: "White", value: "#ffffff" },
  { label: "Dark Gray", value: "#2a2a2a" },
  { label: "Black", value: "#000000" },
  { label: "Warm", value: "#f5f0eb" },
  { label: "Cool Blue", value: "#dde8f0" },
];

interface Props {
  settings: ViewerSettings;
  onChange: (settings: ViewerSettings) => void;
}

function Slider({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}

export default function ViewerSettingsPanel({ settings, onChange }: Props) {
  const set = (patch: Partial<ViewerSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-5">
      {/* Background */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Background</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {BG_PRESETS.map((p) => (
            <button
              key={p.value}
              title={p.label}
              onClick={() => set({ bgColor: p.value })}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: p.value,
                borderColor: settings.bgColor === p.value ? "#3b82f6" : "#d1d5db",
              }}
            />
          ))}
          {/* Custom color */}
          <label className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden" title="Custom color">
            <span className="text-gray-400 text-xs">+</span>
            <input
              type="color" value={settings.bgColor}
              onChange={(e) => set({ bgColor: e.target.value })}
              className="opacity-0 absolute w-0 h-0"
            />
          </label>
        </div>
      </div>

      {/* Environment */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Environment / Reflections</p>
        <select
          value={settings.envPreset}
          onChange={(e) => set({ envPreset: e.target.value })}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {ENV_PRESETS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Lighting */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lighting</p>
        <div className="space-y-3">
          <Slider label="Ambient" value={settings.ambientIntensity} min={0} max={2} step={0.05}
            onChange={(v) => set({ ambientIntensity: v })} />
          <Slider label="Key Light" value={settings.keyLightIntensity} min={0} max={3} step={0.05}
            onChange={(v) => set({ keyLightIntensity: v })} />
        </div>
      </div>

      {/* Shadows */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shadow</p>
          <button
            onClick={() => set({ shadowEnabled: !settings.shadowEnabled })}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              settings.shadowEnabled
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            {settings.shadowEnabled ? "On" : "Off"}
          </button>
        </div>
        {settings.shadowEnabled && (
          <Slider label="Opacity" value={settings.shadowOpacity} min={0} max={1} step={0.05}
            onChange={(v) => set({ shadowOpacity: v })} />
        )}
      </div>

      {/* Camera angle */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Camera Angle</p>
        <Slider label="Height" value={settings.cameraAngle} min={-0.5} max={0.8} step={0.05}
          onChange={(v) => set({ cameraAngle: v })} />
      </div>
    </div>
  );
}
