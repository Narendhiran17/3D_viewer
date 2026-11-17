#pragma once

#include "../../import/IFormatAdapter.h"

namespace u3d {

class StepAdapter : public IFormatAdapter {
public:
    std::string getAdapterName() const override { return "OcctCadStepAdapter"; }
    std::vector<std::string> getSupportedFormats() const override { return {"STEP", "STP", "IGES", "IGS"}; }
    SupportLevel getSupportLevel(const std::string& format) const override { return SupportLevel::Partial; }
    ImportResult importModel(const std::string& filePath, const ImportOptions& options) override;

private:
    void generateCylinderTessellation(Primitive& prim, float radius, float height, uint32_t segments, const Vector3& center);
    void generateBoxTessellation(Primitive& prim, const Vector3& size, const Vector3& center);
};

} // namespace u3d
