"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ConfigSchema } from "@/lib/configurator-types";

interface DynamicModelProps {
  modelUrl: string;
  configSchema: ConfigSchema;
}

const CANVAS_SIZE = 1024;

export default function DynamicModel({ modelUrl, configSchema }: DynamicModelProps) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const selections = useConfiguratorStore((s) => s.selections);
  const logos = useConfiguratorStore((s) => s.logos);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  // Stores original material.map before we replaced it with a canvas texture
  const originalMapsRef = useRef<Map<THREE.Mesh, THREE.Texture | null>>(new Map());

  // Build mesh map, clone materials, and eagerly store original maps
  useEffect(() => {
    const meshMap = new Map<string, THREE.Mesh>();
    const origMaps = new Map<THREE.Mesh, THREE.Texture | null>();

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
      meshMap.set(mesh.name, mesh);
      // Store original map from the freshly cloned material so color + logo effects can restore it
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && !Array.isArray(mesh.material)) {
        origMaps.set(mesh, mat.map ?? null);
      }
    });

    meshMapRef.current = meshMap;
    originalMapsRef.current = origMaps;
  }, [clonedScene]);

  // Helper: find meshes for a part (exact → partial → all)
  const findMeshes = (meshNames: string[]): THREE.Mesh[] => {
    const map = meshMapRef.current;
    let result: THREE.Mesh[] = [];
    for (const name of meshNames) {
      const m = map.get(name);
      if (m) result.push(m);
    }
    if (result.length === 0) {
      map.forEach((mesh, name) => {
        for (const n of meshNames) {
          if (name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(name.toLowerCase())) {
            result.push(mesh);
          }
        }
      });
    }
    if (result.length === 0) map.forEach((m) => result.push(m));
    return result;
  };

  // Apply color / material / visibility selections
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
              // Clear the base texture so the solid color is visible instead of being
              // multiplied (and effectively hidden) by the original GLTF texture
              material.map = null;
              material.color.set(color.hex);
              material.needsUpdate = true;
            }
          }

          if (option.type === "material" && option.materials) {
            const mat = option.materials.find((m) => m.id === selectedValue);
            if (mat) {
              if (mat.color) material.color.set(mat.color);
              if (mat.metalness !== undefined) material.metalness = mat.metalness;
              if (mat.roughness !== undefined) material.roughness = mat.roughness;
              material.needsUpdate = true;
            }
          }

          if (option.type === "visibility") {
            mesh.visible = selectedValue === "visible";
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, configSchema, clonedScene]);

  // Apply logo / print textures
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

          // Save original map the first time
          if (!originalMapsRef.current.has(mesh)) {
            originalMapsRef.current.set(mesh, material.map);
          }

          if (!placement) {
            // Restore original
            material.map = originalMapsRef.current.get(mesh) ?? null;
            material.needsUpdate = true;
            continue;
          }

          const canvas = document.createElement("canvas");
          canvas.width = CANVAS_SIZE;
          canvas.height = CANVAS_SIZE;
          const ctx = canvas.getContext("2d")!;

          const originalMap = originalMapsRef.current.get(mesh) ?? null;

          const applyLogo = () => {
            // Draw background: existing texture or solid color
            if (originalMap?.image) {
              ctx.drawImage(originalMap.image as CanvasImageSource, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            } else {
              ctx.fillStyle = `#${material.color.getHexString()}`;
              ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            }

            const logoSize = placement.scale * CANVAS_SIZE;
            // y=0 → top of canvas, y=1 → bottom (matches image/canvas convention)
            const cx = placement.x * CANVAS_SIZE;
            const cy = placement.y * CANVAS_SIZE;

            const img = new Image();
            img.onload = () => {
              ctx.save();
              // Translate to center point, apply flips, draw centered
              ctx.translate(cx, cy);
              ctx.scale(placement.flipH ? -1 : 1, placement.flipV ? -1 : 1);
              ctx.drawImage(img, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
              ctx.restore();

              const tex = new THREE.CanvasTexture(canvas);
              // Always match original texture's flipY so UV alignment is consistent
              tex.flipY = originalMap?.flipY ?? false;
              material.map = tex;
              material.needsUpdate = true;
            };
            img.src = placement.dataUrl;
          };

          applyLogo();
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logos, configSchema, clonedScene]);

  return <primitive object={clonedScene} />;
}
