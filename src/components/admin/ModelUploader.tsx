"use client";

import { useState, useRef } from "react";

interface ModelUploaderProps {
  onModelUploaded: (file: File, url: string) => void;
}

export default function ModelUploader({ onModelUploaded }: ModelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const validExtensions = [".glb", ".gltf"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert("Please upload a .glb or .gltf file");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("model", file);

      const res = await fetch("/api/models/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onModelUploaded(file, data.url);
    } catch {
      // Fallback: create a local object URL for the model
      const url = URL.createObjectURL(file);
      onModelUploaded(file, url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <div>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600">Processing {fileName}...</p>
        </div>
      ) : fileName ? (
        <div>
          <div className="text-3xl mb-2">&#10003;</div>
          <p className="text-green-600 font-medium">{fileName}</p>
          <p className="text-gray-400 text-sm mt-1">Click or drop to replace</p>
        </div>
      ) : (
        <div>
          <div className="text-4xl mb-3 text-gray-400">&#9651;</div>
          <p className="text-gray-600 font-medium">
            Drop a 3D model here or click to browse
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Supports .glb and .gltf files
          </p>
        </div>
      )}
    </div>
  );
}
