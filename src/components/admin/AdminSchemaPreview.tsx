"use client";

import { useEffect } from "react";
import ConfiguratorCanvas from "@/components/configurator/ConfiguratorCanvas";
import PartSelector from "@/components/configurator/PartSelector";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema, ViewerSettings } from "@/lib/configurator-types";

// Stable preview ID — never collides with a real product
const PREVIEW_ID = "__admin_preview__";

interface AdminSchemaPreviewProps {
  modelUrl: string;
  configSchema: ConfigSchema;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

export default function AdminSchemaPreview({
  modelUrl,
  configSchema,
  cameraZoom = 1,
  viewerSettings,
}: AdminSchemaPreviewProps) {
  const { initSelections, resetSelections } = useConfiguratorStore();

  // Re-initialise whenever the schema changes (admin edits options)
  useEffect(() => {
    const defaults: Record<string, Record<string, string>> = {};
    for (const part of configSchema.parts) {
      defaults[part.id] = {};
      for (const option of part.options) {
        defaults[part.id][option.id] = option.defaultValue;
      }
    }
    initSelections(PREVIEW_ID, defaults);
    // Cleanup on unmount
    return () => resetSelections();
  }, [configSchema, initSelections, resetSelections]);

  const hasParts = configSchema.parts.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 3D canvas */}
      <div className="flex-1 min-h-0">
        <ConfiguratorCanvas
          modelUrl={modelUrl}
          configSchema={configSchema}
          cameraZoom={cameraZoom}
          viewerSettings={viewerSettings}
          disablePostProcessing
        />
      </div>

      {/* Interactive options — linked to the canvas above */}
      <div className="border-t border-gray-100">
        {hasParts ? (
          <div className="overflow-y-auto max-h-72">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live preview — test your options below
              </p>
            </div>
            <div className="px-4 pb-4">
              <PartSelector configSchema={configSchema} />
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-gray-400">
              Add parts on the left — they&apos;ll appear here as interactive controls
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
