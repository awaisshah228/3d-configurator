"use client";

import { useState, useRef } from "react";

interface ModelUploaderProps {
  onModelUploaded: (file: File, url: string) => void;
}

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];

export default function ModelUploader({ onModelUploaded }: ModelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAssetDragging, setIsAssetDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [assetFiles, setAssetFiles] = useState<File[]>([]);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  const isGltf = modelFile?.name.toLowerCase().endsWith(".gltf") ?? false;

  const handleModelFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!MODEL_EXTENSIONS.includes(ext)) {
      alert("Please upload a .glb or .gltf file");
      return;
    }
    setModelFile(file);
    setAssetFiles([]);
  };

  const handleAssetFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      return ASSET_EXTENSIONS.includes(ext);
    });
    if (valid.length !== arr.length) {
      alert(`Some files were skipped. Accepted: ${ASSET_EXTENSIONS.join(", ")}`);
    }
    setAssetFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !existingNames.has(f.name))];
    });
  };

  const removeAsset = (name: string) =>
    setAssetFiles((prev) => prev.filter((f) => f.name !== name));

  const handleUpload = async () => {
    if (!modelFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("model", modelFile);
      for (const asset of assetFiles) {
        formData.append("assets", asset);
      }

      const res = await fetch("/api/models/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onModelUploaded(modelFile, data.url);
    } catch {
      // Fallback: blob URL (works for GLB; GLTF with external assets won't resolve)
      const url = URL.createObjectURL(modelFile);
      onModelUploaded(modelFile, url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Model file drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleModelFile(file);
        }}
        onClick={() => modelInputRef.current?.click()}
      >
        <input
          ref={modelInputRef}
          type="file"
          accept=".glb,.gltf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleModelFile(file);
          }}
        />

        {modelFile ? (
          <div>
            <div className="text-3xl mb-2">&#10003;</div>
            <p className="text-green-600 font-medium">{modelFile.name}</p>
            <p className="text-gray-400 text-sm mt-1">Click or drop to replace</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3 text-gray-400">&#9651;</div>
            <p className="text-gray-600 font-medium">Drop a 3D model here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">Supports .glb and .gltf</p>
          </div>
        )}
      </div>

      {/* Asset files drop zone — only shown for .gltf */}
      {isGltf && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            GLTF assets{" "}
            <span className="text-gray-400 font-normal">
              — drop the .bin buffer and texture files referenced by your .gltf
            </span>
          </p>

          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              isAssetDragging
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsAssetDragging(true); }}
            onDragLeave={() => setIsAssetDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsAssetDragging(false);
              handleAssetFiles(e.dataTransfer.files);
            }}
            onClick={() => assetInputRef.current?.click()}
          >
            <input
              ref={assetInputRef}
              type="file"
              accept=".bin,.png,.jpg,.jpeg,.webp,.ktx2,.basis"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleAssetFiles(e.target.files);
              }}
            />
            <p className="text-gray-500 text-sm">
              Drop .bin + texture files here or click to browse
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {ASSET_EXTENSIONS.join(", ")}
            </p>
          </div>

          {assetFiles.length > 0 && (
            <ul className="space-y-1">
              {assetFiles.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-1.5"
                >
                  <span className="text-gray-700 truncate">{f.name}</span>
                  <button
                    onClick={() => removeAsset(f.name)}
                    className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                  >
                    &#10005;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Upload button */}
      {modelFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {uploading
            ? "Uploading..."
            : isGltf
            ? `Upload GLTF + ${assetFiles.length} asset${assetFiles.length !== 1 ? "s" : ""}`
            : "Upload GLB"}
        </button>
      )}
    </div>
  );
}
