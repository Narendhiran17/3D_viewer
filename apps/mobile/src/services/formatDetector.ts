import { SupportLevel } from "../types/engine";

export interface ClientDetectionResult {
  format: string;
  mimeType: string;
  isBinary: boolean;
  isArchive: boolean;
  supportLevel: SupportLevel;
  confidence: number;
}

export function detectFormat(fileName: string, buffer?: ArrayBuffer | string): ClientDetectionResult {
  const ext = fileName.split(".").pop()?.toUpperCase() || "";

  if (!buffer) {
    return {
      format: ext || "UNKNOWN",
      mimeType: "application/octet-stream",
      isBinary: false,
      isArchive: false,
      supportLevel: ext ? "basic" : "unsupported",
      confidence: 0.5
    };
  }

  // Check magic bytes if ArrayBuffer
  if (buffer instanceof ArrayBuffer) {
    const bytes = new Uint8Array(buffer.slice(0, 64));

    // 1. GLB - "glTF" magic: 0x67, 0x6C, 0x54, 0x46
    if (bytes[0] === 0x67 && bytes[1] === 0x6C && bytes[2] === 0x54 && bytes[3] === 0x46) {
      return {
        format: "GLB",
        mimeType: "model/gltf-binary",
        isBinary: true,
        isArchive: false,
        supportLevel: "advanced",
        confidence: 1.0
      };
    }

    // 2. ZIP container: PK\x03\x04 (USDZ, 3MF)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      if (ext === "USDZ") {
        return {
          format: "USDZ",
          mimeType: "model/vnd.usdz+zip",
          isBinary: true,
          isArchive: true,
          supportLevel: "partial",
          confidence: 0.95
        };
      }
      if (ext === "3MF") {
        return {
          format: "3MF",
          mimeType: "model/3mf",
          isBinary: true,
          isArchive: true,
          supportLevel: "partial",
          confidence: 0.95
        };
      }
    }

    // 3. Stanford PLY: "ply\n"
    if (bytes[0] === 0x70 && bytes[1] === 0x6C && bytes[2] === 0x79) {
      return {
        format: "PLY",
        mimeType: "model/ply",
        isBinary: false,
        isArchive: false,
        supportLevel: "basic",
        confidence: 1.0
      };
    }

    // Check ASCII content
    const decoder = new TextDecoder();
    const snippet = decoder.decode(bytes);

    if (snippet.startsWith("solid")) {
      return {
        format: "STL",
        mimeType: "model/stl",
        isBinary: false,
        isArchive: false,
        supportLevel: "basic",
        confidence: 0.95
      };
    }

    if (snippet.includes("ISO-10303-21")) {
      return {
        format: "STEP",
        mimeType: "model/step",
        isBinary: false,
        isArchive: false,
        supportLevel: "partial",
        confidence: 1.0
      };
    }

    // Binary STL check
    if (ext === "STL" && buffer.byteLength >= 84) {
      return {
        format: "STL",
        mimeType: "model/stl",
        isBinary: true,
        isArchive: false,
        supportLevel: "basic",
        confidence: 0.9
      };
    }
  }

  // String check
  if (typeof buffer === "string") {
    if (buffer.includes("ISO-10303-21")) {
      return {
        format: "STEP",
        mimeType: "model/step",
        isBinary: false,
        isArchive: false,
        supportLevel: "partial",
        confidence: 1.0
      };
    }
    if (buffer.startsWith("solid")) {
      return {
        format: "STL",
        mimeType: "model/stl",
        isBinary: false,
        isArchive: false,
        supportLevel: "basic",
        confidence: 0.95
      };
    }
    if (buffer.startsWith("ply")) {
      return {
        format: "PLY",
        mimeType: "model/ply",
        isBinary: false,
        isArchive: false,
        supportLevel: "basic",
        confidence: 1.0
      };
    }
    if (ext === "OBJ" || (buffer.includes("v ") && buffer.includes("f "))) {
      return {
        format: "OBJ",
        mimeType: "model/obj",
        isBinary: false,
        isArchive: false,
        supportLevel: "advanced",
        confidence: 0.95
      };
    }
  }

  // Fallback to extension
  switch (ext) {
    case "GLB":
    case "GLTF":
      return { format: ext, mimeType: "model/gltf+json", isBinary: ext === "GLB", isArchive: false, supportLevel: "advanced", confidence: 0.8 };
    case "OBJ":
      return { format: "OBJ", mimeType: "model/obj", isBinary: false, isArchive: false, supportLevel: "advanced", confidence: 0.8 };
    case "STL":
      return { format: "STL", mimeType: "model/stl", isBinary: true, isArchive: false, supportLevel: "basic", confidence: 0.8 };
    case "PLY":
      return { format: "PLY", mimeType: "model/ply", isBinary: false, isArchive: false, supportLevel: "basic", confidence: 0.8 };
    case "STEP":
    case "STP":
      return { format: "STEP", mimeType: "model/step", isBinary: false, isArchive: false, supportLevel: "partial", confidence: 0.8 };
    case "IGES":
    case "IGS":
      return { format: "IGES", mimeType: "model/iges", isBinary: false, isArchive: false, supportLevel: "partial", confidence: 0.8 };
    case "FBX":
      return { format: "FBX", mimeType: "application/octet-stream", isBinary: true, isArchive: false, supportLevel: "partial", confidence: 0.7 };
    default:
      return { format: ext || "UNKNOWN", mimeType: "application/octet-stream", isBinary: false, isArchive: false, supportLevel: "unsupported", confidence: 0.2 };
  }
}
