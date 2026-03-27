import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("model") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validExtensions = [".glb", ".gltf"];
    const ext = path.extname(file.name).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Supports .glb and .gltf" },
        { status: 400 }
      );
    }

    // Save to public/models directory
    const modelsDir = path.join(process.cwd(), "public", "models");
    await mkdir(modelsDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(modelsDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      url: `/models/${fileName}`,
      fileName,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
