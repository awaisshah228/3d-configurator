"use client";

import { useState, useRef } from "react";

interface ModelUploaderProps {
  onModelUploaded: (file: File, url: string) => void;
}

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];

function getExt(name: string) {
  return name.substring(name.lastIndexOf(".")).toLowerCase();
}

interface FileEntry {
  file: File;
  /** Path from the drop/selection root, e.g. "mymodel/textures/foo.png" */
  path: string;
}

interface AssetEntry {
  file: File;
  /** Path relative to the GLTF file's location, e.g. "textures/foo.png" */
  relativePath: string;
}

interface ScannedBundle {
  modelFile: File;
  assetFiles: AssetEntry[];
}

/** Recursively read all files from a FileSystemDirectoryEntry, preserving paths */
async function readDirEntries(dirEntry: FileSystemDirectoryEntry): Promise<FileEntry[]> {
  const reader = dirEntry.createReader();
  const results: FileEntry[] = [];

  await new Promise<void>((resolve) => {
    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) { resolve(); return; }
        for (const entry of entries) {
          if (entry.isFile) {
            const file = await new Promise<File>((res) =>
              (entry as FileSystemFileEntry).file(res)
            );
            // entry.fullPath starts with "/", strip it
            results.push({ file, path: entry.fullPath.replace(/^\//, "") });
          } else if (entry.isDirectory) {
            const nested = await readDirEntries(entry as FileSystemDirectoryEntry);
            results.push(...nested);
          }
        }
        readBatch();
      });
    };
    readBatch();
  });

  return results;
}

/** Scan a flat list of FileEntry and return the model + assets with correct relative paths */
function scanBundle(entries: FileEntry[]): ScannedBundle | null {
  const modelEntry =
    entries.find((e) => e.file.name.toLowerCase().endsWith(".gltf")) ??
    entries.find((e) => MODEL_EXTENSIONS.includes(getExt(e.file.name)));

  if (!modelEntry) return null;

  // Base dir of the model file within the uploaded tree, e.g. "mymodel/" or ""
  const lastSlash = modelEntry.path.lastIndexOf("/");
  const modelBaseDir = lastSlash >= 0 ? modelEntry.path.substring(0, lastSlash + 1) : "";

  const assetFiles: AssetEntry[] = entries
    .filter((e) => e !== modelEntry && ASSET_EXTENSIONS.includes(getExt(e.file.name)))
    .map((e) => ({
      file: e.file,
      // Strip the model's base dir so paths are relative to the GLTF location
      relativePath: e.path.startsWith(modelBaseDir)
        ? e.path.substring(modelBaseDir.length)
        : e.file.name,
    }));

  return { modelFile: modelEntry.file, assetFiles };
}

export default function ModelUploader({ onModelUploaded }: ModelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bundle, setBundle] = useState<ScannedBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const applyEntries = (entries: FileEntry[]) => {
    setError(null);
    const scanned = scanBundle(entries);
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
    const entries: FileEntry[] = [];

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (!entry) continue;
      if (entry.isDirectory) {
        const nested = await readDirEntries(entry as FileSystemDirectoryEntry);
        entries.push(...nested);
      } else if (entry.isFile) {
        const file = await new Promise<File>((res) =>
          (entry as FileSystemFileEntry).file(res)
        );
        entries.push({ file, path: file.name });
      }
    }

    applyEntries(entries);
  };

  // webkitdirectory input — files carry webkitRelativePath like "folder/textures/foo.png"
  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const entries: FileEntry[] = Array.from(e.target.files).map((f) => ({
      file: f,
      path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    }));
    applyEntries(entries);
  };

  // Regular file picker — no folder structure, treat paths as flat
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const entries: FileEntry[] = Array.from(e.target.files).map((f) => ({
      file: f,
      path: f.name,
    }));
    applyEntries(entries);
  };

  const handleUpload = async () => {
    if (!bundle) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("model", bundle.modelFile);
      for (const asset of bundle.assetFiles) {
        formData.append("assets", asset.file);
        formData.append("assetPaths", asset.relativePath); // matches assets[] order
      }

      const res = await fetch("/api/models/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onModelUploaded(bundle.modelFile, data.url);
    } catch {
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
            <p className="text-gray-600 font-medium">Drop a folder or files here</p>
            <p className="text-gray-400 text-sm mt-1">
              Drop a whole folder — the .gltf/.glb and assets are detected automatically
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
        // @ts-expect-error — webkitdirectory not in TS types but widely supported
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
          {bundle.assetFiles.map((a) => {
            const ext = a.file.name.substring(a.file.name.lastIndexOf(".") + 1).toUpperCase();
            return (
              <div key={a.relativePath} className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-xs font-medium shrink-0">
                  {ext}
                </span>
                {/* Show the relative path so users can confirm structure is correct */}
                <span className="text-gray-500 truncate font-mono text-xs">{a.relativePath}</span>
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
