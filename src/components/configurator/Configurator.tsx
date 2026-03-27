"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import PartSelector from "./PartSelector";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema, ViewerSettings } from "@/lib/configurator-types";
import type { Selections } from "@/lib/configurator-types";

const ConfiguratorCanvas = dynamic(() => import("./ConfiguratorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-gray-400 text-lg">Loading 3D Viewer...</div>
    </div>
  ),
});

interface ConfiguratorProps {
  modelUrl: string;
  configSchema: ConfigSchema;
  productName: string;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

export default function Configurator({
  modelUrl,
  configSchema,
  productName,
  cameraZoom,
  viewerSettings,
}: ConfiguratorProps) {
  const { initSelections, resetSelections } = useConfiguratorStore();

  // Init default selections from config schema
  useEffect(() => {
    const defaults: Selections = {};
    for (const part of configSchema.parts) {
      defaults[part.id] = {};
      for (const option of part.options) {
        defaults[part.id][option.id] = option.defaultValue;
      }
    }
    initSelections(defaults);
    return () => resetSelections();
  }, [configSchema, initSelections, resetSelections]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* 3D Canvas */}
      <div className="flex-1 min-h-[500px]">
        <ConfiguratorCanvas modelUrl={modelUrl} configSchema={configSchema} cameraZoom={cameraZoom} viewerSettings={viewerSettings} />
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0">
        <div className="sticky top-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{productName}</h2>
          <p className="text-sm text-gray-500 mb-4">Customize your product</p>
          <PartSelector configSchema={configSchema} />
          <button
            onClick={() => {
              const defaults: Selections = {};
              for (const part of configSchema.parts) {
                defaults[part.id] = {};
                for (const option of part.options) {
                  defaults[part.id][option.id] = option.defaultValue;
                }
              }
              initSelections(defaults);
            }}
            className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
}
