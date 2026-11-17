#pragma once

#include "Types.h"
#include <string>
#include <vector>
#include <cstdint>

namespace u3d {

struct DetectionResult {
    std::string format; // "GLB", "GLTF", "OBJ", "STL", "PLY", "STEP", "IGES", "FBX", "USDZ", "3MF", "UNKNOWN"
    std::string mimeType;
    bool isBinary = false;
    bool isArchive = false;
    SupportLevel estimatedSupport = SupportLevel::Basic;
    float confidence = 0.0f; // 0.0 to 1.0
};

class FileDetector {
public:
    static DetectionResult detect(const std::string& filePath, const std::vector<uint8_t>& headerBytes, const std::string& extensionHint);
    static DetectionResult detectFromFile(const std::string& filePath);
    static bool validateArchive(const std::string& filePath, uint64_t maxDecompressedBytes = 500 * 1024 * 1024);
};

} // namespace u3d
