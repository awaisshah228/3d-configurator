"use client";

import { useState } from "react";
import type {
  ConfigSchema,
  ConfigPart,
  ConfigOption,
  ColorOption,
  MaterialPreset,
} from "@/lib/configurator-types";

const DEFAULT_COLORS: ColorOption[] = [
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "black", label: "Black", hex: "#1a1a1a" },
  { id: "red", label: "Red", hex: "#e53e3e" },
  { id: "blue", label: "Blue", hex: "#3182ce" },
  { id: "green", label: "Green", hex: "#38a169" },
  { id: "yellow", label: "Yellow", hex: "#ecc94b" },
  { id: "pink", label: "Pink", hex: "#ed64a6" },
  { id: "purple", label: "Purple", hex: "#805ad5" },
  { id: "orange", label: "Orange", hex: "#dd6b20" },
];

const DEFAULT_MATERIALS: MaterialPreset[] = [
  { id: "matte", label: "Matte", roughness: 0.9, metalness: 0 },
  { id: "glossy", label: "Glossy", roughness: 0.1, metalness: 0.1 },
  { id: "metallic", label: "Metallic", roughness: 0.3, metalness: 0.8 },
  { id: "leather", label: "Leather", roughness: 0.5, metalness: 0 },
  { id: "silk", label: "Silk", roughness: 0.2, metalness: 0.1 },
  { id: "rubber", label: "Rubber", roughness: 0.95, metalness: 0 },
];

interface ConfigSchemaEditorProps {
  meshNames: string[];
  initialSchema?: ConfigSchema;
  onChange: (schema: ConfigSchema) => void;
}

export default function ConfigSchemaEditor({
  meshNames,
  initialSchema,
  onChange,
}: ConfigSchemaEditorProps) {
  const [parts, setParts] = useState<ConfigPart[]>(
    initialSchema?.parts || []
  );

  const updateParts = (newParts: ConfigPart[]) => {
    setParts(newParts);
    onChange({ version: 1, parts: newParts });
  };

  const addPart = () => {
    const newPart: ConfigPart = {
      id: `part-${Date.now()}`,
      label: "New Part",
      meshNames: [],
      options: [
        {
          id: `color-${Date.now()}`,
          label: "Color",
          type: "color",
          colors: [...DEFAULT_COLORS],
          defaultValue: "white",
        },
      ],
    };
    updateParts([...parts, newPart]);
  };

  const removePart = (partId: string) => {
    updateParts(parts.filter((p) => p.id !== partId));
  };

  const updatePart = (partId: string, updates: Partial<ConfigPart>) => {
    updateParts(
      parts.map((p) => (p.id === partId ? { ...p, ...updates } : p))
    );
  };

  const toggleMeshForPart = (partId: string, meshName: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const meshNames = part.meshNames.includes(meshName)
      ? part.meshNames.filter((m) => m !== meshName)
      : [...part.meshNames, meshName];
    updatePart(partId, { meshNames });
  };

  const addOption = (partId: string, type: ConfigOption["type"]) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const option: ConfigOption = {
      id: `${type}-${Date.now()}`,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      type,
      defaultValue: type === "color" ? "white" : type === "material" ? "matte" : "visible",
      ...(type === "color" ? { colors: [...DEFAULT_COLORS] } : {}),
      ...(type === "material" ? { materials: [...DEFAULT_MATERIALS] } : {}),
      ...(type === "visibility" ? { defaultVisible: true } : {}),
    };

    updatePart(partId, { options: [...part.options, option] });
  };

  const removeOption = (partId: string, optionId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    updatePart(partId, {
      options: part.options.filter((o) => o.id !== optionId),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Configuration Schema</h3>
        <button
          onClick={addPart}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Add Part
        </button>
      </div>

      {parts.length === 0 && (
        <p className="text-gray-400 text-center py-6">
          Add parts to define customizable areas of the model
        </p>
      )}

      {parts.map((part) => (
        <div
          key={part.id}
          className="border border-gray-200 rounded-xl p-4 space-y-3"
        >
          {/* Part Header */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={part.label}
              onChange={(e) => updatePart(part.id, { label: e.target.value })}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Part name (e.g., Body, Sole)"
            />
            <button
              onClick={() => removePart(part.id)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Remove
            </button>
          </div>

          {/* Mesh Assignment */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Assign meshes to this part:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {meshNames.length > 0 ? (
                meshNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => toggleMeshForPart(part.id, name)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                      part.meshNames.includes(name)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {name}
                  </button>
                ))
              ) : (
                <span className="text-gray-400 text-xs">
                  Upload a model to see available meshes
                </span>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">
              Customization options:
            </label>
            {part.options.map((option) => (
              <div
                key={option.id}
                className="bg-gray-50 rounded-lg px-3 py-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      option.type === "color"
                        ? "bg-purple-100 text-purple-700"
                        : option.type === "material"
                        ? "bg-green-100 text-green-700"
                        : option.type === "logo"
                        ? "bg-pink-100 text-pink-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {option.type}
                  </span>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => {
                      const newOptions = part.options.map((o) =>
                        o.id === option.id ? { ...o, label: e.target.value } : o
                      );
                      updatePart(part.id, { options: newOptions });
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                  <button
                    onClick={() => removeOption(part.id, option.id)}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0"
                  >
                    x
                  </button>
                </div>

                {/* Default value selector */}
                {option.type === "color" && option.colors && option.colors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 shrink-0">Default:</span>
                    <div className="flex flex-wrap gap-1">
                      {option.colors.map((c) => (
                        <button
                          key={c.id}
                          title={c.label}
                          onClick={() => {
                            const newOptions = part.options.map((o) =>
                              o.id === option.id ? { ...o, defaultValue: c.id } : o
                            );
                            updatePart(part.id, { options: newOptions });
                          }}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            option.defaultValue === c.id
                              ? "border-blue-500 scale-125"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {option.type === "material" && option.materials && option.materials.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 shrink-0">Default:</span>
                    <select
                      value={option.defaultValue}
                      onChange={(e) => {
                        const newOptions = part.options.map((o) =>
                          o.id === option.id ? { ...o, defaultValue: e.target.value } : o
                        );
                        updatePart(part.id, { options: newOptions });
                      }}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    >
                      {option.materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={() => addOption(part.id, "color")}
                className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
              >
                + Color
              </button>
              <button
                onClick={() => addOption(part.id, "material")}
                className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
              >
                + Material
              </button>
              <button
                onClick={() => addOption(part.id, "visibility")}
                className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
              >
                + Visibility
              </button>
              <button
                onClick={() => addOption(part.id, "logo")}
                className="text-xs px-2 py-1 bg-pink-50 text-pink-600 rounded hover:bg-pink-100"
              >
                + Logo / Print
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Schema Preview */}
      {parts.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            View JSON Schema
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-xs rounded-lg overflow-x-auto">
            {JSON.stringify({ version: 1, parts }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
