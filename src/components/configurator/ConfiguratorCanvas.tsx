"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Center, useGLTF } from "@react-three/drei";
import { EffectComposer, N8AO, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import DynamicModel from "./DynamicModel";
import type { ConfigSchema, ViewerSettings, Selections } from "@/lib/configurator-types";

export type ViewPreset = "default" | "front" | "back" | "left" | "right" | "top";

interface ConfiguratorCanvasProps {
  modelUrl: string;
  configSchema: ConfigSchema;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
  viewPreset?: ViewPreset;
  autoRotate?: boolean;
  selections?: Selections;
  /** Disable postprocessing for lightweight previews (admin cards, etc.) */
  disablePostProcessing?: boolean;
}

function Loader() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.5;
  });
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color="#d1d5db" wireframe />
    </mesh>
  );
}

function CameraRig({
  modelUrl,
  zoom = 1,
  angle = 0.15,
  viewPreset = "default",
  autoRotate = false,
}: {
  modelUrl: string;
  zoom?: number;
  angle?: number;
  viewPreset?: ViewPreset;
  autoRotate?: boolean;
}) {
  const { scene: modelScene } = useGLTF(modelUrl);
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);
  const cameraFitted = useRef(false);
  const orbitFitted = useRef(false);
  const radiusRef = useRef(1);
  const prevPreset = useRef<ViewPreset>("default");
  const prevZoom = useRef(zoom);
  const targetCamRef = useRef<THREE.Vector3 | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  const handleInteractionStart = useCallback(() => {
    if (!autoRotate) return;
    setIsAutoRotating(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    // Resume auto-rotate 4 seconds after user stops interacting
    resumeTimerRef.current = setTimeout(() => setIsAutoRotating(true), 4000);
  }, [autoRotate]);

  useFrame(() => {
    // Step 1: fit camera to model on first load
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

    // Step 2: configure OrbitControls once it mounts
    if (!orbitFitted.current && orbitRef.current) {
      const r = radiusRef.current;
      orbitRef.current.target.set(0, 0, 0);
      orbitRef.current.minDistance = r * 1.2;
      orbitRef.current.maxDistance = r * 15;
      orbitRef.current.update();
      orbitFitted.current = true;
    }

    // Step 3: smooth lerp camera to view preset target
    if (targetCamRef.current) {
      camera.position.lerp(targetCamRef.current, 0.07);
      camera.lookAt(0, 0, 0);
      if (camera.position.distanceTo(targetCamRef.current) < 0.001) {
        camera.position.copy(targetCamRef.current);
        targetCamRef.current = null;
      }
      if (orbitRef.current) orbitRef.current.update();
    }
  });

  // Trigger smooth camera move when zoom changes
  useEffect(() => {
    if (!cameraFitted.current || zoom === prevZoom.current) return;
    const ratio = zoom / prevZoom.current;
    prevZoom.current = zoom;
    targetCamRef.current = camera.position.clone().multiplyScalar(ratio);
  }, [zoom, camera]);

  // Trigger smooth camera move when preset changes
  useEffect(() => {
    if (!cameraFitted.current || viewPreset === prevPreset.current) return;
    prevPreset.current = viewPreset;
    const r = radiusRef.current;
    const d = r * 2.5 * zoom;
    const y = r * angle;

    const positions: Record<ViewPreset, [number, number, number]> = {
      default: [0, y, d],
      front:   [0, y, d],
      back:    [0, y, -d],
      left:    [-d, y, 0],
      right:   [d, y, 0],
      top:     [0, r * 4 * zoom, 0.001],
    };
    targetCamRef.current = new THREE.Vector3(...(positions[viewPreset] ?? positions.front));
  }, [viewPreset, zoom, angle]);

  return (
    <OrbitControls
      ref={orbitRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      autoRotate={isAutoRotating}
      autoRotateSpeed={0.6}
      maxPolarAngle={Math.PI * 0.85}
      onStart={handleInteractionStart}
    />
  );
}

export default function ConfiguratorCanvas({
  modelUrl,
  configSchema,
  cameraZoom = 1,
  viewerSettings,
  viewPreset = "default",
  autoRotate = false,
  selections,
  disablePostProcessing = false,
}: ConfiguratorCanvasProps) {
  const bg = viewerSettings?.bgColor ?? "#e8e8e8";
  const ambient = viewerSettings?.ambientIntensity ?? 0.7;
  const keyLight = viewerSettings?.keyLightIntensity ?? 1.2;
  const envPreset = (viewerSettings?.envPreset ?? "studio") as Parameters<typeof Environment>[0]["preset"];
  const shadowEnabled = viewerSettings?.shadowEnabled ?? true;
  const shadowOpacity = viewerSettings?.shadowOpacity ?? 0.35;
  const cameraAngle = viewerSettings?.cameraAngle ?? 0.15;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 0, 1000], fov: 45, near: 0.01, far: 10000 }}
        shadows
        dpr={[1, 2]}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          toneMapping: disablePostProcessing ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={[bg]} />

        {/* 3-point lighting with proper shadow config */}
        <ambientLight intensity={ambient} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={keyLight}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-4, 2, 2]} intensity={keyLight * 0.35} />
        <directionalLight position={[0, 3, -5]} intensity={keyLight * 0.2} />
        <directionalLight position={[0, -2, -3]} intensity={keyLight * 0.08} />

        <Suspense fallback={<Loader />}>
          <Center>
            <DynamicModel modelUrl={modelUrl} configSchema={configSchema} selections={selections} />
          </Center>
          {shadowEnabled && (
            <ContactShadows
              position={[0, -0.01, 0]}
              opacity={shadowOpacity}
              scale={10}
              blur={2.5}
              far={10}
              resolution={512}
            />
          )}
          <Environment preset={envPreset} />
          <CameraRig
            modelUrl={modelUrl}
            zoom={cameraZoom}
            angle={cameraAngle}
            viewPreset={viewPreset}
            autoRotate={autoRotate}
          />
        </Suspense>

        {/* Post-processing for photorealism (skip for lightweight admin previews) */}
        {!disablePostProcessing && (
          <EffectComposer>
            <N8AO aoRadius={0.5} intensity={1.5} distanceFalloff={0.5} />
            <Vignette eskil={false} offset={0.15} darkness={0.3} />
            <ToneMapping mode={ToneMappingMode.AGX} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
