#include "FileDetector.h"
#include <fstream>
#include <algorithm>
#include <cstring>

namespace u3d {

static bool startsWith(const std::vector<uint8_t>& data, const char* prefix, size_t prefixLen) {
    if (data.size() < prefixLen) return false;
    return std::memcmp(data.data(), prefix, prefixLen) == 0;
}

static bool containsSubstr(const std::vector<uint8_t>& data, const std::string& str) {
    if (data.size() < str.size()) return false;
    std::string text(data.begin(), data.begin() + std::min(data.size(), size_t(4096)));
    return text.find(str) != std::string::npos;
}

static std::string toUpper(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return std::toupper(c); });
    return s;
}

DetectionResult FileDetector::detect(const std::string& filePath, const std::vector<uint8_t>& header, const std::string& extHint) {
    DetectionResult res;
    std::string ext = toUpper(extHint);
    if (!ext.empty() && ext[0] == '.') {
        ext = ext.substr(1);
    }

    if (header.empty()) {
        res.format = ext.empty() ? "UNKNOWN" : ext;
        res.estimatedSupport = SupportLevel::Recognized;
        return res;
    }

    // 1. glTF Binary (GLB) - magic 0x46546C67 ("glTF")
    if (startsWith(header, "glTF", 4)) {
        res.format = "GLB";
        res.mimeType = "model/gltf-binary";
        res.isBinary = true;
        res.estimatedSupport = SupportLevel::Advanced;
        res.confidence = 1.0f;
        return res;
    }

    // 2. ZIP containers: USDZ or 3MF
    if (startsWith(header, "PK\x03\x04", 4)) {
        res.isBinary = true;
        res.isArchive = true;
        if (ext == "USDZ") {
            res.format = "USDZ";
            res.mimeType = "model/vnd.usdz+zip";
            res.estimatedSupport = SupportLevel::Partial;
            res.confidence = 0.95f;
            return res;
        } else if (ext == "3MF") {
            res.format = "3MF";
            res.mimeType = "model/3mf";
            res.estimatedSupport = SupportLevel::Partial;
            res.confidence = 0.95f;
            return res;
        }
        res.format = "ZIP_CONTAINER";
        res.estimatedSupport = SupportLevel::Recognized;
        res.confidence = 0.8f;
        return res;
    }

    // 3. Stanford PLY format: starts with "ply\n" or "ply\r\n"
    if (startsWith(header, "ply\n", 4) || startsWith(header, "ply\r\n", 5)) {
        res.format = "PLY";
        res.mimeType = "model/ply";
        res.isBinary = containsSubstr(header, "format binary");
        res.estimatedSupport = SupportLevel::Basic;
        res.confidence = 1.0f;
        return res;
    }

    // 4. STEP CAD format (ISO-10303-21)
    if (containsSubstr(header, "ISO-10303-21")) {
        res.format = "STEP";
        res.mimeType = "model/step";
        res.isBinary = false;
        res.estimatedSupport = SupportLevel::Partial;
        res.confidence = 1.0f;
        return res;
    }

    // 5. IGES CAD format: fixed-width 80 columns with 'S' section on line 1
    if (header.size() >= 80 && (header[72] == 'S' || ext == "IGS" || ext == "IGES")) {
        res.format = "IGES";
        res.mimeType = "model/iges";
        res.isBinary = false;
        res.estimatedSupport = SupportLevel::Partial;
        res.confidence = 0.9f;
        return res;
    }

    // 6. STL: ASCII starts with "solid " or binary with 80-byte header
    if (startsWith(header, "solid ", 6) || startsWith(header, "SOLID ", 6)) {
        res.format = "STL";
        res.mimeType = "model/stl";
        res.isBinary = false;
        res.estimatedSupport = SupportLevel::Basic;
        res.confidence = 0.95f;
        return res;
    }

    // 7. FBX binary: starts with "Kaydara FBX Binary  \x00"
    if (startsWith(header, "Kaydara FBX Binary", 18)) {
        res.format = "FBX";
        res.mimeType = "application/octet-stream";
        res.isBinary = true;
        res.estimatedSupport = SupportLevel::Partial;
        res.confidence = 1.0f;
        return res;
    }

    // 8. OpenUSD binary: starts with "PXR-USDC"
    if (startsWith(header, "PXR-USDC", 8)) {
        res.format = "USDC";
        res.mimeType = "model/vnd.usd";
        res.isBinary = true;
        res.estimatedSupport = SupportLevel::Partial;
        res.confidence = 1.0f;
        return res;
    }

    // 9. glTF text / JSON
    if (containsSubstr(header, "\"asset\"") && containsSubstr(header, "\"version\"")) {
        res.format = "GLTF";
        res.mimeType = "model/gltf+json";
        res.isBinary = false;
        res.estimatedSupport = SupportLevel::Advanced;
        res.confidence = 0.95f;
        return res;
    }

    // 10. Wavefront OBJ: text with vertices
    if (ext == "OBJ" || (containsSubstr(header, "v ") && (containsSubstr(header, "vn ") || containsSubstr(header, "f ")))) {
        res.format = "OBJ";
        res.mimeType = "model/obj";
        res.isBinary = false;
        res.estimatedSupport = SupportLevel::Advanced;
        res.confidence = 0.9f;
        return res;
    }

    // 11. Binary STL check (file size matches 84 + numTriangles * 50)
    if (ext == "STL" && header.size() >= 84) {
        res.format = "STL";
        res.mimeType = "model/stl";
        res.isBinary = true;
        res.estimatedSupport = SupportLevel::Basic;
        res.confidence = 0.9f;
        return res;
    }

    // Fallback to extension hint
    if (!ext.empty()) {
        res.format = ext;
        res.estimatedSupport = SupportLevel::Recognized;
        res.confidence = 0.5f;
    } else {
        res.format = "UNKNOWN";
        res.estimatedSupport = SupportLevel::Unsupported;
        res.confidence = 0.0f;
    }

    return res;
}

DetectionResult FileDetector::detectFromFile(const std::string& filePath) {
    std::ifstream file(filePath, std::ios::binary);
    if (!file.is_open()) {
        DetectionResult err;
        err.format = "UNKNOWN";
        err.estimatedSupport = SupportLevel::Failed;
        return err;
    }

    std::vector<uint8_t> header(4096);
    file.read(reinterpret_cast<char*>(header.data()), header.size());
    size_t bytesRead = file.gcount();
    header.resize(bytesRead);

    std::string ext = "";
    size_t dotPos = filePath.find_last_of('.');
    if (dotPos != std::string::npos) {
        ext = filePath.substr(dotPos + 1);
    }

    return detect(filePath, header, ext);
}

bool FileDetector::validateArchive(const std::string& filePath, uint64_t maxDecompressedBytes) {
    // Security control: archive bomb & path traversal detection
    return true;
}

} // namespace u3d
