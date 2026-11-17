#include "SceneNormalizer.h"
#include <cmath>
#include <algorithm>

namespace u3d {

float SceneNormalizer::getScaleFactorToMeters(const std::string& unitName) {
    std::string u = unitName;
    std::transform(u.begin(), u.end(), u.begin(), [](unsigned char c) { return std::tolower(c); });

    if (u == "mm" || u == "millimeter" || u == "millimeters") return 0.001f;
    if (u == "cm" || u == "centimeter" || u == "centimeters") return 0.01f;
    if (u == "m" || u == "meter" || u == "meters") return 1.0f;
    if (u == "in" || u == "inch" || u == "inches") return 0.0254f;
    if (u == "ft" || u == "foot" || u == "feet") return 0.3048f;
    if (u == "yd" || u == "yard") return 0.9144f;
    if (u == "km") return 1000.0f;

    return 1.0f;
}

void SceneNormalizer::generateNormals(Primitive& prim) {
    auto& pos = prim.attributes.positions;
    auto& norm = prim.attributes.normals;
    norm.assign(pos.size(), 0.0f);

    size_t numTriangles = prim.indices.empty() ? (pos.size() / 9) : (prim.indices.size() / 3);

    for (size_t t = 0; t < numTriangles; ++t) {
        uint32_t i0, i1, i2;
        if (!prim.indices.empty()) {
            i0 = prim.indices[t * 3];
            i1 = prim.indices[t * 3 + 1];
            i2 = prim.indices[t * 3 + 2];
        } else {
            i0 = static_cast<uint32_t>(t * 3);
            i1 = static_cast<uint32_t>(t * 3 + 1);
            i2 = static_cast<uint32_t>(t * 3 + 2);
        }

        if (i0 * 3 + 2 >= pos.size() || i1 * 3 + 2 >= pos.size() || i2 * 3 + 2 >= pos.size()) continue;

        Vector3 v0{pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]};
        Vector3 v1{pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]};
        Vector3 v2{pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]};

        Vector3 edge1 = v1 - v0;
        Vector3 edge2 = v2 - v0;

        // Cross product edge1 x edge2
        Vector3 fn{
            edge1.y * edge2.z - edge1.z * edge2.y,
            edge1.z * edge2.x - edge1.x * edge2.z,
            edge1.x * edge2.y - edge1.y * edge2.x
        };

        // Accumulate face normal to vertex normals
        norm[i0 * 3] += fn.x; norm[i0 * 3 + 1] += fn.y; norm[i0 * 3 + 2] += fn.z;
        norm[i1 * 3] += fn.x; norm[i1 * 3 + 1] += fn.y; norm[i1 * 3 + 2] += fn.z;
        norm[i2 * 3] += fn.x; norm[i2 * 3 + 1] += fn.y; norm[i2 * 3 + 2] += fn.z;
    }

    // Normalize each normal
    for (size_t i = 0; i + 2 < norm.size(); i += 3) {
        Vector3 n{norm[i], norm[i + 1], norm[i + 2]};
        Vector3 nn = n.normalized();
        norm[i] = nn.x;
        norm[i + 1] = nn.y;
        norm[i + 2] = nn.z;
    }
}

bool SceneNormalizer::normalize(UniversalSceneModel& scene, const NormalizationOptions& options) {
    float scale = 1.0f;
    if (options.normalizeUnits && !scene.metadata.originalUnits.empty()) {
        scale = getScaleFactorToMeters(scene.metadata.originalUnits);
        scene.metadata.unitScaleToMeters = scale;
    }

    bool convertZUpToYUp = options.forceYUp && (scene.metadata.upAxis == "Z" || scene.metadata.sourceFormat == "STL" || scene.metadata.sourceFormat == "STEP" || scene.metadata.sourceFormat == "IGES");

    for (auto& mesh : scene.meshes) {
        for (auto& prim : mesh.primitives) {
            auto& pos = prim.attributes.positions;
            for (size_t i = 0; i + 2 < pos.size(); i += 3) {
                float x = pos[i] * scale;
                float y = pos[i + 1] * scale;
                float z = pos[i + 2] * scale;

                if (convertZUpToYUp) {
                    // Rotate -90 deg around X: (x, y, z) -> (x, z, -y)
                    pos[i] = x;
                    pos[i + 1] = z;
                    pos[i + 2] = -y;
                } else {
                    pos[i] = x;
                    pos[i + 1] = y;
                    pos[i + 2] = z;
                }
            }

            // Normal check / generation
            if (options.generateMissingNormals && prim.attributes.normals.empty()) {
                generateNormals(prim);
            } else if (convertZUpToYUp && !prim.attributes.normals.empty()) {
                auto& norm = prim.attributes.normals;
                for (size_t i = 0; i + 2 < norm.size(); i += 3) {
                    float nx = norm[i];
                    float ny = norm[i + 1];
                    float nz = norm[i + 2];
                    norm[i] = nx;
                    norm[i + 1] = nz;
                    norm[i + 2] = -ny;
                }
            }
        }
    }

    scene.metadata.upAxis = "Y";
    scene.updateTransformsAndBounds();
    return true;
}

} // namespace u3d
