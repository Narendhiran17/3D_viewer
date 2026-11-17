#pragma once

#include "../scene/UniversalSceneModel.h"

namespace u3d {

struct GeometryOptimizationOptions {
    bool deduplicateVertices = true;
    bool generateIndicesIfMissing = true;
    bool computeBounds = true;
    float positionWeldThreshold = 1e-5f;
};

class GeometryProcessor {
public:
    static bool optimize(UniversalSceneModel& scene, const GeometryOptimizationOptions& options = {});
    static void deduplicatePrimitive(Primitive& prim, float threshold = 1e-5f);
    static BoundingBox computeBoundingBox(const std::vector<float>& positions);
};

} // namespace u3d
