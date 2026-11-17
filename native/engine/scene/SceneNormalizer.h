#pragma once

#include "UniversalSceneModel.h"

namespace u3d {

struct NormalizationOptions {
    bool forceYUp = true;
    bool normalizeUnits = true;
    std::string sourceUnit = "mm"; // Default for CAD/3D printing is often mm
    bool generateMissingNormals = true;
    bool recalculateTangents = true;
    bool centerPivot = true;
};

class SceneNormalizer {
public:
    static bool normalize(UniversalSceneModel& scene, const NormalizationOptions& options = {});
    static void generateNormals(Primitive& prim);
    static float getScaleFactorToMeters(const std::string& unitName);
};

} // namespace u3d
