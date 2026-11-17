#pragma once

#include "IFormatAdapter.h"
#include "../core/FileDetector.h"
#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <mutex>
#include <atomic>
#include <functional>

namespace u3d {

struct ImportJob {
    std::string jobId;
    std::string sourceUri;
    std::string detectedFormat;
    ImportJobState state = ImportJobState::QUEUED;
    float progress = 0.0f; // 0.0 to 1.0
    ErrorCode errorCode = ErrorCode::NONE;
    std::string errorMessage;
    std::vector<std::string> warnings;
    std::atomic<bool> cancelRequested{false};
    ModelInfo modelInfo;
    std::shared_ptr<UniversalSceneModel> loadedScene;
};

using JobProgressCallback = std::function<void(const std::string& jobId, ImportJobState state, float progress)>;
using JobCompleteCallback = std::function<void(const std::string& jobId, const ModelInfo& info, const std::vector<std::string>& warnings)>;
using JobErrorCallback = std::function<void(const std::string& jobId, ErrorCode code, const std::string& message)>;

class ImportJobManager {
public:
    static ImportJobManager& getInstance();

    void registerAdapter(std::shared_ptr<IFormatAdapter> adapter);
    std::shared_ptr<IFormatAdapter> findAdapterForFormat(const std::string& format);

    std::string createJob(const std::string& sourceUri);
    bool startJob(const std::string& jobId, const ImportOptions& options = {});
    bool cancelJob(const std::string& jobId);

    std::shared_ptr<ImportJob> getJob(const std::string& jobId);

    void setProgressCallback(JobProgressCallback cb) { progressCb_ = cb; }
    void setCompleteCallback(JobCompleteCallback cb) { completeCb_ = cb; }
    void setErrorCallback(JobErrorCallback cb) { errorCb_ = cb; }

private:
    ImportJobManager();
    ~ImportJobManager() = default;

    std::mutex mutex_;
    std::unordered_map<std::string, std::shared_ptr<ImportJob>> jobs_;
    std::vector<std::shared_ptr<IFormatAdapter>> adapters_;

    JobProgressCallback progressCb_;
    JobCompleteCallback completeCb_;
    JobErrorCallback errorCb_;

    void transitionState(std::shared_ptr<ImportJob> job, ImportJobState newState, float progress);
};

} // namespace u3d
