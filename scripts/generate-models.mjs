import { writeFileSync } from "fs";

// Manually build a minimal GLB file
// GLB = 12-byte header + JSON chunk + BIN chunk

function createGLB(meshes) {
  // Build buffer data for all meshes
  const accessors = [];
  const bufferViews = [];
  const meshDefs = [];
  const nodeDefs = [];
  const materialDefs = [];
  let byteOffset = 0;
  const bufferParts = [];

  for (const meshDef of meshes) {
    const { name, positions, indices, color, materialName, translation, rotation, scale } = meshDef;

    // Material
    const matIndex = materialDefs.length;
    materialDefs.push({
      name: materialName || name + "_material",
      pbrMetallicRoughness: {
        baseColorFactor: [...color, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.9,
      },
    });

    // Positions buffer view
    const posData = new Float32Array(positions);
    const posBytes = Buffer.from(posData.buffer);
    const posViewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: posBytes.length, target: 34962 });
    byteOffset += posBytes.length;
    bufferParts.push(posBytes);

    // Compute bounds
    let minPos = [Infinity, Infinity, Infinity];
    let maxPos = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        minPos[j] = Math.min(minPos[j], positions[i + j]);
        maxPos[j] = Math.max(maxPos[j], positions[i + j]);
      }
    }

    const posAccessorIndex = accessors.length;
    accessors.push({
      bufferView: posViewIndex,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: minPos,
      max: maxPos,
    });

    // Indices buffer view
    const idxData = new Uint16Array(indices);
    const idxBytes = Buffer.from(idxData.buffer);
    // Pad to 4 byte alignment
    const padding = (4 - (byteOffset % 4)) % 4;
    if (padding > 0) {
      bufferParts.push(Buffer.alloc(padding));
      byteOffset += padding;
    }
    const idxViewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: idxBytes.length, target: 34963 });
    byteOffset += idxBytes.length;
    bufferParts.push(idxBytes);

    const idxAccessorIndex = accessors.length;
    accessors.push({
      bufferView: idxViewIndex,
      componentType: 5123,
      count: indices.length,
      type: "SCALAR",
      min: [Math.min(...indices)],
      max: [Math.max(...indices)],
    });

    // Mesh definition
    const meshIndex = meshDefs.length;
    meshDefs.push({
      name,
      primitives: [{
        attributes: { POSITION: posAccessorIndex },
        indices: idxAccessorIndex,
        material: matIndex,
      }],
    });

    // Node
    const node = { name, mesh: meshIndex };
    if (translation) node.translation = translation;
    if (rotation) node.rotation = rotation;
    if (scale) node.scale = scale;
    nodeDefs.push(node);
  }

  // Pad binary to 4-byte alignment
  const binPadding = (4 - (byteOffset % 4)) % 4;
  if (binPadding > 0) {
    bufferParts.push(Buffer.alloc(binPadding));
    byteOffset += binPadding;
  }

  const binBuffer = Buffer.concat(bufferParts);

  const gltf = {
    asset: { version: "2.0", generator: "3D-Config Generator" },
    scene: 0,
    scenes: [{ nodes: nodeDefs.map((_, i) => i) }],
    nodes: nodeDefs,
    meshes: meshDefs,
    materials: materialDefs,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuffer.length }],
  };

  const jsonStr = JSON.stringify(gltf);
  // Pad JSON to 4-byte alignment
  const jsonPadded = jsonStr + " ".repeat((4 - (jsonStr.length % 4)) % 4);
  const jsonBuffer = Buffer.from(jsonPadded, "utf8");

  // GLB structure
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // magic "glTF"
  header.writeUInt32LE(2, 4);          // version
  header.writeUInt32LE(12 + 8 + jsonBuffer.length + 8 + binBuffer.length, 8); // total length

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // "JSON"

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer]);
}

// ─── Generate T-Shirt geometry ──────────────────────────────────────
function generateCylinder(radiusTop, radiusBottom, height, segments) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    positions.push(cos * radiusTop, height / 2, sin * radiusTop);
    positions.push(cos * radiusBottom, -height / 2, sin * radiusBottom);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  return { positions, indices };
}

function generateBox(w, h, d) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const positions = [
    -hw,-hh,-hd, hw,-hh,-hd, hw,hh,-hd, -hw,hh,-hd,
    -hw,-hh,hd, hw,-hh,hd, hw,hh,hd, -hw,hh,hd,
  ];
  const indices = [
    0,1,2, 0,2,3, 4,6,5, 4,7,6,
    0,4,5, 0,5,1, 2,6,7, 2,7,3,
    0,3,7, 0,7,4, 1,5,6, 1,6,2,
  ];
  return { positions, indices };
}

function generateSphere(radius, wSeg, hSeg) {
  const positions = [];
  const indices = [];
  for (let y = 0; y <= hSeg; y++) {
    const v = y / hSeg;
    const phi = v * Math.PI;
    for (let x = 0; x <= wSeg; x++) {
      const u = x / wSeg;
      const theta = u * Math.PI * 2;
      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }
  }
  for (let y = 0; y < hSeg; y++) {
    for (let x = 0; x < wSeg; x++) {
      const a = y * (wSeg + 1) + x;
      const b = a + wSeg + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }
  return { positions, indices };
}

// ─── T-Shirt ────────────────────────────────────────────────────────
const body = generateCylinder(0.4, 0.45, 0.8, 20);
const leftSleeve = generateCylinder(0.12, 0.18, 0.35, 12);
const rightSleeve = generateCylinder(0.12, 0.18, 0.35, 12);

const tshirtGLB = createGLB([
  { name: "Object_2", positions: body.positions, indices: body.indices, color: [1, 1, 1], materialName: "Material" },
  { name: "Object_3", positions: leftSleeve.positions, indices: leftSleeve.indices, color: [1, 1, 1], materialName: "Material", translation: [-0.5, 0.15, 0] },
  { name: "Object_4", positions: rightSleeve.positions, indices: rightSleeve.indices, color: [1, 1, 1], materialName: "Material", translation: [0.5, 0.15, 0] },
]);
writeFileSync("public/models/tshirt.glb", tshirtGLB);
console.log(`tshirt.glb: ${tshirtGLB.length} bytes`);

// ─── Shoe ───────────────────────────────────────────────────────────
const soleBox = generateBox(0.35, 0.08, 0.9);
const upperSphere = generateSphere(0.2, 12, 8);
const toeSphere = generateSphere(0.15, 10, 6);
const heelBox = generateBox(0.3, 0.18, 0.1);

const shoeGLB = createGLB([
  { name: "shoe_sole", positions: soleBox.positions, indices: soleBox.indices, color: [0.97, 0.97, 0.97], materialName: "sole_material", translation: [0, -0.15, 0] },
  { name: "shoe_1", positions: upperSphere.positions, indices: upperSphere.indices, color: [1, 1, 1], materialName: "upper_material", translation: [0, 0, 0], scale: [0.8, 0.7, 1.6] },
  { name: "shoe_2", positions: toeSphere.positions, indices: toeSphere.indices, color: [1, 1, 1], materialName: "upper_material", translation: [0, -0.05, 0.3] },
  { name: "shoe_3", positions: heelBox.positions, indices: heelBox.indices, color: [1, 1, 1], materialName: "upper_material", translation: [0, 0, -0.35] },
]);
writeFileSync("public/models/shoe.glb", shoeGLB);
console.log(`shoe.glb: ${shoeGLB.length} bytes`);

console.log("Done! Models generated in public/models/");
