"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema, Selections, MaterialPreset } from "@/lib/configurator-types";

interface DynamicModelProps {
  modelUrl: string;
  configSchema: ConfigSchema;
  /** If provided, overrides the global store selections (e.g. admin previews). */
  selections?: Selections;
}

// ── Texture cache with max size eviction ──
const MAX_CACHE_SIZE = 100;
const textureCache = new Map<string, THREE.Texture>();

function loadTexture(url: string, flipY?: boolean): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        if (flipY !== undefined) tex.flipY = flipY;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        // Evict oldest entries if cache is too large
        if (textureCache.size >= MAX_CACHE_SIZE) {
          const firstKey = textureCache.keys().next().value;
          if (firstKey) {
            const evicted = textureCache.get(firstKey);
            evicted?.dispose();
            textureCache.delete(firstKey);
          }
        }
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn(`[DynamicModel] Failed to load texture: ${url}`, err);
        reject(err);
      }
    );
  });
}

// ── Apply full PBR material properties ──
function applyMaterialPreset(material: THREE.MeshStandardMaterial, mat: MaterialPreset) {
  if (mat.color) material.color.set(mat.color);
  if (mat.metalness !== undefined) material.metalness = mat.metalness;
  if (mat.roughness !== undefined) material.roughness = mat.roughness;

  if (mat.emissive) material.emissive.set(mat.emissive);
  if (mat.emissiveIntensity !== undefined) material.emissiveIntensity = mat.emissiveIntensity;

  // Extended PBR props only available on MeshPhysicalMaterial
  const phys = material as THREE.MeshPhysicalMaterial;
  if (phys.isMeshPhysicalMaterial) {
    if (mat.clearcoat !== undefined) phys.clearcoat = mat.clearcoat;
    if (mat.clearcoatRoughness !== undefined) phys.clearcoatRoughness = mat.clearcoatRoughness;
    if (mat.sheen !== undefined) phys.sheen = mat.sheen;
    if (mat.sheenColor) phys.sheenColor.set(mat.sheenColor);
    if (mat.sheenRoughness !== undefined) phys.sheenRoughness = mat.sheenRoughness;
  }

  // Load PBR texture maps if specified
  if (mat.normalMapUrl) {
    loadTexture(mat.normalMapUrl).then((tex) => {
      material.normalMap = tex;
      material.needsUpdate = true;
    }).catch(() => {});
  }
  if (mat.roughnessMapUrl) {
    loadTexture(mat.roughnessMapUrl).then((tex) => {
      material.roughnessMap = tex;
      material.needsUpdate = true;
    }).catch(() => {});
  }
  if (mat.aoMapUrl) {
    loadTexture(mat.aoMapUrl).then((tex) => {
      material.aoMap = tex;
      material.aoMapIntensity = 1.0;
      material.needsUpdate = true;
    }).catch(() => {});
  }

  material.needsUpdate = true;
}

// ── Logo canvas texture cache ──
const logoCanvasCache = new Map<string, { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture }>();

const CANVAS_SIZE = 1024;

export default function DynamicModel({ modelUrl, configSchema, selections: selectionsProp }: DynamicModelProps) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const storeSelections = useConfiguratorStore((s) => s.selections);
  const selections = selectionsProp ?? storeSelections;
  const logos = useConfiguratorStore((s) => s.logos);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const originalMapsRef = useRef<Map<THREE.Mesh, THREE.Texture | null>>(new Map());
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());

  // Initialize: clone materials, build mesh map
  useEffect(() => {
    const meshMap = new Map<string, THREE.Mesh>();
    const origMaps = new Map<THREE.Mesh, THREE.Texture | null>();
    const origMaterials = new Map<THREE.Mesh, THREE.Material>();

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }

      meshMap.set(mesh.name, mesh);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && !Array.isArray(mesh.material)) {
        origMaps.set(mesh, mat.map ?? null);
        origMaterials.set(mesh, mat.clone());
      }
    });

    meshMapRef.current = meshMap;
    originalMapsRef.current = origMaps;
    originalMaterialsRef.current = origMaterials;
  }, [clonedScene]);

  const findMeshes = useCallback((meshNames: string[]): THREE.Mesh[] => {
    const map = meshMapRef.current;
    const result: THREE.Mesh[] = [];

    // 1. Exact match
    for (const name of meshNames) {
      const m = map.get(name);
      if (m) result.push(m);
    }
    if (result.length > 0) return result;

    // 2. Case-insensitive partial match
    map.forEach((mesh, name) => {
      for (const n of meshNames) {
        if (name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(name.toLowerCase())) {
          result.push(mesh);
        }
      }
    });
    if (result.length > 0) return result;

    // 3. Fallback: apply to all meshes (handles misconfigured mesh names)
    map.forEach((m) => result.push(m));
    return result;
  }, []);

  // ── Apply color/material/visibility/texture selections ──
  useEffect(() => {
    const meshMap = meshMapRef.current;
    if (meshMap.size === 0) return;

    for (const part of configSchema.parts) {
      const partSelections = selections[part.id];
      const meshes = findMeshes(part.meshNames);

      for (const mesh of meshes) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (!material) continue;

        for (const option of part.options) {
          const selectedValue = partSelections?.[option.id] ?? option.defaultValue;
          if (!selectedValue) continue;

          if (option.type === "color" && option.colors) {
            const color = option.colors.find((c) => c.id === selectedValue);
            if (color) {
              if (color.textureUrl) {
                const origFlipY = originalMapsRef.current.get(mesh)?.flipY ?? false;
                loadTexture(color.textureUrl, origFlipY).then((tex) => {
                  material.map = tex;
                  material.color.set("#ffffff");
                  material.needsUpdate = true;
                }).catch(() => {});
              } else {
                material.map = null;
                material.color.set(color.hex);
                material.needsUpdate = true;
              }
            }
          }

          if (option.type === "material" && option.materials) {
            const mat = option.materials.find((m) => m.id === selectedValue);
            if (mat) {
              applyMaterialPreset(material, mat);
            }
          }

          if (option.type === "visibility") {
            mesh.visible = selectedValue === "visible";
          }

          if (option.type === "texture" && option.textures) {
            const tex = option.textures.find((t) => t.id === selectedValue);
            if (tex) {
              const origFlipY = originalMapsRef.current.get(mesh)?.flipY ?? false;
              loadTexture(tex.url, origFlipY).then((loadedTex) => {
                material.map = loadedTex;
                material.color.set("#ffffff");
                material.needsUpdate = true;
              }).catch(() => {});
            } else if (selectedValue === "__original__") {
              material.map = originalMapsRef.current.get(mesh) ?? null;
              material.color.set("#ffffff");
              material.needsUpdate = true;
            }
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, configSchema, clonedScene, findMeshes]);

  // ── Apply logo placements (cached canvas textures) ──
  useEffect(() => {
    const meshMap = meshMapRef.current;
    if (meshMap.size === 0) return;

    for (const part of configSchema.parts) {
      for (const option of part.options) {
        if (option.type !== "logo") continue;

        const key = `${part.id}.${option.id}`;
        const placement = logos[key];
        const meshes = findMeshes(part.meshNames);

        for (const mesh of meshes) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (!material) continue;

          if (!originalMapsRef.current.has(mesh)) {
            originalMapsRef.current.set(mesh, material.map);
          }

          if (!placement) {
            // Remove logo — restore original
            material.map = originalMapsRef.current.get(mesh) ?? null;
            material.needsUpdate = true;
            // Clean up cached canvas for this mesh
            const cacheKey = `${key}-${mesh.uuid}`;
            const cached = logoCanvasCache.get(cacheKey);
            if (cached) {
              cached.tex.dispose();
              logoCanvasCache.delete(cacheKey);
            }
            continue;
          }

          // Build a cache key from placement params
          const cacheKey = `${key}-${mesh.uuid}`;
          const placementHash = `${placement.dataUrl.slice(-20)}-${placement.x}-${placement.y}-${placement.scale}-${placement.flipH}-${placement.flipV}`;

          // Reuse or create canvas
          let entry = logoCanvasCache.get(cacheKey);
          if (!entry) {
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
            const tex = new THREE.CanvasTexture(canvas);
            entry = { canvas, tex };
            logoCanvasCache.set(cacheKey, entry);
          }

          const { canvas, tex } = entry;
          // Skip if hash hasn't changed (tagged on tex.userData)
          if (tex.userData.placementHash === placementHash) continue;
          tex.userData.placementHash = placementHash;

          const ctx = canvas.getContext("2d")!;
          const originalMap = originalMapsRef.current.get(mesh) ?? null;

          // Draw base
          if (originalMap?.image) {
            ctx.drawImage(originalMap.image as CanvasImageSource, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
          } else {
            ctx.fillStyle = `#${material.color.getHexString()}`;
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          }

          // Draw logo
          const logoSize = placement.scale * CANVAS_SIZE;
          const cx = placement.x * CANVAS_SIZE;
          const cy = placement.y * CANVAS_SIZE;

          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(placement.flipH ? -1 : 1, placement.flipV ? -1 : 1);
            ctx.drawImage(img, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            ctx.restore();

            tex.flipY = originalMap?.flipY ?? false;
            tex.needsUpdate = true;
            material.map = tex;
            material.needsUpdate = true;
          };
          img.src = placement.dataUrl;
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logos, configSchema, clonedScene, findMeshes]);

  // ── Cleanup on unmount: dispose cloned materials, geometries, textures ──
  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        // Dispose geometry
        if (mesh.geometry) mesh.geometry.dispose();
        // Dispose materials
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          if (!mat) continue;
          const stdMat = mat as THREE.MeshStandardMaterial;
          stdMat.map?.dispose();
          stdMat.normalMap?.dispose();
          stdMat.roughnessMap?.dispose();
          stdMat.metalnessMap?.dispose();
          stdMat.aoMap?.dispose();
          stdMat.dispose();
        }
      });

      // Dispose logo canvas textures
      logoCanvasCache.forEach((entry) => entry.tex.dispose());
      logoCanvasCache.clear();
    };
  }, [clonedScene]);

  return <primitive object={clonedScene} />;
}
