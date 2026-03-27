"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import DynamicModel from "./DynamicModel";
import type { ConfigSchema, ViewerSettings } from "@/lib/configurator-types";

interface ConfiguratorCanvasProps {
  modelUrl: string;
  configSchema: ConfigSchema;
  cameraZoom?: number;
  viewerSettings?: ViewerSettings;
}

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#aaa" wireframe />
    </mesh>
  );
}

function CameraRig({ modelUrl, zoom = 1, angle = 0.15 }: { modelUrl: string; zoom?: number; angle?: number }) {
  const { scene: modelScene } = useGLTF(modelUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);
  const cameraFitted = useRef(false);
  const orbitFitted = useRef(false);
  const radiusRef = useRef(1);

  useFrame(({ camera }) => {
    // Step 1: position camera as soon as we have model bounds (no OrbitControls needed)
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

    // Step 2: configure OrbitControls as soon as it mounts (may be same or next frame)
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

export default function ConfiguratorCanvas({
  modelUrl,
  configSchema,
  cameraZoom = 1,
  viewerSettings,
}: ConfiguratorCanvasProps) {
  const bg = viewerSettings?.bgColor ?? "#e8e8e8";
  const ambient = viewerSettings?.ambientIntensity ?? 0.7;
  const keyLight = viewerSettings?.keyLightIntensity ?? 1.2;
  const envPreset = (viewerSettings?.envPreset ?? "studio") as Parameters<typeof Environment>[0]["preset"];
  const shadowEnabled = viewerSettings?.shadowEnabled ?? true;
  const shadowOpacity = viewerSettings?.shadowOpacity ?? 0.35;
  const cameraAngle = viewerSettings?.cameraAngle ?? 0.15;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 1000], fov: 45, near: 0.01, far: 100000 }}
        shadows
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <color attach="background" args={[bg]} />
        <ambientLight intensity={ambient} />
        <directionalLight position={[3, 5, 4]} intensity={keyLight} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, 2]} intensity={keyLight * 0.4} />
        <directionalLight position={[0, 3, -5]} intensity={keyLight * 0.25} />

        <Suspense fallback={<Loader />}>
          <Center>
            <DynamicModel modelUrl={modelUrl} configSchema={configSchema} />
          </Center>
          {shadowEnabled && (
            <ContactShadows position={[0, -0.01, 0]} opacity={shadowOpacity} scale={10} blur={3} far={10} />
          )}
          <Environment preset={envPreset} />
          <CameraRig modelUrl={modelUrl} zoom={cameraZoom} angle={cameraAngle} />
        </Suspense>
      </Canvas>
    </div>
  );
}
