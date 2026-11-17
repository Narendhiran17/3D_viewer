#pragma once

#include "../scene/UniversalSceneModel.h"
#include "../import/IFormatAdapter.h"
#include <string>
#include <vector>

namespace u3d {

struct CacheManifest {
    std::string cacheKey;
    std::string sourceHash;
    std::string format;
    std::string schemaVersion = "1.0";
    std::string createdAt;
    uint32_t nodeCount = 0;
    uint32_t meshCount = 0;
    uint32_t vertexCount = 0;
    uint32_t triangleCount = 0;
    std::string binPath;
};

class CacheManager {
public:
    static CacheManager& getInstance();

    void setCacheDirectory(const std::string& dir);
    std::string getCacheDirectory() const { return cacheDir_; }

    std::string generateCacheKey(const std::string& filePath, const std::string& format, const ImportOptions& options);
    bool hasValidCache(const std::string& cacheKey) const;

    bool saveToCache(const std::string& cacheKey, const UniversalSceneModel& scene);
    std::shared_ptr<UniversalSceneModel> loadFromCache(const std::string& cacheKey);
    bool evict(const std::string& cacheKey);
    void clearAllCache();

    uint64_t getTotalCacheSizeBytes() const;

private:
    CacheManager();
    ~CacheManager() = default;

    std::string cacheDir_ = "./app_cache";
    std::string computeFileHash(const std::string& filePath) const;
};

} // namespace u3d
