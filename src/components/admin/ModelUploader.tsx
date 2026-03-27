"use client";

import { useState, useRef } from "react";

export interface UploadedTexture {
  name: string;
  url: string;
  previewDataUrl: string;
}

interface ModelUploaderProps {
  onModelUploaded: (file: File, url: string, textures?: UploadedTexture[]) => void;
}

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];
const TEXTURE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function getExt(name: string) {
  return name.substring(name.lastIndexOf(".")).toLowerCase();
}

interface FileEntry {
  file: File;
  path: string;
}

interface AssetEntry {
  file: File;
  relativePath: string;
}

interface ScannedBundle {
  modelFile: File;
  assetFiles: AssetEntry[];
}

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

function scanBundle(entries: FileEntry[]): ScannedBundle | null {
  const modelEntry =
    entries.find((e) => e.file.name.toLowerCase().endsWith(".gltf")) ??
    entries.find((e) => MODEL_EXTENSIONS.includes(getExt(e.file.name)));

  if (!modelEntry) return null;

  const lastSlash = modelEntry.path.lastIndexOf("/");
  const modelBaseDir = lastSlash >= 0 ? modelEntry.path.substring(0, lastSlash + 1) : "";

  const assetFiles: AssetEntry[] = entries
    .filter((e) => e !== modelEntry && ASSET_EXTENSIONS.includes(getExt(e.file.name)))
    .map((e) => ({
      file: e.file,
      relativePath: e.path.startsWith(modelBaseDir)
        ? e.path.substring(modelBaseDir.length)
        : e.file.name,
    }));

  return { modelFile: modelEntry.file, assetFiles };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ModelUploader({ onModelUploaded }: ModelUploaderProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isTextureDragging, setIsTextureDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bundle, setBundle] = useState<ScannedBundle | null>(null);
  const [pendingTextures, setPendingTextures] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);

  const applyEntries = (entries: FileEntry[]) => {
    setError(null);
    const scanned = scanBundle(entries);
    if (!scanned) {
      setError("No 3D model file found. Make sure your folder or selection includes a .glb or .gltf file.");
      return;
    }
    setBundle(scanned);
    setStep(2);
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

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const entries: FileEntry[] = Array.from(e.target.files).map((f) => ({
      file: f,
      path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    }));
    applyEntries(entries);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const entries: FileEntry[] = Array.from(e.target.files).map((f) => ({
      file: f,
      path: f.name,
    }));
    applyEntries(entries);
  };

  const handleTextureFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => TEXTURE_EXTENSIONS.includes(getExt(f.name)));
    if (imageFiles.length === 0) return;

    let loaded = 0;
    const newTextures: Array<{ file: File; previewUrl: string }> = new Array(imageFiles.length);

    imageFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newTextures[idx] = { file, previewUrl: ev.target?.result as string };
        loaded++;
        if (loaded === imageFiles.length) {
          setPendingTextures((prev) => [...prev, ...newTextures]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTextureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsTextureDragging(false);
    handleTextureFiles(Array.from(e.dataTransfer.files));
  };

  const handleTextureInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    handleTextureFiles(Array.from(e.target.files));
  };

  const removeTexture = (index: number) => {
    setPendingTextures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!bundle) return;
    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("model", bundle.modelFile);

      for (const asset of bundle.assetFiles) {
        formData.append("assets", asset.file);
        formData.append("assetPaths", asset.relativePath);
      }

      const isGlb = !bundle.modelFile.name.toLowerCase().endsWith(".gltf");
      if (isGlb) {
        for (const tex of pendingTextures) {
          formData.append("textures", tex.file);
          formData.append("texturePaths", `textures/${tex.file.name}`);
        }
      }

      setUploadProgress(40);
      const res = await fetch("/api/models/upload", { method: "POST", body: formData });
      setUploadProgress(80);

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setUploadProgress(100);

      const uploadedTextures: UploadedTexture[] = (data.textureUrls ?? []).map(
        (t: { name: string; url: string }, i: number) => ({
          name: t.name,
          url: t.url,
          previewDataUrl: pendingTextures[i]?.previewUrl ?? t.url,
        })
      );

      setStep(3);
      setTimeout(() => onModelUploaded(bundle.modelFile, data.url, uploadedTextures), 500);
    } catch {
      const url = URL.createObjectURL(bundle.modelFile);
      setStep(3);
      setTimeout(() => onModelUploaded(bundle.modelFile, url, []), 500);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setBundle(null);
    setPendingTextures([]);
    setError(null);
    setUploadProgress(0);
    setStep(1);
  };

  const isGltf = bundle?.modelFile.name.toLowerCase().endsWith(".gltf") ?? false;
  const isGlb = bundle ? !isGltf : false;

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > s
                  ? "bg-green-500 text-white"
                  : step === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${step === s ? "text-gray-800" : "text-gray-400"}`}>
              {s === 1 ? "Choose file" : s === 2 ? "Add textures" : "Done"}
            </span>
            {i < 2 && <div className={`h-px w-6 ${step > s ? "bg-green-400" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Choose model ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50 scale-[1.01]"
                : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-5xl mb-3">📦</div>
            <p className="font-semibold text-gray-800 text-base">Drop your 3D product file here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse your computer</p>
            <div className="mt-4 inline-flex items-center gap-3 text-xs text-gray-400">
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">.GLB</span>
              <span className="text-gray-300">or</span>
              <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md font-medium">.GLTF folder</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 text-sm">
            <span className="text-lg leading-none mt-0.5">💡</span>
            <div>
              <p className="font-medium text-amber-800">Not sure which format you have?</p>
              <p className="text-amber-700 mt-0.5">
                If your designer gave you a <strong>single file</strong>, it&apos;s a <strong>.GLB</strong> — just drop it here.
                If they gave you a <strong>folder with multiple files</strong>, use &quot;Browse folder&quot; below.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => folderInputRef.current?.click()}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <span>📁</span> Browse folder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <span>🗂️</span> Browse files
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Review + textures ── */}
      {step === 2 && bundle && (
        <div className="space-y-4">
          {/* Model card */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="text-2xl">✅</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800">{bundle.modelFile.name}</p>
              <p className="text-sm text-green-700 mt-0.5">
                {isGltf ? "GLTF bundle" : "GLB model"} · {formatBytes(bundle.modelFile.size)}
                {bundle.assetFiles.length > 0 &&
                  ` · ${bundle.assetFiles.length} linked file${bundle.assetFiles.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-white border border-gray-200"
            >
              Change
            </button>
          </div>

          {/* Asset list for GLTF */}
          {isGltf && bundle.assetFiles.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
              <p className="font-medium text-gray-600 mb-1.5">Linked files detected</p>
              {bundle.assetFiles.map((a) => (
                <div key={a.relativePath} className="flex items-center gap-2 text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                  <span className="font-mono truncate">{a.relativePath}</span>
                </div>
              ))}
            </div>
          )}

          {/* Texture swatches — GLB only */}
          {isGlb && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Add texture options</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload fabric, pattern or material images your customers can pick from
                  </p>
                </div>
                <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                  Optional
                </span>
              </div>

              <div className="p-4 space-y-3">
                {pendingTextures.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {pendingTextures.map((t, i) => (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.previewUrl}
                          alt={t.file.name}
                          className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removeTexture(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center font-bold leading-none"
                        >
                          ×
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate text-center">
                          {t.file.name.replace(/\.[^.]+$/, "")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    isTextureDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsTextureDragging(true); }}
                  onDragLeave={() => setIsTextureDragging(false)}
                  onDrop={handleTextureDrop}
                  onClick={() => textureInputRef.current?.click()}
                >
                  <p className="text-sm text-gray-500">
                    {pendingTextures.length > 0 ? "Drop more images to add" : "Drop texture images here"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP</p>
                </div>

                {pendingTextures.length > 0 && (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2.5">
                    ✓ {pendingTextures.length} texture{pendingTextures.length > 1 ? "s" : ""} will be uploaded. After saving you can add them as &ldquo;Texture&rdquo; options in the schema editor.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
              <span>⚠️</span> <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading… {uploadProgress}%
              </>
            ) : (
              <>
                ☁️ Upload{isGltf ? " GLTF bundle" : " GLB model"}
                {isGlb && pendingTextures.length > 0
                  ? ` + ${pendingTextures.length} texture${pendingTextures.length > 1 ? "s" : ""}`
                  : ""}
              </>
            )}
          </button>

          {uploading && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <div className="text-center py-6 space-y-3">
          <div className="text-5xl">🎉</div>
          <p className="font-semibold text-gray-800">Uploaded successfully!</p>
          <p className="text-sm text-gray-500">
            Scroll down to analyze the model and set up customization options.
          </p>
          <button onClick={reset} className="text-sm text-blue-600 hover:underline mt-1">
            Upload a different model
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={folderInputRef} type="file"
        // @ts-expect-error — webkitdirectory not in TS types
        webkitdirectory="" multiple className="hidden" onChange={handleFolderInput} />
      <input ref={fileInputRef} type="file"
        accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2,.basis"
        multiple className="hidden" onChange={handleFileInput} />
      <input ref={textureInputRef} type="file"
        accept=".png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={handleTextureInput} />
    </div>
  );
}
