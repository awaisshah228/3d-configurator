"use client";

import { useEffect, useState } from "react";

interface MeshInfo {
  name: string;
  vertexCount: number;
  faceCount: number;
  materialName: string;
  hasTexture: boolean;
  baseColor: number[] | null;
}

interface AnalysisSummary {
  totalVertices: number;
  totalFaces: number;
  meshCount: number;
  materialCount: number;
  hasTextures: boolean;
}

interface MeshAnalyzerProps {
  modelUrl: string | null;
  selectedMesh: string | null;
  onMeshesFound: (meshNames: string[], materialNames: string[]) => void;
  onMeshSelect: (name: string) => void;
}

function ColorSwatch({ rgb }: { rgb: number[] }) {
  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
      style={{ backgroundColor: `rgb(${r},${g},${b})` }}
      title={`rgb(${r}, ${g}, ${b})`}
    />
  );
}

export default function MeshAnalyzer({ modelUrl, selectedMesh, onMeshesFound, onMeshSelect }: MeshAnalyzerProps) {
  const [meshes, setMeshes] = useState<MeshInfo[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modelUrl) { setMeshes([]); setSummary(null); return; }

    setLoading(true);

    fetch("/api/models/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelUrl }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.meshes) {
          const foundMeshes: MeshInfo[] = data.meshes.map((m: {
            name: string;
            vertexCount: number;
            faceCount: number;
            material: { name: string; baseColor: number[]; hasTexture: boolean } | null;
          }) => ({
            name: m.name,
            vertexCount: m.vertexCount,
            faceCount: m.faceCount,
            materialName: m.material?.name || "No material",
            hasTexture: m.material?.hasTexture ?? false,
            baseColor: m.material?.baseColor ?? null,
          }));
          const meshNames = data.meshes.map((m: { name: string }) => m.name);
          const materialNames = data.materials?.map((m: { name: string }) => m.name) || [];
          const hasTextures = data.materials?.some((m: { hasTexture: boolean }) => m.hasTexture) ?? false;

          setMeshes(foundMeshes);
          setSummary({
            totalVertices: data.totalVertices,
            totalFaces: data.totalFaces,
            meshCount: data.meshCount,
            materialCount: data.materialCount,
            hasTextures,
          });
          onMeshesFound(meshNames, materialNames);
        }
        setLoading(false);
      })
      .catch(() => {
        import("three").then(() => {
          import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
            const loader = new GLTFLoader();
            loader.load(
              modelUrl,
              (gltf) => {
                const foundMeshes: MeshInfo[] = [];
                const meshNames: string[] = [];
                const materialNames: string[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                gltf.scene.traverse((child: any) => {
                  if (child.isMesh) {
                    const matName = child.material?.name || "No material";
                    foundMeshes.push({
                      name: child.name || `mesh_${foundMeshes.length}`,
                      vertexCount: child.geometry?.attributes?.position?.count ?? 0,
                      faceCount: child.geometry?.index
                        ? Math.floor(child.geometry.index.count / 3)
                        : Math.floor((child.geometry?.attributes?.position?.count ?? 0) / 3),
                      materialName: matName,
                      hasTexture: !!child.material?.map,
                      baseColor: null,
                    });
                    meshNames.push(child.name || `mesh_${meshNames.length}`);
                    if (!materialNames.includes(matName)) materialNames.push(matName);
                  }
                });
                setMeshes(foundMeshes);
                setSummary({
                  totalVertices: foundMeshes.reduce((s, m) => s + m.vertexCount, 0),
                  totalFaces: foundMeshes.reduce((s, m) => s + m.faceCount, 0),
                  meshCount: foundMeshes.length,
                  materialCount: materialNames.length,
                  hasTextures: foundMeshes.some((m) => m.hasTexture),
                });
                onMeshesFound(meshNames, materialNames);
                setLoading(false);
              },
              undefined,
              () => setLoading(false)
            );
          });
        });
      });
  }, [modelUrl, onMeshesFound]);

  if (!modelUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-sm">Upload a model to see its structure</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full mb-3" />
        <p className="text-sm text-gray-500">Scanning model…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Meshes", value: summary.meshCount, icon: "🧊" },
            { label: "Materials", value: summary.materialCount, icon: "🎨" },
            { label: "Vertices", value: summary.totalVertices.toLocaleString(), icon: "📐" },
            { label: "Textures", value: summary.hasTextures ? "Yes" : "No", icon: "🖼️" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
              <div className="text-lg">{icon}</div>
              <div className="font-bold text-gray-800 text-sm">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Click a mesh to highlight it in the preview
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {meshes.map((mesh, i) => {
            const isSelected = selectedMesh === mesh.name;
            return (
              <button
                key={i}
                onClick={() => onMeshSelect(mesh.name)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-semibold text-sm truncate ${isSelected ? "text-white" : "text-gray-800"}`}>
                      {mesh.name}
                    </span>
                    {mesh.hasTexture && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                        isSelected ? "bg-blue-500 text-blue-100" : "bg-amber-100 text-amber-700"
                      }`}>
                        textured
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 mt-0.5 ${isSelected ? "text-blue-200" : "text-gray-400"}`}>
                    {mesh.baseColor && !isSelected && <ColorSwatch rgb={mesh.baseColor} />}
                    <span className="text-xs truncate">
                      {mesh.materialName} · {mesh.vertexCount.toLocaleString()} verts
                    </span>
                  </div>
                </div>
                {isSelected && <span className="text-blue-200 text-xs shrink-0">selected ✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
