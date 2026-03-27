"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Center, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ViewerSettings } from "@/lib/configurator-types";
import { DEFAULT_VIEWER_SETTINGS } from "@/lib/configurator-types";

const TEST_COLORS = [
  { id: "white", hex: "#ffffff" },
  { id: "black", hex: "#1a1a1a" },
  { id: "red", hex: "#e53e3e" },
  { id: "blue", hex: "#3182ce" },
  { id: "green", hex: "#38a169" },
  { id: "yellow", hex: "#ecc94b" },
  { id: "pink", hex: "#ed64a6" },
  { id: "orange", hex: "#dd6b20" },
  { id: "cyan", hex: "#00bcd4" },
  { id: "purple", hex: "#805ad5" },
];

const TEST_MATERIALS = [
  { id: "matte", label: "Matte", roughness: 0.9, metalness: 0 },
  { id: "glossy", label: "Glossy", roughness: 0.1, metalness: 0.1 },
  { id: "metallic", label: "Metallic", roughness: 0.3, metalness: 0.8 },
  { id: "rubber", label: "Rubber", roughness: 0.95, metalness: 0 },
  { id: "silk", label: "Silk", roughness: 0.2, metalness: 0.05 },
];

type TestOverride = { color?: string; roughness?: number; metalness?: number };

interface InteractiveModelProps {
  modelUrl: string;
  selectedMesh: string | null;
  testOverrides: Record<string, TestOverride>;
  onMeshSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
}

function InteractiveModel({
  modelUrl,
  selectedMesh,
  testOverrides,
  onMeshSelect,
  onHover,
}: InteractiveModelProps) {
  const { scene } = useGLTF(modelUrl);
  const hoveredRef = useRef<THREE.Mesh | null>(null);

  const { clonedScene, meshMap } = useMemo(() => {
    const cloned = scene.clone(true);
    const map = new Map<string, THREE.Mesh>();
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
      map.set(mesh.name, mesh);
    });
    return { clonedScene: cloned, meshMap: map };
  }, [scene]);

  // Apply selected (blue) highlight
  useEffect(() => {
    meshMap.forEach((mesh, name) => {
      if (hoveredRef.current === mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.emissive) return;
      if (name === selectedMesh) {
        mat.emissive.set(0, 0.08, 0.35);
      } else {
        mat.emissive.set(0, 0, 0);
      }
    });
  }, [selectedMesh, meshMap]);

  // Apply test color/material overrides
  useEffect(() => {
    Object.entries(testOverrides).forEach(([meshName, override]) => {
      const mesh = meshMap.get(meshName);
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      if (override.color !== undefined) mat.color.set(override.color);
      if (override.roughness !== undefined) mat.roughness = override.roughness;
      if (override.metalness !== undefined) mat.metalness = override.metalness;
      mat.needsUpdate = true;
    });
  }, [testOverrides, meshMap]);

  const setHover = (mesh: THREE.Mesh | null) => {
    // Clear previous hover emissive
    if (hoveredRef.current && hoveredRef.current !== mesh) {
      const prev = hoveredRef.current.material as THREE.MeshStandardMaterial;
      if (prev?.emissive) {
        if (hoveredRef.current.name === selectedMesh) {
          prev.emissive.set(0, 0.08, 0.35);
        } else {
          prev.emissive.set(0, 0, 0);
        }
      }
    }
    hoveredRef.current = mesh;
    if (mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat?.emissive) mat.emissive.set(0.2, 0.18, 0.04);
    }
  };

  return (
    <primitive
      object={clonedScene}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const mesh = e.object as THREE.Mesh;
        if (!mesh.isMesh || hoveredRef.current === mesh) return;
        setHover(mesh);
        onHover(mesh.name);
      }}
      onPointerOut={() => {
        setHover(null);
        onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const mesh = e.object as THREE.Mesh;
        if (!mesh.isMesh) return;
        onMeshSelect(mesh.name === selectedMesh ? null : mesh.name);
      }}
    />
  );
}

function CameraRig({ modelUrl, zoom = 1, angle = 0.15 }: { modelUrl: string; zoom?: number; angle?: number }) {
  const { scene: modelScene } = useGLTF(modelUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);
  const fitted = useRef(false);

  const cameraFitted = useRef(false);
  const orbitFitted = useRef(false);
  const radiusRef = useRef(1);

  useFrame(({ camera }) => {
    if (!cameraFitted.current) {
      const box = new THREE.Box3().setFromObject(modelScene);
      if (box.isEmpty()) return;
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      radiusRef.current = sphere.radius;
      const r = radiusRef.current;
      camera.position.set(0, r * angle, r * 2.5 * zoom);
      camera.lookAt(0, 0, 0);
      cameraFitted.current = true;
    }
    if (!orbitFitted.current && orbitRef.current) {
      const r = radiusRef.current;
      orbitRef.current.target.set(0, 0, 0);
      orbitRef.current.minDistance = r * 1.5;
      orbitRef.current.maxDistance = r * 15;
      orbitRef.current.update();
      orbitFitted.current = true;
    }
  });

  return <OrbitControls ref={orbitRef} enablePan={false} />;
}

interface AdminModelViewerProps {
  modelUrl: string;
  selectedMesh: string | null;
  onMeshSelect: (name: string | null) => void;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

export default function AdminModelViewer({
  modelUrl,
  selectedMesh,
  onMeshSelect,
  cameraZoom = 1,
  viewerSettings = DEFAULT_VIEWER_SETTINGS,
}: AdminModelViewerProps) {
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [testOverrides, setTestOverrides] = useState<Record<string, TestOverride>>({});

  const applyColor = (hex: string) => {
    if (!selectedMesh) return;
    setTestOverrides((prev) => ({
      ...prev,
      [selectedMesh]: { ...prev[selectedMesh], color: hex },
    }));
  };

  const applyMaterial = (roughness: number, metalness: number) => {
    if (!selectedMesh) return;
    setTestOverrides((prev) => ({
      ...prev,
      [selectedMesh]: { ...prev[selectedMesh], roughness, metalness },
    }));
  };

  const resetMesh = () => {
    if (!selectedMesh) return;
    setTestOverrides((prev) => {
      const next = { ...prev };
      delete next[selectedMesh];
      return next;
    });
  };

  const currentOverride = selectedMesh ? testOverrides[selectedMesh] : undefined;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 0, 1000], fov: 45, near: 0.01, far: 100000 }}
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          style={{ cursor: hoveredMesh ? "pointer" : "default" }}
        >
          <color attach="background" args={[viewerSettings.bgColor]} />
          <ambientLight intensity={viewerSettings.ambientIntensity} />
          <directionalLight position={[3, 5, 4]} intensity={viewerSettings.keyLightIntensity} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-4, 2, 2]} intensity={viewerSettings.keyLightIntensity * 0.4} />
          <directionalLight position={[0, 3, -5]} intensity={viewerSettings.keyLightIntensity * 0.25} />
          <Suspense fallback={null}>
            <Center>
              <InteractiveModel
                modelUrl={modelUrl}
                selectedMesh={selectedMesh}
                testOverrides={testOverrides}
                onMeshSelect={onMeshSelect}
                onHover={setHoveredMesh}
              />
            </Center>
            {viewerSettings.shadowEnabled && (
              <ContactShadows position={[0, -0.01, 0]} opacity={viewerSettings.shadowOpacity} scale={10} blur={3} far={10} />
            )}
            <Environment preset={viewerSettings.envPreset as Parameters<typeof Environment>[0]["preset"]} />
            <CameraRig modelUrl={modelUrl} zoom={cameraZoom} angle={viewerSettings.cameraAngle} />
          </Suspense>
        </Canvas>

        {/* Hover / selected label */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          {hoveredMesh ? (
            <div className="bg-yellow-400 text-gray-900 text-sm px-3 py-1 rounded-full font-mono font-semibold shadow">
              {hoveredMesh}
            </div>
          ) : selectedMesh ? (
            <div className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-mono font-semibold shadow">
              {selectedMesh} selected
            </div>
          ) : (
            <div className="bg-black/40 text-white/70 text-xs px-3 py-1 rounded-full">
              Hover &amp; click a mesh to select it
            </div>
          )}
        </div>
      </div>

      {/* Test customization panel — only visible when a mesh is selected */}
      {selectedMesh && (
        <div className="border-t border-gray-200 bg-white p-3 rounded-b-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Test on <span className="font-mono text-blue-600">{selectedMesh}</span>
            </span>
            {currentOverride && (
              <button
                onClick={resetMesh}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Reset
              </button>
            )}
          </div>

          {/* Color swatches */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {TEST_COLORS.map((c) => (
                <button
                  key={c.id}
                  title={c.id}
                  onClick={() => applyColor(c.hex)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c.hex,
                    borderColor:
                      currentOverride?.color === c.hex ? "#3182ce" : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Material presets */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Material</p>
            <div className="flex flex-wrap gap-1.5">
              {TEST_MATERIALS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => applyMaterial(m.roughness, m.metalness)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    currentOverride?.roughness === m.roughness &&
                    currentOverride?.metalness === m.metalness
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
