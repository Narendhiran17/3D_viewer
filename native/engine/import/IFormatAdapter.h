#pragma once

#include "../core/Types.h"
#include "../scene/UniversalSceneModel.h"
#include <string>
#include <vector>
#include <memory>

namespace u3d {

struct ImportOptions {
    TessellationProfile tessellationProfile = TessellationProfile::Balanced;
    float linearTolerance = 0.1f;
    float angularTolerance = 0.5f;
    bool importMaterials = true;
    bool importHierarchy = true;
    bool importAnimations = false;
};

struct ImportResult {
    bool success = false;
    ErrorCode errorCode = ErrorCode::NONE;
    std::string errorMessage;
    std::vector<std::string> warnings;
    std::shared_ptr<UniversalSceneModel> scene;
};

class IFormatAdapter {
public:
    virtual ~IFormatAdapter() = default;
    virtual std::string getAdapterName() const = 0;
    virtual std::vector<std::string> getSupportedFormats() const = 0;
    virtual SupportLevel getSupportLevel(const std::string& format) const = 0;
    virtual ImportResult importModel(const std::string& filePath, const ImportOptions& options) = 0;
};

} // namespace u3d
