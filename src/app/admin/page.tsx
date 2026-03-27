"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ModelUploader from "@/components/admin/ModelUploader";
import MeshAnalyzer from "@/components/admin/MeshAnalyzer";
import ConfigSchemaEditor from "@/components/admin/ConfigSchemaEditor";
import AdminModelViewer from "@/components/admin/AdminModelViewer";
import { useProductsStore } from "@/stores/products-store";
import type { ConfigSchema } from "@/lib/configurator-types";

const ConfiguratorCanvas = dynamic(
  () => import("@/components/configurator/ConfiguratorCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400">Loading 3D preview...</p>
      </div>
    ),
  }
);

export default function AdminPage() {
  const { products, addProduct, removeProduct, updateProduct } = useProductsStore();

  // New product form state
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelFileName, setModelFileName] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [meshNames, setMeshNames] = useState<string[]>([]);
  const [materialNames, setMaterialNames] = useState<string[]>([]);
  const [configSchema, setConfigSchema] = useState<ConfigSchema>({
    version: 1,
    parts: [],
  });
  const [activeTab, setActiveTab] = useState<"add" | "manage">("manage");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [cameraZoom, setCameraZoom] = useState<number>(1);

  const handleModelUploaded = (file: File, url: string) => {
    setModelUrl(url);
    setModelFileName(file.name);
    if (!productName) {
      setProductName(file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  const handleMeshesFound = useCallback((meshes: string[], materials: string[]) => {
    setMeshNames(meshes);
    setMaterialNames(materials);
  }, []);

  const handleSaveProduct = () => {
    if (!modelUrl || !productName) {
      alert("Please provide a model and product name");
      return;
    }

    if (editingId) {
      updateProduct(editingId, {
        name: productName,
        description: productDescription,
        modelUrl,
        configSchema,
        meshNames,
        materialNames,
        cameraZoom,
      });
      setEditingId(null);
    } else {
      addProduct({
        id: `product-${Date.now()}`,
        name: productName,
        description: productDescription,
        modelUrl,
        configSchema,
        meshNames,
        materialNames,
        cameraZoom,
      });
    }

    // Reset form
    setModelUrl(null);
    setModelFileName("");
    setProductName("");
    setProductDescription("");
    setMeshNames([]);
    setMaterialNames([]);
    setConfigSchema({ version: 1, parts: [] });
    setActiveTab("manage");
  };

  const handleEditProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setEditingId(id);
    setProductName(product.name);
    setProductDescription(product.description);
    setModelUrl(product.modelUrl);
    setMeshNames(product.meshNames);
    setMaterialNames(product.materialNames);
    setConfigSchema(product.configSchema);
    setCameraZoom(product.cameraZoom ?? 1);
    setActiveTab("add");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              3D Product Admin
            </h1>
            <p className="text-sm text-gray-500">
              Upload models, configure customization, manage products
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            View Store
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "manage"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Manage Products ({products.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("add");
              setEditingId(null);
              setModelUrl(null);
              setProductName("");
              setProductDescription("");
              setMeshNames([]);
              setMaterialNames([]);
              setConfigSchema({ version: 1, parts: [] });
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "add"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {editingId ? "Edit Product" : "+ Add Product"}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pb-12">
        {/* ─── Manage Products Tab ─── */}
        {activeTab === "manage" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <ConfiguratorCanvas
                    modelUrl={product.modelUrl}
                    configSchema={product.configSchema}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.description || "No description"}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {product.configSchema.parts.length} configurable parts ·{" "}
                    {product.meshNames.length} meshes
                  </p>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={`/products/${product.id}`}
                      className="flex-1 text-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Preview
                    </a>
                    <button
                      onClick={() => handleEditProduct(product.id)}
                      className="flex-1 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this product?")) {
                          removeProduct(product.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-400">
                <p className="text-lg mb-2">No products yet</p>
                <button
                  onClick={() => setActiveTab("add")}
                  className="text-blue-500 hover:underline"
                >
                  Add your first product
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Add/Edit Product Tab ─── */}
        {activeTab === "add" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Upload & Config */}
            <div className="space-y-6">
              {/* Product Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">
                  {editingId ? "Edit Product" : "New Product"}
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Product name"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                </div>
              </div>

              {/* Model Upload */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">
                  3D Model
                </h2>
                <ModelUploader onModelUploaded={handleModelUploaded} />
                {modelUrl && (
                  <p className="text-sm text-green-600 mt-2">
                    Model loaded: {modelFileName || modelUrl}
                  </p>
                )}
              </div>

              {/* Mesh Analysis */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">
                  Model Analysis
                </h2>
                <MeshAnalyzer
                  modelUrl={modelUrl}
                  selectedMesh={selectedMesh}
                  onMeshesFound={handleMeshesFound}
                  onMeshSelect={setSelectedMesh}
                />
              </div>

              {/* Config Schema Editor */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">
                  Customization Config
                </h2>
                <ConfigSchemaEditor
                  meshNames={meshNames}
                  initialSchema={configSchema}
                  onChange={setConfigSchema}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProduct}
                disabled={!modelUrl || !productName}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? "Update Product" : "Save Product"}
              </button>
            </div>

            {/* Right Column: Live Preview */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800">Live Preview</h2>
                  {modelUrl && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Zoom</span>
                      <input
                        type="range" min={0.3} max={3} step={0.05}
                        value={cameraZoom}
                        onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                        className="w-24 accent-blue-500"
                      />
                      <span className="w-8 text-right">{cameraZoom.toFixed(1)}×</span>
                    </div>
                  )}
                </div>
                {modelUrl ? (
                  <div className="h-[500px]">
                    <AdminModelViewer
                      modelUrl={modelUrl}
                      selectedMesh={selectedMesh}
                      onMeshSelect={setSelectedMesh}
                      cameraZoom={cameraZoom}
                    />
                  </div>
                ) : (
                  <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    Upload a model to see preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
