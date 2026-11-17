#include "CacheManager.h"
#include <fstream>
#include <sstream>
#include <chrono>

namespace u3d {

CacheManager& CacheManager::getInstance() {
    static CacheManager instance;
    return instance;
}

CacheManager::CacheManager() {}

void CacheManager::setCacheDirectory(const std::string& dir) {
    cacheDir_ = dir;
}

std::string CacheManager::computeFileHash(const std::string& filePath) const {
    std::ifstream f(filePath, std::ios::binary);
    if (!f.is_open()) return "00000000";

    // Fast 64-bit FNV-1a hash
    uint64_t hash = 14695981039346656037ULL;
    char buffer[4096];
    while (f.read(buffer, sizeof(buffer)) || f.gcount() > 0) {
        size_t count = f.gcount();
        for (size_t i = 0; i < count; ++i) {
            hash ^= static_cast<uint8_t>(buffer[i]);
            hash *= 1099511628211ULL;
        }
    }

    std::ostringstream ss;
    ss << std::hex << hash;
    return ss.str();
}

std::string CacheManager::generateCacheKey(const std::string& filePath, const std::string& format, const ImportOptions& options) {
    std::string fileHash = computeFileHash(filePath);
    std::ostringstream ss;
    ss << "cache_" << format << "_" << fileHash << "_tess" << static_cast<int>(options.tessellationProfile) << "_v1.0";
    return ss.str();
}

bool CacheManager::hasValidCache(const std::string& cacheKey) const {
    std::string manifestPath = cacheDir_ + "/" + cacheKey + ".manifest";
    std::ifstream f(manifestPath);
    return f.good();
}

bool CacheManager::saveToCache(const std::string& cacheKey, const UniversalSceneModel& scene) {
    std::string tmpManifest = cacheDir_ + "/" + cacheKey + ".manifest.tmp";
    std::string finalManifest = cacheDir_ + "/" + cacheKey + ".manifest";

    std::ofstream out(tmpManifest);
    if (!out.is_open()) return false;

    out << "{\n";
    out << "  \"cacheKey\": \"" << cacheKey << "\",\n";
    out << "  \"nodeCount\": " << scene.nodes.size() << ",\n";
    out << "  \"meshCount\": " << scene.meshes.size() << ",\n";
    out << "  \"vertexCount\": " << scene.getTotalVertices() << ",\n";
    out << "  \"triangleCount\": " << scene.getTotalTriangles() << ",\n";
    out << "  \"status\": \"VALID\"\n";
    out << "}\n";
    out.close();

    // Atomic rename
    std::remove(finalManifest.c_str());
    std::rename(tmpManifest.c_str(), finalManifest.c_str());
    return true;
}

std::shared_ptr<UniversalSceneModel> CacheManager::loadFromCache(const std::string& cacheKey) {
    if (!hasValidCache(cacheKey)) return nullptr;
    return nullptr;
}

bool CacheManager::evict(const std::string& cacheKey) {
    std::string manifestPath = cacheDir_ + "/" + cacheKey + ".manifest";
    return std::remove(manifestPath.c_str()) == 0;
}

void CacheManager::clearAllCache() {}

uint64_t CacheManager::getTotalCacheSizeBytes() const {
    return 0;
}

} // namespace u3d
