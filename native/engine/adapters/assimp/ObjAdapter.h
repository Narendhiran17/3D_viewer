#pragma once

#include "../../import/IFormatAdapter.h"

namespace u3d {

class ObjAdapter : public IFormatAdapter {
public:
    std::string getAdapterName() const override { return "WavefrontObjAdapter"; }
    std::vector<std::string> getSupportedFormats() const override { return {"OBJ"}; }
    SupportLevel getSupportLevel(const std::string& format) const override { return SupportLevel::Advanced; }
    ImportResult importModel(const std::string& filePath, const ImportOptions& options) override;

private:
    void parseMtl(const std::string& mtlPath, UniversalSceneModel& scene, std::unordered_map<std::string, MaterialId>& matMap);
};

} // namespace u3d
