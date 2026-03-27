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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to products
          </a>
          <a
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Admin
          </a>
        </div>
      </header>

      {/* Configurator */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Configurator
          modelUrl={product.modelUrl}
          configSchema={product.configSchema}
          productName={product.name}
          cameraZoom={product.cameraZoom}
          viewerSettings={product.viewerSettings}
        />
      </main>
    </div>
  );
}
