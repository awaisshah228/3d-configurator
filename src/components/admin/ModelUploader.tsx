"use client";

import { useState, useRef } from "react";

interface ModelUploaderProps {
  onModelUploaded: (file: File, url: string) => void;
}

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];

interface ScannedBundle {
  modelFile: File;
  assetFiles: File[];
}

/** Recursively read all files from a FileSystemDirectoryEntry */
function readDirectoryEntries(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  return new Promise((resolve) => {
    const reader = dirEntry.createReader();
    const allFiles: File[] = [];

    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(allFiles);
          return;
        }
        for (const entry of entries) {
          if (entry.isFile) {
            const file = await new Promise<File>((res) =>
              (entry as FileSystemFileEntry).file(res)
            );
            allFiles.push(file);
          } else if (entry.isDirectory) {
            const nested = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
            allFiles.push(...nested);
          }
        }
        readBatch(); // read next batch (browsers return ≤100 entries at a time)
      });
    };

    readBatch();
  });
}

/** From a flat list of files, pick the model + assets */
function scanBundle(files: File[]): ScannedBundle | null {
  const models = files.filter((f) => {
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    return MODEL_EXTENSIONS.includes(ext);
  });

  if (models.length === 0) return null;

  // Prefer .gltf over .glb if both present; otherwise take the first
  const modelFile =
    models.find((f) => f.name.toLowerCase().endsWith(".gltf")) ?? models[0];

  const assetFiles = files.filter((f) => {
    if (f === modelFile) return false;
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    return ASSET_EXTENSIONS.includes(ext);
  });

  return { modelFile, assetFiles };
}

export default function ModelUploader({ onModelUploaded }: ModelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bundle, setBundle] = useState<ScannedBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const applyFiles = (files: File[]) => {
    setError(null);
    const scanned = scanBundle(files);
    if (!scanned) {
      setError("No .glb or .gltf file found. Please include one in your selection.");
      return;
    }
    setBundle(scanned);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const items = Array.from(e.dataTransfer.items);
    const allFiles: File[] = [];

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (!entry) continue;

      if (entry.isDirectory) {
        const nested = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
        allFiles.push(...nested);
      } else if (entry.isFile) {
        const file = await new Promise<File>((res) =>
          (entry as FileSystemFileEntry).file(res)
        );
        allFiles.push(file);
      }
    }

    applyFiles(allFiles);
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) applyFiles(Array.from(e.target.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) applyFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!bundle) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("model", bundle.modelFile);
      for (const asset of bundle.assetFiles) {
        formData.append("assets", asset);
      }

      const res = await fetch("/api/models/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onModelUploaded(bundle.modelFile, data.url);
    } catch {
      // Fallback blob URL (works for GLB; GLTF with external assets may not resolve)
      const url = URL.createObjectURL(bundle.modelFile);
      onModelUploaded(bundle.modelFile, url);
    } finally {
      setUploading(false);
    }
  };

  const isGltf = bundle?.modelFile.name.toLowerCase().endsWith(".gltf") ?? false;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {bundle ? (
          <div className="space-y-1">
            <div className="text-3xl mb-2">&#10003;</div>
            <p className="font-medium text-green-600">{bundle.modelFile.name}</p>
            {bundle.assetFiles.length > 0 && (
              <p className="text-sm text-gray-500">
                + {bundle.assetFiles.length} asset{bundle.assetFiles.length !== 1 ? "s" : ""} detected
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3 text-gray-400">&#9651;</div>
            <p className="text-gray-600 font-medium">
              Drop a folder or files here
            </p>
            <p className="text-gray-400 text-sm mt-1">
              The folder can contain a .gltf/.glb + any .bin and texture files —
              the right files will be detected automatically
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Browse buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => folderInputRef.current?.click()}
          className="flex-1 py-2 rounded-lg border border-gray-300 hover:border-gray-400 text-sm text-gray-600 transition-colors"
        >
          Browse folder
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-2 rounded-lg border border-gray-300 hover:border-gray-400 text-sm text-gray-600 transition-colors"
        >
          Browse files
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error — webkitdirectory is not in TS types but is widely supported
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={handleFolderInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2,.basis"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Detected file list */}
      {bundle && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-gray-700">Detected files</p>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
              {isGltf ? "GLTF" : "GLB"}
            </span>
            <span className="text-gray-700 truncate">{bundle.modelFile.name}</span>
          </div>
          {bundle.assetFiles.map((f) => {
            const ext = f.name.substring(f.name.lastIndexOf(".") + 1).toUpperCase();
            return (
              <div key={f.name} className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-xs font-medium">
                  {ext}
                </span>
                <span className="text-gray-600 truncate">{f.name}</span>
              </div>
            );
          })}
          {bundle.assetFiles.length === 0 && isGltf && (
            <p className="text-amber-600 text-xs">
              No assets found — make sure .bin and texture files are in the same folder.
            </p>
          )}
        </div>
      )}

      {/* Upload button */}
      {bundle && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {uploading ? "Uploading..." : `Upload ${isGltf ? "GLTF bundle" : "GLB"}`}
        </button>
      )}
    </div>
  );
}
