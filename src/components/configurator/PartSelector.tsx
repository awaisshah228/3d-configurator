"use client";

import { useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema } from "@/lib/configurator-types";

interface PartSelectorProps {
  configSchema: ConfigSchema;
}

export default function PartSelector({ configSchema }: PartSelectorProps) {
  const { selections, setSelection, logos, setLogo } = useConfiguratorStore();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="space-y-6">
      {configSchema.parts.map((part) => (
        <div key={part.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{part.label}</h3>

          {part.options.map((option) => {
            const currentValue = selections[part.id]?.[option.id] || option.defaultValue;

            return (
              <div key={option.id} className="mb-4 last:mb-0">
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  {option.label}
                </label>

                {option.type === "color" && option.colors && (
                  <div className="flex flex-wrap gap-2">
                    {option.colors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setSelection(part.id, option.id, color.id)}
                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                          currentValue === color.id
                            ? "border-blue-500 ring-2 ring-blue-200 scale-110"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.label}
                      />
                    ))}
                  </div>
                )}

                {option.type === "material" && option.materials && (
                  <div className="flex flex-wrap gap-2">
                    {option.materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => setSelection(part.id, option.id, mat.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          currentValue === mat.id
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {mat.label}
                      </button>
                    ))}
                  </div>
                )}

                {option.type === "visibility" && (
                  <button
                    onClick={() =>
                      setSelection(
                        part.id,
                        option.id,
                        currentValue === "visible" ? "hidden" : "visible"
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentValue === "visible"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentValue === "visible" ? "Visible" : "Hidden"}
                  </button>
                )}

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
                          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                        >
                          Click to upload logo / image
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {/* Logo preview + replace/remove */}
                          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={placement.dataUrl}
                              alt="logo"
                              className="w-14 h-14 object-contain rounded border border-gray-200 bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">Logo uploaded</p>
                              <p className="text-xs text-gray-400">Adjust position &amp; size below</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => fileInputRefs.current[key]?.click()}
                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                              >
                                Replace
                              </button>
                              <button
                                onClick={() => setLogo(part.id, option.id, null)}
                                className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-red-500"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Position & scale sliders */}
                          {/* Flip toggles */}
                          <div className="flex gap-2">
                            {[
                              { label: "Flip H", key: "flipH" },
                              { label: "Flip V", key: "flipV" },
                            ].map(({ label, key: k }) => (
                              <button
                                key={k}
                                onClick={() =>
                                  setLogo(part.id, option.id, {
                                    ...placement,
                                    [k]: !placement[k as keyof typeof placement],
                                  })
                                }
                                className={`text-xs px-3 py-1 rounded border transition-colors ${
                                  placement[k as keyof typeof placement]
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          {[
                            { label: "Left ↔ Right", key: "x", min: 0.05, max: 0.95, step: 0.01 },
                            { label: "Top ↕ Bottom", key: "y", min: 0.05, max: 0.95, step: 0.01 },
                            { label: "Size", key: "scale", min: 0.05, max: 0.6, step: 0.01 },
                          ].map(({ label, key: k, min, max, step }) => (
                            <div key={k}>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{label}</span>
                                <span>{Math.round((placement[k as keyof typeof placement] as number) * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={step}
                                value={placement[k as keyof typeof placement] as number}
                                onChange={(e) =>
                                  setLogo(part.id, option.id, {
                                    ...placement,
                                    [k]: parseFloat(e.target.value),
                                  })
                                }
                                className="w-full accent-blue-500"
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
      ))}
    </div>
  );
}
