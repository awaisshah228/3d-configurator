"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ModelUploader, { type UploadedTexture } from "@/components/admin/ModelUploader";
import MeshAnalyzer from "@/components/admin/MeshAnalyzer";
import ConfigSchemaEditor from "@/components/admin/ConfigSchemaEditor";
import AdminModelViewer, { type TestOverride } from "@/components/admin/AdminModelViewer";
import ViewerSettingsPanel from "@/components/admin/ViewerSettingsPanel";
import { DEFAULT_VIEWER_SETTINGS } from "@/lib/configurator-types";
import type { ViewerSettings, ConfigSchema } from "@/lib/configurator-types";
import { useProductsStore } from "@/stores/products-store";

const ConfiguratorCanvas = dynamic(
  () => import("@/components/configurator/ConfiguratorCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading preview…</p>
      </div>
    ),
  }
);

const AdminSchemaPreview = dynamic(
  () => import("@/components/admin/AdminSchemaPreview"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    ),
  }
);

// ── Step indicator ───────────────────────────────────────────────────
const STEPS = ["Upload Model", "Product Info", "Customisation", "Preview & Save"] as const;

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={`text-[11px] font-semibold text-center leading-tight whitespace-nowrap ${
                  active ? "text-gray-900" : done ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function AdminPage() {
  const { products, addProduct, removeProduct, updateProduct } = useProductsStore();

  // Which tab is showing (manage vs wizard)
  const [activeTab, setActiveTab] = useState<"manage" | "wizard">("manage");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);

  // Product data
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelFileName, setModelFileName] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [meshNames, setMeshNames] = useState<string[]>([]);
  const [materialNames, setMaterialNames] = useState<string[]>([]);
  const [configSchema, setConfigSchema] = useState<ConfigSchema>({ version: 1, parts: [] });
  const [cameraZoom, setCameraZoom] = useState(1);
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [testOverrides, setTestOverrides] = useState<Record<string, TestOverride>>({});
  const [uploadedTextures, setUploadedTextures] = useState<UploadedTexture[]>([]);

  const handleMeshesFound = useCallback((meshes: string[], materials: string[]) => {
    setMeshNames(meshes);
    setMaterialNames(materials);
  }, []);

  const resetWizard = () => {
    setModelUrl(null);
    setModelFileName("");
    setProductName("");
    setProductDescription("");
    setMeshNames([]);
    setMaterialNames([]);
    setConfigSchema({ version: 1, parts: [] });
    setViewerSettings(DEFAULT_VIEWER_SETTINGS);
    setCameraZoom(1);
    setSelectedMesh(null);
    setTestOverrides({});
    setUploadedTextures([]);
    setEditingId(null);
    setWizardStep(1);
  };

  const startNewProduct = () => {
    resetWizard();
    setActiveTab("wizard");
  };

  const startEditProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setEditingId(id);
    setModelUrl(product.modelUrl);
    setModelFileName("");
    setProductName(product.name);
    setProductDescription(product.description);
    setMeshNames(product.meshNames);
    setMaterialNames(product.materialNames);
    setConfigSchema(product.configSchema);
    setCameraZoom(product.cameraZoom ?? 1);
    setViewerSettings(product.viewerSettings ?? DEFAULT_VIEWER_SETTINGS);
    setTestOverrides({});
    setWizardStep(2); // skip upload step when editing
    setActiveTab("wizard");
  };

  const applyOverridesToSchema = (schema: ConfigSchema, overrides: Record<string, TestOverride>): ConfigSchema => {
    if (Object.keys(overrides).length === 0) return schema;
    return {
      ...schema,
      parts: schema.parts.map((part) => {
        const meshOverride = part.meshNames.map((m) => overrides[m]).find(Boolean);
        if (!meshOverride) return part;
        return {
          ...part,
          options: part.options.map((option) => {
            if (option.type === "color" && meshOverride.color && option.colors) {
              const match = option.colors.find((c) => c.hex === meshOverride.color);
              if (match) return { ...option, defaultValue: match.id };
              const customId = `custom-${meshOverride.color.replace("#", "")}`;
              return {
                ...option,
                colors: [...option.colors, { id: customId, label: "Custom", hex: meshOverride.color }],
                defaultValue: customId,
              };
            }
            if (option.type === "material" && meshOverride.roughness !== undefined && option.materials) {
              const match = option.materials.find(
                (m) => m.roughness === meshOverride.roughness && m.metalness === meshOverride.metalness
              );
              if (match) return { ...option, defaultValue: match.id };
            }
            return option;
          }),
        };
      }),
    };
  };

  const handleSave = () => {
    if (!modelUrl || !productName.trim()) return;
    const schema = applyOverridesToSchema(configSchema, testOverrides);

    if (editingId) {
      updateProduct(editingId, {
        name: productName,
        description: productDescription,
        modelUrl,
        configSchema: schema,
        meshNames,
        materialNames,
        cameraZoom,
        viewerSettings,
      });
    } else {
      addProduct({
        id: `product-${crypto.randomUUID()}`,
        name: productName,
        description: productDescription,
        modelUrl,
        configSchema: schema,
        meshNames,
        materialNames,
        cameraZoom,
        viewerSettings,
      });
    }

    resetWizard();
    setActiveTab("manage");
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Product Studio</h1>
              <p className="text-xs text-gray-400 mt-0.5">Manage your 3D product catalogue</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← View store
            </a>
            {activeTab === "wizard" && (
              <button
                onClick={() => { resetWizard(); setActiveTab("manage"); }}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Tab bar ── */}
        {activeTab === "manage" && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Products
              <span className="ml-2 text-base font-normal text-gray-400">({products.length})</span>
            </h2>
            <button
              onClick={startNewProduct}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add product
            </button>
          </div>
        )}

        {/* ════════════════════════════════════
            MANAGE TAB
        ════════════════════════════════════ */}
        {activeTab === "manage" && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-3xl">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No products yet</h3>
                <p className="text-gray-400 text-sm mb-6">Upload a 3D model to create your first product</p>
                <button
                  onClick={startNewProduct}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                >
                  Add your first product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="h-48 bg-gray-50 relative">
                      <ConfiguratorCanvas
                        modelUrl={product.modelUrl}
                        configSchema={product.configSchema}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-base leading-snug">{product.name}</h3>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {product.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                          {product.configSchema.parts.length} part{product.configSchema.parts.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{product.meshNames.length} meshes</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <a
                          href={`/products/${product.id}`}
                          className="flex-1 text-center py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
                        >
                          Preview
                        </a>
                        <button
                          onClick={() => startEditProduct(product.id)}
                          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${product.name}"?`)) removeProduct(product.id);
                          }}
                          className="py-2 px-3 bg-red-50 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            WIZARD TAB
        ════════════════════════════════════ */}
        {activeTab === "wizard" && (
          <div>
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? "Edit product" : "Add new product"}
              </h2>
            </div>

            <StepBar current={wizardStep} />

            {/* ── Step 1: Upload ── */}
            {wizardStep === 1 && (
              <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Upload your 3D model</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      We support <strong>.glb</strong> files (single file, easiest) or a{" "}
                      <strong>.gltf + textures folder</strong>. Drag and drop your model below.
                    </p>
                  </div>

                  <ModelUploader
                    onModelUploaded={(file, url, textures) => {
                      setModelUrl(url);
                      setModelFileName(file.name);
                      if (!productName) {
                        setProductName(
                          file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")
                        );
                      }
                      if (textures && textures.length > 0) setUploadedTextures(textures);
                      setWizardStep(2);
                    }}
                  />

                  {/* Tips */}
                  <div className="mt-6 bg-blue-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Tips</p>
                    <ul className="text-xs text-blue-600 space-y-1.5 list-disc list-inside">
                      <li>GLB is a single self-contained file — easiest to use</li>
                      <li>If you have separate texture files, drop the whole folder</li>
                      <li>Models exported from Blender, Cinema 4D, or Maya work great</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Product info + analyze ── */}
            {wizardStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left */}
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-1">Name your product</h3>
                    <p className="text-xs text-gray-400 mb-4">This is what your customers will see in the store.</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                          Product name *
                        </label>
                        <input
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="e.g. Classic Sneaker, Office Chair"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                          Description (optional)
                        </label>
                        <textarea
                          value={productDescription}
                          onChange={(e) => setProductDescription(e.target.value)}
                          placeholder="Tell customers what makes this product special…"
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-1">Model parts</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      These are the individual parts of your 3D model. You will assign them to customisable groups in the next step.
                    </p>
                    <MeshAnalyzer
                      modelUrl={modelUrl}
                      selectedMesh={selectedMesh}
                      onMeshesFound={handleMeshesFound}
                      onMeshSelect={setSelectedMesh}
                    />
                  </div>
                </div>

                {/* Right: 3D preview */}
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="h-130">
                      {modelUrl ? (
                        <AdminModelViewer
                          modelUrl={modelUrl}
                          selectedMesh={selectedMesh}
                          onMeshSelect={setSelectedMesh}
                          cameraZoom={cameraZoom}
                          viewerSettings={viewerSettings}
                          onOverridesChange={setTestOverrides}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                          No model loaded
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 font-medium text-center">
                        Click any part to highlight it · drag to rotate
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Customisation ── */}
            {wizardStep === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: schema editor */}
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <ConfigSchemaEditor
                      meshNames={meshNames}
                      initialSchema={configSchema}
                      onChange={setConfigSchema}
                      availableTextures={uploadedTextures}
                    />
                  </div>
                </div>

                {/* Right: live interactive preview */}
                <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Customer view</span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Click options below to test them live
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Zoom</span>
                        <input
                          type="range" min={0.3} max={3} step={0.05}
                          value={cameraZoom}
                          onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                          className="w-20 accent-gray-900"
                        />
                        <span className="w-8 text-right font-medium text-gray-600">{cameraZoom.toFixed(1)}×</span>
                      </div>
                    </div>

                    {/* Canvas + options together */}
                    <div className="h-155">
                      {modelUrl ? (
                        <AdminSchemaPreview
                          modelUrl={modelUrl}
                          configSchema={configSchema}
                          cameraZoom={cameraZoom}
                          viewerSettings={viewerSettings}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                          Upload a model first
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                      Scene settings
                    </p>
                    <ViewerSettingsPanel settings={viewerSettings} onChange={setViewerSettings} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Preview & Save ── */}
            {wizardStep === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: interactive configurator preview */}
                <div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900">Customer preview</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        This is exactly what your customers will see
                      </p>
                    </div>
                    <div className="h-130">
                      {modelUrl ? (
                        <ConfiguratorCanvas
                          modelUrl={modelUrl}
                          configSchema={configSchema}
                          cameraZoom={cameraZoom}
                          viewerSettings={viewerSettings}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                          No model
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: summary + save */}
                <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                  {/* Summary card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-900">Product summary</h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Name</span>
                        <span className="text-sm font-semibold text-gray-800 text-right max-w-48 truncate">
                          {productName || <span className="text-red-400 italic">Required</span>}
                        </span>
                      </div>

                      {productDescription && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide shrink-0">
                            Description
                          </span>
                          <span className="text-sm text-gray-600 text-right line-clamp-2">
                            {productDescription}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Model</span>
                        <span className="text-sm font-semibold text-gray-800 font-mono truncate max-w-48">
                          {modelFileName || "Uploaded"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Parts</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {configSchema.parts.length} customisable part{configSchema.parts.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Meshes</span>
                        <span className="text-sm font-semibold text-gray-800">{meshNames.length}</span>
                      </div>
                    </div>

                    {!productName.trim() && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Please go back and enter a product name
                      </div>
                    )}

                    <button
                      onClick={handleSave}
                      disabled={!productName.trim() || !modelUrl}
                      className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingId ? "Save changes" : "Publish product"}
                    </button>

                    <button
                      onClick={() => { resetWizard(); setActiveTab("manage"); }}
                      className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Wizard nav buttons ── */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setWizardStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
                disabled={wizardStep === 1}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              {wizardStep < 4 ? (
                <button
                  onClick={() => setWizardStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
                  disabled={wizardStep === 1 && !modelUrl}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!productName.trim() || !modelUrl}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {editingId ? "Save changes" : "Publish product"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
