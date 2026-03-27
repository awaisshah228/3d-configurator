"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import PartSelector from "./PartSelector";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema, ViewerSettings } from "@/lib/configurator-types";
import type { Selections } from "@/lib/configurator-types";
import type { ViewPreset } from "./ConfiguratorCanvas";

const ConfiguratorCanvas = dynamic(() => import("./ConfiguratorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#e8e8e8] flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <p className="text-sm text-gray-500 font-medium">Loading 3D viewer…</p>
    </div>
  ),
});

interface ConfiguratorProps {
  productId: string;
  modelUrl: string;
  configSchema: ConfigSchema;
  productName: string;
  productDescription?: string;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

const VIEW_BUTTONS: { label: string; preset: ViewPreset; icon: string }[] = [
  { label: "Front", preset: "front", icon: "⬆" },
  { label: "Left",  preset: "left",  icon: "◀" },
  { label: "Right", preset: "right", icon: "▶" },
  { label: "Top",   preset: "top",   icon: "⬇" },
];

/** Build a compact summary of current selections */
function buildSummaryChips(
  configSchema: ConfigSchema,
  selections: Selections
): { label: string; value: string; color?: string }[] {
  const chips: { label: string; value: string; color?: string }[] = [];
  for (const part of configSchema.parts) {
    for (const option of part.options) {
      const val = selections[part.id]?.[option.id] ?? option.defaultValue;
      if (option.type === "color") {
        const found = option.colors?.find((c) => c.id === val);
        if (found) chips.push({ label: option.label, value: found.label, color: found.hex });
      } else if (option.type === "material") {
        const found = option.materials?.find((m) => m.id === val);
        if (found) chips.push({ label: option.label, value: found.label });
      } else if (option.type === "texture") {
        const found = option.textures?.find((t) => t.id === val);
        if (found) chips.push({ label: option.label, value: found.label });
      }
    }
  }
  return chips;
}

export default function Configurator({
  productId,
  modelUrl,
  configSchema,
  productName,
  productDescription,
  cameraZoom,
  viewerSettings,
}: ConfiguratorProps) {
  const { initSelections, resetSelections, selections, undo, redo, canUndo, canRedo } = useConfiguratorStore();
  const [viewPreset, setViewPreset] = useState<ViewPreset>("default");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // ── Init selections from URL params or defaults ──
  useEffect(() => {
    const defaults: Selections = {};
    for (const part of configSchema.parts) {
      defaults[part.id] = {};
      for (const option of part.options) {
        defaults[part.id][option.id] = option.defaultValue;
      }
    }

    // Hydrate from URL search params if present
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.size > 0) {
        const fromUrl: Selections = { ...defaults };
        params.forEach((value, key) => {
          const [partId, optId] = key.split(".");
          if (partId && optId && fromUrl[partId]) {
            fromUrl[partId][optId] = value;
          }
        });
        initSelections(productId, fromUrl);
        // Clean URL without reload
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
    }

    initSelections(productId, defaults);
    return () => resetSelections();
  }, [productId, configSchema, initSelections, resetSelections]);

  // ── Keyboard shortcuts for undo/redo ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleReset = useCallback(() => {
    const defaults: Selections = {};
    for (const part of configSchema.parts) {
      defaults[part.id] = {};
      for (const option of part.options) {
        defaults[part.id][option.id] = option.defaultValue;
      }
    }
    initSelections(productId, defaults);
  }, [productId, configSchema, initSelections]);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-custom.png`;
    a.click();
  }, [productName]);

  const handleShare = useCallback(() => {
    const params = new URLSearchParams();
    for (const [partId, opts] of Object.entries(selections)) {
      for (const [optId, val] of Object.entries(opts)) {
        params.set(`${partId}.${optId}`, val);
      }
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }, [selections]);

  const handleViewPreset = (preset: ViewPreset) => {
    setViewPreset(preset);
    setTimeout(() => setViewPreset("default"), 100);
  };

  const partCount = configSchema.parts.length;
  const summaryChips = buildSummaryChips(configSchema, selections);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f0f0f0]">
      {/* ── 3D Canvas area ── */}
      <div className="flex-1 relative min-w-0">
        <ConfiguratorCanvas
          modelUrl={modelUrl}
          configSchema={configSchema}
          cameraZoom={cameraZoom}
          viewerSettings={viewerSettings}
          viewPreset={viewPreset}
          autoRotate={autoRotate}
        />

        {/* View angle toolbar — bottom center */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur rounded-2xl px-3 py-2 shadow-lg border border-white/50">
          {VIEW_BUTTONS.map(({ label, preset, icon }) => (
            <button
              key={preset}
              onClick={() => handleViewPreset(preset)}
              title={label}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <span className="mr-1 text-[10px]">{icon}</span>{label}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Auto-rotate toggle */}
          <button
            onClick={() => setAutoRotate((v) => !v)}
            title={autoRotate ? "Stop rotation" : "Auto-rotate"}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors flex items-center gap-1 ${
              autoRotate
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            360
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Screenshot */}
          <button
            onClick={handleScreenshot}
            title="Save screenshot"
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Save
          </button>
        </div>

        {/* Undo/Redo — top left */}
        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/90 backdrop-blur rounded-xl px-1.5 py-1 shadow-md border border-white/50">
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </button>
        </div>

        {/* Mobile panel toggle */}
        <button
          onClick={() => setIsPanelOpen((v) => !v)}
          className="absolute top-4 right-4 lg:hidden bg-white rounded-xl p-2.5 shadow-md border border-gray-100"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Right panel ── */}
      <aside
        className={`
          w-full lg:w-80 xl:w-96 bg-white border-l border-gray-100 shadow-xl
          flex flex-col overflow-hidden z-10
          fixed inset-0 lg:relative lg:inset-auto
          transition-transform duration-300
          ${isPanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Panel header */}
        <div className="flex-none px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{productName}</h2>
              {productDescription && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{productDescription}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {/* Share button */}
              <button
                onClick={handleShare}
                title="Copy share link"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors relative"
              >
                {shareCopied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
              </button>

              {/* AR Quick Look (iOS Safari) */}
              {modelUrl.endsWith(".usdz") && (
                <a
                  href={modelUrl}
                  rel="ar"
                  title="View in AR"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                </a>
              )}

              <button
                onClick={() => setIsPanelOpen(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Share copied toast */}
          {shareCopied && (
            <p className="text-xs text-green-600 mt-1.5 font-medium">Link copied to clipboard!</p>
          )}

          {/* Selection summary chips */}
          {summaryChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {summaryChips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-100 rounded-full px-2 py-0.5"
                >
                  {chip.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 border border-white shadow-sm"
                      style={{ background: chip.color }}
                    />
                  )}
                  {chip.value}
                </span>
              ))}
            </div>
          )}

          {partCount > 0 && summaryChips.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {partCount} customizable part{partCount > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Scrollable options */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {configSchema.parts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🎨</div>
              <p className="text-sm">No customization options configured</p>
            </div>
          ) : (
            <PartSelector configSchema={configSchema} />
          )}
        </div>

        {/* Footer actions */}
        <div className="flex-none px-4 py-4 border-t border-gray-100 space-y-2.5 bg-white">
          <button className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm">
            Add to Cart
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100"
            >
              Reset defaults
            </button>
            <button
              onClick={handleScreenshot}
              className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Screenshot
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[9] lg:hidden"
          onClick={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
}
