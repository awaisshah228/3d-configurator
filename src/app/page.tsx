"use client";

import dynamic from "next/dynamic";
import { useProductsStore } from "@/stores/products-store";

const ConfiguratorCanvas = dynamic(
  () => import("@/components/configurator/ConfiguratorCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    ),
  }
);

export default function HomePage() {
  const products = useProductsStore((s) => s.products);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              3D Product Configurator
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Click any product to customize it in 3D
            </p>
          </div>
          <a
            href="/admin"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Admin Dashboard
          </a>
        </div>
      </header>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <a
              key={product.id}
              href={`/products/${product.id}`}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="h-64 bg-gradient-to-b from-gray-50 to-gray-100 relative">
                <ConfiguratorCanvas
                  modelUrl={product.modelUrl}
                  configSchema={product.configSchema}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-t-2xl" />
              </div>
              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {product.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {product.description || "Customizable 3D product"}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                    {product.configSchema.parts.length} customizable{" "}
                    {product.configSchema.parts.length === 1 ? "part" : "parts"}
                  </span>
                  <span className="text-xs text-gray-400">
                    Click to customize
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4 text-gray-300">&#9651;</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No products yet
            </h2>
            <p className="text-gray-500 mb-4">
              Go to the admin dashboard to upload 3D models and create products
            </p>
            <a
              href="/admin"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Go to Admin
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
