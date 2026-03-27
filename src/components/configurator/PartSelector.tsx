"use client";

import { useRef, useState } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema } from "@/lib/configurator-types";

interface PartSelectorProps {
  configSchema: ConfigSchema;
}

const MATERIAL_ICONS: Record<string, string> = {
  matte: "🪨",
  glossy: "✨",
  metallic: "⚙️",
  leather: "🟤",
  silk: "🎀",
  rubber: "⚫",
};

export default function PartSelector({ configSchema }: PartSelectorProps) {
  const { selections, setSelection, logos, setLogo } = useConfiguratorStore();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>(
    () => Object.fromEntries(configSchema.parts.map((p) => [p.id, true]))
  );

  const togglePart = (partId: string) => {
    setExpandedParts((prev) => ({ ...prev, [partId]: !prev[partId] }));
  };

  return (
    <div className="space-y-3">
      {configSchema.parts.map((part) => {
        const isExpanded = expandedParts[part.id] ?? true;

        return (
          <div key={part.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Part header */}
            <button
              onClick={() => togglePart(part.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-800 text-sm">{part.label}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
                {part.options.map((option) => {
                  const currentValue = selections[part.id]?.[option.id] || option.defaultValue;

                  return (
                    <div key={option.id}>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">
                        {option.label}
                      </label>

                      {/* ── Color swatches ── */}
                      {option.type === "color" && option.colors && (
                        <div className="flex flex-wrap gap-2.5">
                          {option.colors.map((color) => {
                            const isActive = currentValue === color.id;
                            return (
                              <button
                                key={color.id}
                                onClick={() => setSelection(part.id, option.id, color.id)}
                                title={color.label}
                                className={`relative w-9 h-9 rounded-full transition-all duration-150 ${
                                  isActive
                                    ? "ring-2 ring-offset-2 ring-gray-800 scale-110"
                                    : "ring-1 ring-gray-200 hover:scale-110 hover:ring-gray-400"
                                }`}
                                style={
                                  color.textureUrl
                                    ? { backgroundImage: `url(${color.textureUrl})`, backgroundSize: "cover" }
                                    : { backgroundColor: color.hex }
                                }
                              >
                                {isActive && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Material presets ── */}
                      {option.type === "material" && option.materials && (
                        <div className="grid grid-cols-3 gap-2">
                          {option.materials.map((mat) => {
                            const isActive = currentValue === mat.id;
                            return (
                              <button
                                key={mat.id}
                                onClick={() => setSelection(part.id, option.id, mat.id)}
                                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-xs font-medium transition-all border ${
                                  isActive
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-100"
                                }`}
                              >
                                <span className="text-base">{MATERIAL_ICONS[mat.id] ?? "🔮"}</span>
                                {mat.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Texture swatches ── */}
                      {option.type === "texture" && option.textures && (
                        <div className="grid grid-cols-3 gap-2">
                          {option.textures.map((tex) => {
                            const isActive = currentValue === tex.id;
                            return (
                              <button
                                key={tex.id}
                                onClick={() => setSelection(part.id, option.id, tex.id)}
                                title={tex.label}
                                className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                                  isActive
                                    ? "border-gray-900 ring-2 ring-gray-900 ring-offset-1"
                                    : "border-transparent hover:border-gray-400"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={tex.thumbnail ?? tex.url}
                                  alt={tex.label}
                                  className="w-full h-full object-cover"
                                />
                                <div className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-xs font-medium truncate px-1 ${
                                  isActive ? "bg-gray-900/80 text-white" : "bg-white/80 text-gray-700"
                                }`}>
                                  {tex.label}
                                </div>
                                {isActive && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Visibility toggle ── */}
                      {option.type === "visibility" && (
                        <button
                          onClick={() =>
                            setSelection(part.id, option.id, currentValue === "visible" ? "hidden" : "visible")
                          }
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                            currentValue === "visible"
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          <span>{currentValue === "visible" ? "👁" : "🙈"}</span>
                          {currentValue === "visible" ? "Visible" : "Hidden"}
                        </button>
                      )}

                      {/* ── Logo / Print ── */}
                      {option.type === "logo" && (() => {
                        const key = `${part.id}.${option.id}`;
                        const placement = logos[key];
                        return (
                          <div className="space-y-3">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[key] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const dataUrl = ev.target?.result as string;
                                  setLogo(part.id, option.id, {
                                    dataUrl,
                                    x: placement?.x ?? 0.5,
                                    y: placement?.y ?? 0.35,
                                    scale: placement?.scale ?? 0.25,
                                    flipH: placement?.flipH ?? false,
                                    flipV: placement?.flipV ?? false,
                                  });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />

                            {!placement ? (
                              <button
                                onClick={() => fileInputRefs.current[key]?.click()}
                                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-center text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <div className="text-2xl mb-1">🖼️</div>
                                Click to upload logo / image
                              </button>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={placement.dataUrl}
                                    alt="logo"
                                    className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-white"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700">Logo uploaded</p>
                                    <p className="text-xs text-gray-400">Adjust below</p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => fileInputRefs.current[key]?.click()}
                                      className="text-xs px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600"
                                    >
                                      Replace
                                    </button>
                                    <button
                                      onClick={() => setLogo(part.id, option.id, null)}
                                      className="text-xs px-2.5 py-1 bg-red-50 border border-red-100 hover:bg-red-100 rounded-lg text-red-500"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                {/* Flip toggles */}
                                <div className="flex gap-2">
                                  {([{ label: "Flip H", key: "flipH" }, { label: "Flip V", key: "flipV" }] as const).map(({ label, key: k }) => (
                                    <button
                                      key={k}
                                      onClick={() =>
                                        setLogo(part.id, option.id, {
                                          ...placement,
                                          [k]: !placement[k as keyof typeof placement],
                                        })
                                      }
                                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                        placement[k as keyof typeof placement]
                                          ? "bg-gray-900 text-white border-gray-900"
                                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>

                                {/* Position / size sliders */}
                                {([
                                  { label: "Left ↔ Right", key: "x", min: 0.05, max: 0.95, step: 0.01 },
                                  { label: "Top ↕ Bottom", key: "y", min: 0.05, max: 0.95, step: 0.01 },
                                  { label: "Size", key: "scale", min: 0.05, max: 0.6, step: 0.01 },
                                ] as const).map(({ label, key: k, min, max, step }) => (
                                  <div key={k}>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                      <span>{label}</span>
                                      <span className="font-medium text-gray-700">
                                        {Math.round((placement[k as keyof typeof placement] as number) * 100)}%
                                      </span>
                                    </div>
                                    <input
                                      type="range" min={min} max={max} step={step}
                                      value={placement[k as keyof typeof placement] as number}
                                      onChange={(e) =>
                                        setLogo(part.id, option.id, {
                                          ...placement,
                                          [k]: parseFloat(e.target.value),
                                        })
                                      }
                                      className="w-full accent-gray-900"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
