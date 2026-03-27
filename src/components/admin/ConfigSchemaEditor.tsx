"use client";

import { useRef, useState } from "react";
import type {
  ConfigSchema,
  ConfigPart,
  ConfigOption,
  ColorOption,
  MaterialPreset,
  TextureOption,
} from "@/lib/configurator-types";
import type { UploadedTexture } from "@/components/admin/ModelUploader";

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
  availableTextures?: UploadedTexture[];
}

function ColorEditor({
  colors,
  defaultValue,
  onChange,
  onDefaultChange,
}: {
  colors: ColorOption[];
  defaultValue: string;
  onChange: (colors: ColorOption[]) => void;
  onDefaultChange: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newHex, setNewHex] = useState("#cccccc");
  const textureInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  const addColor = () => {
    if (!newLabel.trim()) return;
    const id = newLabel.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    onChange([...colors, { id, label: newLabel.trim(), hex: newHex }]);
    setNewLabel("");
    setNewHex("#cccccc");
    setAdding(false);
  };

  const setTexture = (colorId: string, dataUrl: string | undefined) => {
    onChange(colors.map((c) => (c.id === colorId ? { ...c, textureUrl: dataUrl } : c)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        {colors.map((color) => (
          <div key={color.id} className="relative group flex flex-col items-center gap-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={(el) => { textureInputRef.current[color.id] = el; }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setTexture(color.id, ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <div className="relative">
              <button
                onClick={() => onDefaultChange(color.id)}
                title={`${color.label} — click to set as default`}
                className={`w-10 h-10 rounded-full transition-all ${
                  defaultValue === color.id
                    ? "ring-2 ring-offset-2 ring-gray-800 scale-110"
                    : "ring-1 ring-black/10 hover:scale-105"
                }`}
                style={{
                  background: color.textureUrl
                    ? `url(${color.textureUrl}) center/cover`
                    : color.hex,
                }}
              />
              <button
                onClick={() => onChange(colors.filter((c) => c.id !== color.id))}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold"
              >
                ×
              </button>
              {color.textureUrl && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 max-w-11 truncate text-center">{color.label}</span>
            <button
              onClick={() => textureInputRef.current[color.id]?.click()}
              className="text-[9px] text-gray-400 hover:text-blue-500 transition-colors"
              title="Upload texture image for this color"
            >
              {color.textureUrl ? "re-tex" : "+ tex"}
            </button>
          </div>
        ))}

        {adding ? (
          <div className="flex items-end gap-2 bg-gray-50 rounded-xl p-2 border border-gray-200">
            <div className="flex flex-col items-center gap-1">
              <label
                className="w-10 h-10 rounded-full cursor-pointer overflow-hidden ring-1 ring-black/10"
                style={{ background: newHex }}
              >
                <input
                  type="color"
                  value={newHex}
                  onChange={(e) => setNewHex(e.target.value)}
                  className="opacity-0 w-0 h-0"
                />
              </label>
              <span className="text-[10px] text-gray-400">pick</span>
            </div>
            <div className="flex flex-col gap-1">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addColor()}
                placeholder="Name (e.g. Navy)"
                className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg w-28 focus:outline-none focus:ring-2 focus:ring-blue-300"
                autoFocus
              />
              <div className="flex gap-1">
                <button onClick={addColor} className="flex-1 text-xs py-1 bg-gray-900 text-white rounded-lg font-medium">
                  Add
                </button>
                <button onClick={() => setAdding(false)} className="flex-1 text-xs py-1 bg-gray-100 text-gray-500 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-500 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors self-start mt-1"
            title="Add color"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-400">
        Click a swatch to set as default · hover to remove · &quot;+ tex&quot; assigns a texture image to that color
      </p>
    </div>
  );
}

export default function ConfigSchemaEditor({ meshNames, initialSchema, onChange, availableTextures = [] }: ConfigSchemaEditorProps) {
  const [parts, setParts] = useState<ConfigPart[]>(initialSchema?.parts ?? []);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

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
    setExpandedPart(newPart.id);
  };

  const removePart = (id: string) => updateParts(parts.filter((p) => p.id !== id));

  const updatePart = (partId: string, updates: Partial<ConfigPart>) =>
    updateParts(parts.map((p) => (p.id === partId ? { ...p, ...updates } : p)));

  const toggleMesh = (partId: string, mesh: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const next = part.meshNames.includes(mesh)
      ? part.meshNames.filter((m) => m !== mesh)
      : [...part.meshNames, mesh];
    updatePart(partId, { meshNames: next });
  };

  const addOption = (partId: string, type: ConfigOption["type"]) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const uid = crypto.randomUUID();

    const builtTextures: TextureOption[] = availableTextures.map((t) => ({
      id: t.name.toLowerCase().replace(/\s+/g, "-"),
      label: t.name,
      url: t.url,
      thumbnail: t.previewDataUrl,
    }));

    const option: ConfigOption = {
      id: `${type}-${uid}`,
      label: type === "texture" ? "Texture" : type.charAt(0).toUpperCase() + type.slice(1),
      type,
      defaultValue:
        type === "color" ? "white"
        : type === "material" ? "matte"
        : type === "texture" ? (builtTextures[0]?.id ?? "")
        : "visible",
      ...(type === "color" ? { colors: [...DEFAULT_COLORS] } : {}),
      ...(type === "material" ? { materials: [...DEFAULT_MATERIALS] } : {}),
      ...(type === "texture" ? { textures: builtTextures } : {}),
    };
    updatePart(partId, { options: [...part.options, option] });
  };

  const removeOption = (partId: string, optionId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    updatePart(partId, { options: part.options.filter((o) => o.id !== optionId) });
  };

  const updateOption = (partId: string, optionId: string, updates: Partial<ConfigOption>) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    updatePart(partId, {
      options: part.options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Customization Options</h3>
          <p className="text-xs text-gray-400 mt-0.5">Add product parts that customers can personalise</p>
        </div>
        <button
          onClick={addPart}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add part
        </button>
      </div>

      {parts.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-10 text-center">
          <p className="text-sm text-gray-400 font-medium">No parts yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Click &quot;Add part&quot; to let customers customise your product
          </p>
        </div>
      )}

      {parts.map((part) => {
        const isExpanded = expandedPart === part.id;
        return (
          <div key={part.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
            {/* Collapsed header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
              onClick={() => setExpandedPart(isExpanded ? null : part.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{part.label}</p>
                <p className="text-xs text-gray-400 truncate">
                  {part.meshNames.length > 0 ? part.meshNames.join(", ") : "No meshes assigned"}
                  {" · "}{part.options.length} option{part.options.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); removePart(part.id); }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Remove
                </button>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-5 space-y-5 bg-gray-50">
                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Part name (shown to customers)
                  </label>
                  <input
                    type="text"
                    value={part.label}
                    onChange={(e) => updatePart(part.id, { label: e.target.value })}
                    placeholder="e.g. Body, Sole, Frame"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                {/* Mesh assignment */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Which model parts does this control?
                  </label>
                  {meshNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {meshNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => toggleMesh(part.id, name)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                            part.meshNames.includes(name)
                              ? "bg-gray-900 text-white"
                              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Upload and analyze a model to see mesh names here
                    </p>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
                    Customisation options
                  </label>

                  {part.options.map((option) => (
                    <div key={option.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            option.type === "color"
                              ? "bg-purple-100 text-purple-700"
                              : option.type === "material"
                              ? "bg-green-100 text-green-700"
                              : option.type === "logo"
                              ? "bg-pink-100 text-pink-700"
                              : option.type === "texture"
                              ? "bg-cyan-100 text-cyan-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {option.type}
                        </span>
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => updateOption(part.id, option.id, { label: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <button
                          onClick={() => removeOption(part.id, option.id)}
                          className="text-red-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      {option.type === "color" && option.colors && (
                        <ColorEditor
                          colors={option.colors}
                          defaultValue={option.defaultValue}
                          onChange={(colors) => updateOption(part.id, option.id, { colors })}
                          onDefaultChange={(id) => updateOption(part.id, option.id, { defaultValue: id })}
                        />
                      )}

                      {option.type === "material" && option.materials && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Click to set as default:</p>
                          <div className="flex flex-wrap gap-2">
                            {option.materials.map((mat) => (
                              <button
                                key={mat.id}
                                onClick={() => updateOption(part.id, option.id, { defaultValue: mat.id })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                  option.defaultValue === mat.id
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {mat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {option.type === "texture" && option.textures && (
                        <div className="space-y-2">
                          {option.textures.length === 0 ? (
                            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                              No textures available. Upload texture images in Step 1 alongside your GLB.
                            </p>
                          ) : (
                            <>
                              <p className="text-xs text-gray-400">Click to set as default:</p>
                              <div className="grid grid-cols-4 gap-2">
                                {option.textures.map((tex) => (
                                  <button
                                    key={tex.id}
                                    onClick={() => updateOption(part.id, option.id, { defaultValue: tex.id })}
                                    className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                                      option.defaultValue === tex.id
                                        ? "border-gray-900 ring-2 ring-gray-900 ring-offset-1"
                                        : "border-transparent hover:border-gray-400"
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={tex.thumbnail ?? tex.url} alt={tex.label} className="w-full h-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] py-0.5 text-center truncate px-0.5">
                                      {tex.label}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    {(["color", "material", "visibility", "logo"] as ConfigOption["type"][]).map((type) => {
                      const cls: Record<string, string> = {
                        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
                        material: "bg-green-50 text-green-600 hover:bg-green-100",
                        visibility: "bg-orange-50 text-orange-600 hover:bg-orange-100",
                        logo: "bg-pink-50 text-pink-600 hover:bg-pink-100",
                      };
                      return (
                        <button
                          key={type}
                          onClick={() => addOption(part.id, type)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${cls[type]}`}
                        >
                          + {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      );
                    })}
                    {availableTextures.length > 0 && (
                      <button
                        onClick={() => addOption(part.id, "texture")}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors"
                        title={`Add texture option (${availableTextures.length} texture${availableTextures.length > 1 ? "s" : ""} available)`}
                      >
                        + Texture ({availableTextures.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {parts.length > 0 && (
        <details className="mt-1">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            View raw JSON schema
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-xs rounded-xl overflow-x-auto max-h-48">
            {JSON.stringify({ version: 1, parts }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
