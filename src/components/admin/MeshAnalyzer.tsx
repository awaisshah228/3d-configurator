"use client";

import { useEffect, useState } from "react";

interface MeshInfo {
  name: string;
  type: string;
  materialName?: string;
}

interface MeshAnalyzerProps {
  modelUrl: string | null;
  selectedMesh: string | null;
  onMeshesFound: (meshNames: string[], materialNames: string[]) => void;
  onMeshSelect: (name: string) => void;
}

export default function MeshAnalyzer({ modelUrl, selectedMesh, onMeshesFound, onMeshSelect }: MeshAnalyzerProps) {
  const [meshes, setMeshes] = useState<MeshInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modelUrl) return;

    setLoading(true);

    // Analyze the model client-side using the API or Three.js
    fetch("/api/models/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelUrl }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.meshes) {
          const foundMeshes: MeshInfo[] = data.meshes.map((m: { name: string; vertexCount: number; material: { name: string } | null }) => ({
            name: m.name,
            type: `${m.vertexCount} vertices`,
            materialName: m.material?.name || "Unnamed Material",
          }));
          const meshNames = data.meshes.map((m: { name: string }) => m.name);
          const materialNames = data.materials?.map((m: { name: string }) => m.name) || [];
          setMeshes(foundMeshes);
          onMeshesFound(meshNames, materialNames);
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback: try loading with Three.js client-side
        import("three").then((THREE) => {
          import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
            const loader = new GLTFLoader();
            loader.load(
              modelUrl,
              (gltf) => {
                const foundMeshes: MeshInfo[] = [];
                const meshNames: string[] = [];
                const materialNames: string[] = [];
                gltf.scene.traverse((child: any) => {
                  const mesh = child;
                  if (mesh.isMesh) {
                    const matName = mesh.material?.name || "Unnamed Material";
                    foundMeshes.push({
                      name: mesh.name || `mesh_${foundMeshes.length}`,
                      type: mesh.geometry?.type || "BufferGeometry",
                      materialName: matName,
                    });
                    meshNames.push(mesh.name || `mesh_${meshNames.length}`);
                    if (!materialNames.includes(matName)) materialNames.push(matName);
                  }
                });
                setMeshes(foundMeshes);
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
      <div className="text-gray-400 text-center py-8">
        Upload a model to see its mesh structure
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-gray-500">Analyzing model...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-3">
        Found {meshes.length} meshes
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {meshes.map((mesh, i) => {
          const isSelected = selectedMesh === mesh.name;
          return (
            <button
              key={i}
              onClick={() => onMeshSelect(mesh.name)}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700"
              }`}
            >
              <div>
                <span className={`font-mono font-medium ${isSelected ? "text-white" : "text-blue-600"}`}>
                  {mesh.name}
                </span>
                <span className={`ml-2 text-xs ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                  ({mesh.type})
                </span>
              </div>
              <span className={`text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                {mesh.materialName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
