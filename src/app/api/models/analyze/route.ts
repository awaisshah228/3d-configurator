import { NextRequest, NextResponse } from "next/server";
import { NodeIO } from "@gltf-transform/core";
import { readFile } from "fs/promises";
import { join } from "path";

interface MeshData {
  name: string;
  vertexCount: number;
  faceCount: number;
  material: {
    name: string;
    baseColor: number[];
    metallic: number;
    roughness: number;
    hasTexture: boolean;
    textureName: string | null;
  } | null;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const { modelUrl } = await request.json();

    if (!modelUrl) {
      return NextResponse.json(
        { error: "modelUrl is required" },
        { status: 400 }
      );
    }

    // Resolve model path from public directory
    const modelPath = join(process.cwd(), "public", modelUrl);
    const buffer = await readFile(modelPath);

    const io = new NodeIO();
    const document = await io.readBinary(new Uint8Array(buffer));
    const root = document.getRoot();

    const meshes: MeshData[] = [];
    let totalVertices = 0;
    let totalFaces = 0;

    for (const mesh of root.listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute("POSITION");
        const indices = primitive.getIndices();

        const vertexCount = position?.getCount() ?? 0;
        const faceCount = indices
          ? indices.getCount() / 3
          : Math.floor(vertexCount / 3);

        totalVertices += vertexCount;
        totalFaces += faceCount;

        // Extract material info
        const mat = primitive.getMaterial();
        let material: MeshData["material"] = null;
        if (mat) {
          const baseColor = mat.getBaseColorFactor();
          const baseColorTex = mat.getBaseColorTexture();
          material = {
            name: mat.getName() || "Unnamed Material",
            baseColor: [baseColor[0], baseColor[1], baseColor[2]],
            metallic: mat.getMetallicFactor(),
            roughness: mat.getRoughnessFactor(),
            hasTexture: !!baseColorTex,
            textureName: baseColorTex?.getName() ?? null,
          };
        }

        // Compute bounding box from position attribute
        let boundingBox: MeshData["boundingBox"] = null;
        if (position) {
          const min: [number, number, number] = [Infinity, Infinity, Infinity];
          const max: [number, number, number] = [
            -Infinity,
            -Infinity,
            -Infinity,
          ];
          for (let i = 0; i < position.getCount(); i++) {
            const v = position.getElement(i, [0, 0, 0]);
            for (let j = 0; j < 3; j++) {
              if (v[j] < min[j]) min[j] = v[j];
              if (v[j] > max[j]) max[j] = v[j];
            }
          }
          boundingBox = { min, max };
        }

        meshes.push({
          name: mesh.getName() || `mesh_${meshes.length}`,
          vertexCount,
          faceCount,
          material,
          boundingBox,
        });
      }
    }

    // Collect unique materials
    const materials = root.listMaterials().map((mat) => {
      const baseColorTex = mat.getBaseColorTexture();
      return {
        name: mat.getName() || "Unnamed Material",
        baseColor: mat.getBaseColorFactor().slice(0, 3),
        metallic: mat.getMetallicFactor(),
        roughness: mat.getRoughnessFactor(),
        doubleSided: mat.getDoubleSided(),
        alphaMode: mat.getAlphaMode(),
        hasTexture: !!baseColorTex,
        textureName: baseColorTex?.getName() ?? null,
      };
    });

    return NextResponse.json({
      meshes,
      materials,
      totalVertices,
      totalFaces,
      meshCount: meshes.length,
      materialCount: materials.length,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
