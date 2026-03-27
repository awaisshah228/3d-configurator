import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MODEL_EXTENSIONS = [".glb", ".gltf"];
const ASSET_EXTENSIONS = [".bin", ".png", ".jpg", ".jpeg", ".webp", ".ktx2", ".basis"];
const TEXTURE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

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
    // assetFiles = GLTF bundle dependencies (.bin, textures referenced by the GLTF)
    const assetFiles = formData.getAll("assets") as File[];
    const assetPaths = formData.getAll("assetPaths") as string[];
    // textureFiles = standalone configurator texture swatches (for GLB + textures workflow)
    const textureFiles = formData.getAll("textures") as File[];
    const texturePaths = formData.getAll("texturePaths") as string[];

    for (const asset of assetFiles) {
      const assetExt = path.extname(asset.name).toLowerCase();
      if (!ASSET_EXTENSIONS.includes(assetExt)) {
        return NextResponse.json(
          { error: `Invalid asset type: ${asset.name}. Allowed: ${ASSET_EXTENSIONS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    for (const tex of textureFiles) {
      const texExt = path.extname(tex.name).toLowerCase();
      if (!TEXTURE_EXTENSIONS.includes(texExt)) {
        return NextResponse.json(
          { error: `Invalid texture type: ${tex.name}. Allowed: ${TEXTURE_EXTENSIONS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const modelsDir = path.join(process.cwd(), "public", "models");
    const baseName = path.basename(modelFile.name, ext).replace(/[^a-zA-Z0-9-]/g, "_");
    const folderName = `${Date.now()}-${baseName}`;

    if (isGltf) {
      // GLTF bundle — always goes into a folder
      const folderPath = path.join(modelsDir, folderName);
      await mkdir(folderPath, { recursive: true });

      const gltfBytes = await modelFile.arrayBuffer();
      await writeFile(path.join(folderPath, "model.gltf"), Buffer.from(gltfBytes));

      for (let i = 0; i < assetFiles.length; i++) {
        const asset = assetFiles[i];
        const relPath = safePath(assetPaths[i] ?? asset.name);
        const destPath = path.join(folderPath, relPath);
        await mkdir(path.dirname(destPath), { recursive: true });
        const bytes = await asset.arrayBuffer();
        await writeFile(destPath, Buffer.from(bytes));
      }

      return NextResponse.json({ url: `/models/${folderName}/model.gltf`, textureUrls: [], size: modelFile.size });
    } else {
      // GLB — always put in a folder so textures can live alongside it
      const folderPath = path.join(modelsDir, folderName);
      await mkdir(folderPath, { recursive: true });

      const bytes = await modelFile.arrayBuffer();
      await writeFile(path.join(folderPath, modelFile.name), Buffer.from(bytes));

      // Save configurator texture swatches into a textures/ subfolder
      const textureUrls: { name: string; url: string }[] = [];
      for (let i = 0; i < textureFiles.length; i++) {
        const tex = textureFiles[i];
        const relPath = safePath(texturePaths[i] ?? `textures/${tex.name}`);
        const destPath = path.join(folderPath, relPath);
        await mkdir(path.dirname(destPath), { recursive: true });
        const texBytes = await tex.arrayBuffer();
        await writeFile(destPath, Buffer.from(texBytes));
        textureUrls.push({
          name: path.basename(tex.name, path.extname(tex.name)),
          url: `/models/${folderName}/${relPath}`,
        });
      }

      return NextResponse.json({
        url: `/models/${folderName}/${modelFile.name}`,
        textureUrls,
        size: modelFile.size,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
