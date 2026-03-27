"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import PartSelector from "./PartSelector";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema, ViewerSettings, Selections } from "@/lib/configurator-types";

const ConfiguratorCanvas = dynamic(() => import("./ConfiguratorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      <p className="text-gray-400 text-sm font-medium">Loading 3D viewer…</p>
    </div>
  ),
});

interface ConfiguratorProps {
  productId: string;
  modelUrl: string;
  configSchema: ConfigSchema;
  productName: string;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

export default function Configurator({
  productId,
  modelUrl,
  configSchema,
  productName,
  cameraZoom,
  viewerSettings,
}: ConfiguratorProps) {
  const { initSelections, resetSelections } = useConfiguratorStore();
  const [selectedPartId, setSelectedPartId] = useState<string | null>(
    configSchema.parts[0]?.id ?? null
  );

  const buildDefaults = (): Selections => {
    const defaults: Selections = {};
    for (const part of configSchema.parts) {
      defaults[part.id] = {};
      for (const option of part.options) {
        defaults[part.id][option.id] = option.defaultValue;
      }
    }
    return defaults;
  };

  useEffect(() => {
    initSelections(productId, buildDefaults());
    return () => resetSelections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, configSchema]);

  // When a mesh is clicked in the canvas, find which part owns it and switch the panel
  const handleMeshClick = (meshName: string) => {
    const matched = configSchema.parts.find((p) =>
      p.meshNames.some(
        (n) =>
          meshName === n ||
          meshName.toLowerCase().includes(n.toLowerCase()) ||
          n.toLowerCase().includes(meshName.toLowerCase())
      )
    );
    if (matched) setSelectedPartId(matched.id);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
      {/* ── 3D Canvas ── */}
      <div className="flex-1 min-h-[420px] lg:min-h-[600px] relative">
        <ConfiguratorCanvas
          modelUrl={modelUrl}
          configSchema={configSchema}
          cameraZoom={cameraZoom}
          viewerSettings={viewerSettings}
          selectedPartId={selectedPartId}
          onMeshClick={handleMeshClick}
        />

        {/* Click-to-select hint — fades after first interaction */}
        {configSchema.parts.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
              Click a part on the model to jump to its options
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col border-l border-gray-100 max-h-[600px]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{productName}</h2>
          <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
            {configSchema.parts.length} customizable{" "}
            {configSchema.parts.length === 1 ? "part" : "parts"}
          </p>
        </div>

        {/* Part selector (scrollable) */}
        <div className="flex-1 overflow-hidden">
          <PartSelector
            configSchema={configSchema}
            selectedPartId={selectedPartId}
            onPartChange={setSelectedPartId}
          />
        </div>

        {/* Footer: reset */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <button
            onClick={() => initSelections(productId, buildDefaults())}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            Reset to default
          </button>
        </div>
      </div>
    </div>
  );
}
