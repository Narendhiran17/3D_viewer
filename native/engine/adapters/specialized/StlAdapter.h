#pragma once

#include "../../import/IFormatAdapter.h"

namespace u3d {

class StlAdapter : public IFormatAdapter {
public:
    std::string getAdapterName() const override { return "StlSpecializedAdapter"; }
    std::vector<std::string> getSupportedFormats() const override { return {"STL"}; }
    SupportLevel getSupportLevel(const std::string& format) const override { return SupportLevel::Basic; }
    ImportResult importModel(const std::string& filePath, const ImportOptions& options) override;

private:
    ImportResult importBinary(std::ifstream& file, const std::string& filePath);
    ImportResult importAscii(std::ifstream& file, const std::string& filePath);
};

} // namespace u3d
