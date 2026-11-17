#include "GeometryProcessor.h"
#include <unordered_map>
#include <cmath>

namespace u3d {

BoundingBox GeometryProcessor::computeBoundingBox(const std::vector<float>& positions) {
    BoundingBox b;
    for (size_t i = 0; i + 2 < positions.size(); i += 3) {
        b.expand(Vector3{positions[i], positions[i + 1], positions[i + 2]});
    }
    return b;
}

void GeometryProcessor::deduplicatePrimitive(Primitive& prim, float threshold) {
    if (!prim.indices.empty() || prim.attributes.positions.empty()) return;

    const auto& pos = prim.attributes.positions;
    const auto& norm = prim.attributes.normals;
    const auto& uv = prim.attributes.uvs;

    bool hasNormals = (norm.size() == pos.size());
    bool hasUV = (uv.size() == (pos.size() / 3) * 2);

    std::vector<float> newPos;
    std::vector<float> newNorm;
    std::vector<float> newUV;
    std::vector<uint32_t> newIndices;

    // Spatial hash for welding
    float invStep = 1.0f / (threshold > 1e-6f ? threshold : 1e-5f);
    std::unordered_map<int64_t, std::vector<uint32_t>> spatialGrid;

    auto hashPos = [&](float x, float y, float z) -> int64_t {
        int64_t ix = static_cast<int64_t>(std::floor(x * invStep));
        int64_t iy = static_cast<int64_t>(std::floor(y * invStep));
        int64_t iz = static_cast<int64_t>(std::floor(z * invStep));
        return (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791);
    };

    size_t vertCount = pos.size() / 3;
    for (size_t i = 0; i < vertCount; ++i) {
        float x = pos[i * 3];
        float y = pos[i * 3 + 1];
        float z = pos[i * 3 + 2];

        int64_t h = hashPos(x, y, z);
        auto it = spatialGrid.find(h);
        int32_t foundIndex = -1;

        if (it != spatialGrid.end()) {
            for (uint32_t cand : it->second) {
                float dx = newPos[cand * 3] - x;
                float dy = newPos[cand * 3 + 1] - y;
                float dz = newPos[cand * 3 + 2] - z;
                if (std::abs(dx) <= threshold && std::abs(dy) <= threshold && std::abs(dz) <= threshold) {
                    foundIndex = static_cast<int32_t>(cand);
                    break;
                }
            }
        }

        if (foundIndex >= 0) {
            newIndices.push_back(static_cast<uint32_t>(foundIndex));
        } else {
            uint32_t newIdx = static_cast<uint32_t>(newPos.size() / 3);
            newPos.push_back(x);
            newPos.push_back(y);
            newPos.push_back(z);

            if (hasNormals) {
                newNorm.push_back(norm[i * 3]);
                newNorm.push_back(norm[i * 3 + 1]);
                newNorm.push_back(norm[i * 3 + 2]);
            }

            if (hasUV) {
                newUV.push_back(uv[i * 2]);
                newUV.push_back(uv[i * 2 + 1]);
            }

            spatialGrid[h].push_back(newIdx);
            newIndices.push_back(newIdx);
        }
    }

    prim.attributes.positions = std::move(newPos);
    if (hasNormals) prim.attributes.normals = std::move(newNorm);
    if (hasUV) prim.attributes.uvs = std::move(newUV);
    prim.indices = std::move(newIndices);
}

bool GeometryProcessor::optimize(UniversalSceneModel& scene, const GeometryOptimizationOptions& options) {
    for (auto& mesh : scene.meshes) {
        for (auto& prim : mesh.primitives) {
            if (options.deduplicateVertices && prim.indices.empty()) {
                deduplicatePrimitive(prim, options.positionWeldThreshold);
            }
        }
    }
    if (options.computeBounds) {
        scene.updateTransformsAndBounds();
    }
    return true;
}

} // namespace u3d
