"use client";

import dynamic from "next/dynamic";
import { useProductsStore } from "@/stores/products-store";

const ConfiguratorCanvas = dynamic(
  () => import("@/components/configurator/ConfiguratorCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
      </div>
    ),
  }
);

export default function HomePage() {
  const products = useProductsStore((s) => s.products);

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">3D Configurator</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Customize & order in 3D</p>
            </div>
          </div>
          <a
            href="/admin"
            className="px-3.5 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            Admin Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {products.length > 0 ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Our Products</h2>
              <p className="text-sm text-gray-500 mt-1">Hover to see them in 3D — click to fully customize</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <a
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* 3D preview — auto-rotates on hover via CSS group */}
                  <div className="h-60 bg-linear-to-b from-[#efefef] to-[#e4e4e4] relative overflow-hidden">
                    <ConfiguratorCanvas
                      modelUrl={product.modelUrl}
                      configSchema={product.configSchema}
                      cameraZoom={product.cameraZoom}
                      viewerSettings={product.viewerSettings}
                      autoRotate={true}
                    />
                    {/* Subtle overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/3 transition-colors pointer-events-none" />
                    {/* "Customize" pill that appears on hover */}
                    <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <span className="bg-gray-900/80 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                        Customize →
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-600 transition-colors truncate">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {product.configSchema.parts.length > 0 ? (
                        <span className="text-[11px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
                          {product.configSchema.parts.length} customizable {product.configSchema.parts.length === 1 ? "part" : "parts"}
                        </span>
                      ) : (
                        <span className="text-[11px] bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full font-medium">
                          3D preview
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No products yet</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-6 leading-relaxed">
              Upload your first 3D model from the admin dashboard to get started
            </p>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add your first product
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
