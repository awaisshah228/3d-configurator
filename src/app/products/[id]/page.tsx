"use client";

import { use } from "react";
import { useProductsStore } from "@/stores/products-store";
import Configurator from "@/components/configurator/Configurator";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = useProductsStore((s) => s.products.find((p) => p.id === id));

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Product not found
          </h1>
          <a href="/" className="text-blue-500 hover:underline">
            Back to store
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="flex-none bg-white border-b border-gray-100 px-6 py-2.5 z-20">
        <div className="max-w-full flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All products
          </a>
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Admin
          </a>
        </div>
      </header>

      {/* Full-height Configurator */}
      <main className="flex-1 overflow-hidden">
        <Configurator
          productId={product.id}
          modelUrl={product.modelUrl}
          configSchema={product.configSchema}
          productName={product.name}
          productDescription={product.description}
          cameraZoom={product.cameraZoom}
          viewerSettings={product.viewerSettings}
        />
      </main>
    </div>
  );
}
