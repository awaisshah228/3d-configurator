import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];

/** Prevent path traversal — keeps path within the bundle folder */
function safePath(relativePath: string): string {
  return relativePath
    .split("/")
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .filter((seg) => seg.length > 0 && seg !== "..")
    .join("/");
}

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
    // assetPaths[i] is the relative path for assetFiles[i], e.g. "textures/foo.png"
    const assetPaths = formData.getAll("assetPaths") as string[];

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

    if (isGltf) {
      const folderName = `${Date.now()}-${path.basename(modelFile.name, ".gltf").replace(/[^a-zA-Z0-9-]/g, "_")}`;
      const folderPath = path.join(modelsDir, folderName);
      await mkdir(folderPath, { recursive: true });

      // Save GLTF
      const gltfBytes = await modelFile.arrayBuffer();
      await writeFile(path.join(folderPath, "model.gltf"), Buffer.from(gltfBytes));

      // Save each asset at its original relative path (recreating subdirs)
      for (let i = 0; i < assetFiles.length; i++) {
        const asset = assetFiles[i];
        // Use the sent relative path if available, otherwise fall back to filename
        const relPath = safePath(assetPaths[i] ?? asset.name);
        const destPath = path.join(folderPath, relPath);

        // Create subdirectory (e.g. "textures/") if needed
        await mkdir(path.dirname(destPath), { recursive: true });

        const bytes = await asset.arrayBuffer();
        await writeFile(destPath, Buffer.from(bytes));
      }

      return NextResponse.json({ url: `/models/${folderName}/model.gltf`, size: modelFile.size });
    } else {
      await mkdir(modelsDir, { recursive: true });
      const fileName = `${Date.now()}-${modelFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const bytes = await modelFile.arrayBuffer();
      await writeFile(path.join(modelsDir, fileName), Buffer.from(bytes));
      return NextResponse.json({ url: `/models/${fileName}`, size: modelFile.size });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
