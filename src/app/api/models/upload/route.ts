import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const modelFile = formData.get("model") as File;

    if (!modelFile) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = path.extname(modelFile.name).toLowerCase();
    if (!MODEL_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Supports .glb and .gltf" },
        { status: 400 }
      );
    }

    const isGltf = ext === ".gltf";
    const assetFiles = formData.getAll("assets") as File[];

    // Validate asset extensions
    for (const asset of assetFiles) {
      const assetExt = path.extname(asset.name).toLowerCase();
      if (!ASSET_EXTENSIONS.includes(assetExt)) {
        return NextResponse.json(
          { error: `Invalid asset type: ${asset.name}. Allowed: ${ASSET_EXTENSIONS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const modelsDir = path.join(process.cwd(), "public", "models");

    let modelUrl: string;

    if (isGltf) {
      // Save GLTF + all assets into a named subfolder so relative paths resolve
      const folderName = `${Date.now()}-${path.basename(modelFile.name, ".gltf").replace(/[^a-zA-Z0-9-]/g, "_")}`;
      const folderPath = path.join(modelsDir, folderName);
      await mkdir(folderPath, { recursive: true });

      // Save main GLTF file
      const gltfBytes = await modelFile.arrayBuffer();
      await writeFile(path.join(folderPath, "model.gltf"), Buffer.from(gltfBytes));

      // Save each asset with its original filename so GLTF references resolve
      for (const asset of assetFiles) {
        const assetBytes = await asset.arrayBuffer();
        const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        await writeFile(path.join(folderPath, safeName), Buffer.from(assetBytes));
      }

      modelUrl = `/models/${folderName}/model.gltf`;
    } else {
      // GLB: single file, no subfolder needed
      await mkdir(modelsDir, { recursive: true });
      const fileName = `${Date.now()}-${modelFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(modelsDir, fileName);
      const bytes = await modelFile.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      modelUrl = `/models/${fileName}`;
    }

    return NextResponse.json({ url: modelUrl, size: modelFile.size });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
