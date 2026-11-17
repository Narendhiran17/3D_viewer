#pragma once

#include <string>
#include <vector>
#include <optional>
#include <cstdint>
#include <cmath>

namespace u3d {

struct Vector3 {
    float x = 0.0f;
    float y = 0.0f;
    float z = 0.0f;

    Vector3() = default;
    Vector3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}

    Vector3 operator+(const Vector3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vector3 operator-(const Vector3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vector3 operator*(float s) const { return {x * s, y * s, z * s}; }
    float length() const { return std::sqrt(x * x + y * y + z * z); }
    Vector3 normalized() const {
        float l = length();
        return l > 1e-6f ? Vector3{x / l, y / l, z / l} : Vector3{0, 0, 0};
    }
};

struct Vector4 {
    float x = 0.0f, y = 0.0f, z = 0.0f, w = 1.0f;
};

struct Quaternion {
    float x = 0.0f, y = 0.0f, z = 0.0f, w = 1.0f;
};

struct Matrix4x4 {
    float m[16] = {
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    };
};

struct Transform {
    Vector3 translation{0.0f, 0.0f, 0.0f};
    Quaternion rotation{0.0f, 0.0f, 0.0f, 1.0f};
    Vector3 scale{1.0f, 1.0f, 1.0f};
};

struct BoundingBox {
    Vector3 min{1e9f, 1e9f, 1e9f};
    Vector3 max{-1e9f, -1e9f, -1e9f};

    void expand(const Vector3& p) {
        if (p.x < min.x) min.x = p.x;
        if (p.y < min.y) min.y = p.y;
        if (p.z < min.z) min.z = p.z;
        if (p.x > max.x) max.x = p.x;
        if (p.y > max.y) max.y = p.y;
        if (p.z > max.z) max.z = p.z;
    }

    Vector3 center() const {
        return (min + max) * 0.5f;
    }

    Vector3 size() const {
        return max - min;
    }

    float diagonal() const {
        return size().length();
    }
};

enum class SupportLevel {
    Recognized,
    Basic,
    Partial,
    Advanced,
    Unsupported,
    Failed
};

inline std::string supportLevelToString(SupportLevel level) {
    switch (level) {
        case SupportLevel::Recognized: return "recognized";
        case SupportLevel::Basic: return "basic";
        case SupportLevel::Partial: return "partial";
        case SupportLevel::Advanced: return "advanced";
        case SupportLevel::Unsupported: return "unsupported";
        case SupportLevel::Failed: return "failed";
    }
    return "unknown";
}

enum class ImportJobState {
    QUEUED,
    VALIDATING,
    DETECTING,
    IMPORTING,
    NORMALIZING,
    OPTIMIZING,
    CACHING,
    READY,
    CANCELLED,
    FAILED,
    EVICTED
};

inline std::string jobStateToString(ImportJobState state) {
    switch (state) {
        case ImportJobState::QUEUED: return "QUEUED";
        case ImportJobState::VALIDATING: return "VALIDATING";
        case ImportJobState::DETECTING: return "DETECTING";
        case ImportJobState::IMPORTING: return "IMPORTING";
        case ImportJobState::NORMALIZING: return "NORMALIZING";
        case ImportJobState::OPTIMIZING: return "OPTIMIZING";
        case ImportJobState::CACHING: return "CACHING";
        case ImportJobState::READY: return "READY";
        case ImportJobState::CANCELLED: return "CANCELLED";
        case ImportJobState::FAILED: return "FAILED";
        case ImportJobState::EVICTED: return "EVICTED";
    }
    return "UNKNOWN";
}

enum class ErrorCode {
    NONE = 0,
    FILE_NOT_FOUND,
    ACCESS_DENIED,
    UNSUPPORTED_FORMAT,
    INVALID_FILE,
    CORRUPT_ARCHIVE,
    IMPORTER_UNAVAILABLE,
    IMPORT_FAILED,
    RESOURCE_LIMIT_EXCEEDED,
    CANCELLED,
    CACHE_WRITE_FAILED,
    RENDERER_INITIALIZATION_FAILED,
    GPU_RESOURCE_FAILED
};

inline std::string errorCodeToString(ErrorCode code) {
    switch (code) {
        case ErrorCode::NONE: return "NONE";
        case ErrorCode::FILE_NOT_FOUND: return "FILE_NOT_FOUND";
        case ErrorCode::ACCESS_DENIED: return "ACCESS_DENIED";
        case ErrorCode::UNSUPPORTED_FORMAT: return "UNSUPPORTED_FORMAT";
        case ErrorCode::INVALID_FILE: return "INVALID_FILE";
        case ErrorCode::CORRUPT_ARCHIVE: return "CORRUPT_ARCHIVE";
        case ErrorCode::IMPORTER_UNAVAILABLE: return "IMPORTER_UNAVAILABLE";
        case ErrorCode::IMPORT_FAILED: return "IMPORT_FAILED";
        case ErrorCode::RESOURCE_LIMIT_EXCEEDED: return "RESOURCE_LIMIT_EXCEEDED";
        case ErrorCode::CANCELLED: return "CANCELLED";
        case ErrorCode::CACHE_WRITE_FAILED: return "CACHE_WRITE_FAILED";
        case ErrorCode::RENDERER_INITIALIZATION_FAILED: return "RENDERER_INITIALIZATION_FAILED";
        case ErrorCode::GPU_RESOURCE_FAILED: return "GPU_RESOURCE_FAILED";
    }
    return "UNKNOWN_ERROR";
}

enum class RenderMode {
    Shaded,
    Textured,
    Wireframe,
    Normals,
    Matcap
};

enum class TessellationProfile {
    Draft,
    Balanced,
    High,
    Custom
};

struct ResourceLimits {
    uint64_t maxFileSizeBytes = 500 * 1024 * 1024; // 500 MB
    uint64_t maxMemoryBudgetBytes = 1024 * 1024 * 1024; // 1 GB
    uint32_t maxVertexCount = 20000000; // 20M vertices
    uint32_t maxTextureDimension = 8192;
    uint32_t maxImportDurationMs = 60000; // 60 seconds
};

struct ModelInfo {
    std::string modelId;
    std::string fileName;
    std::string detectedFormat;
    SupportLevel supportLevel = SupportLevel::Basic;
    uint32_t nodeCount = 0;
    uint32_t meshCount = 0;
    uint32_t triangleCount = 0;
    uint32_t vertexCount = 0;
    std::vector<std::string> warnings;
    BoundingBox bounds;
};

} // namespace u3d
