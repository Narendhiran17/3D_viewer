#pragma once

#include "../../engine/core/Types.h"
#include "../../engine/scene/UniversalSceneModel.h"
#include "../../engine/import/ImportJobManager.h"
#include <string>
#include <memory>
#include <functional>

namespace u3d {

class ViewerEngineInterface {
public:
    virtual ~ViewerEngineInterface() = default;

    virtual std::string openFile(const std::string& uri, const ImportOptions& options) = 0;
    virtual void closeModel(const std::string& modelId) = 0;
    virtual void cancelImport(const std::string& jobId) = 0;
    virtual void resetCamera() = 0;
    virtual void setRenderMode(RenderMode mode) = 0;
    virtual void selectNode(std::optional<NodeId> nodeId) = 0;
    virtual std::vector<SceneNode> getHierarchy() = 0;
    virtual SceneMetadata getMetadata() = 0;

    // Platform event listeners
    virtual void setOnImportProgress(std::function<void(const std::string& jobId, const std::string& state, float progress)> cb) = 0;
    virtual void setOnImportCompleted(std::function<void(const ModelInfo& info)> cb) = 0;
    virtual void setOnImportWarning(std::function<void(const std::string& warning)> cb) = 0;
    virtual void setOnImportFailed(std::function<void(const std::string& errorCode, const std::string& message)> cb) = 0;
};

} // namespace u3d
