#include "ImportJobManager.h"
#include "../scene/SceneNormalizer.h"
#include "../geometry/GeometryProcessor.h"
#include <chrono>
#include <sstream>
#include <iomanip>

namespace u3d {

ImportJobManager& ImportJobManager::getInstance() {
    static ImportJobManager instance;
    return instance;
}

ImportJobManager::ImportJobManager() {}

void ImportJobManager::registerAdapter(std::shared_ptr<IFormatAdapter> adapter) {
    std::lock_guard<std::mutex> lock(mutex_);
    adapters_.push_back(adapter);
}

std::shared_ptr<IFormatAdapter> ImportJobManager::findAdapterForFormat(const std::string& format) {
    std::lock_guard<std::mutex> lock(mutex_);
    for (const auto& a : adapters_) {
        for (const auto& f : a->getSupportedFormats()) {
            if (f == format) return a;
        }
    }
    return nullptr;
}

std::string ImportJobManager::createJob(const std::string& sourceUri) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto now = std::chrono::system_clock::now().time_since_epoch().count();
    std::ostringstream ss;
    ss << "job_" << now << "_" << (jobs_.size() + 1);
    std::string jobId = ss.str();

    auto job = std::make_shared<ImportJob>();
    job->jobId = jobId;
    job->sourceUri = sourceUri;
    job->state = ImportJobState::QUEUED;
    job->progress = 0.0f;

    jobs_[jobId] = job;
    return jobId;
}

std::shared_ptr<ImportJob> ImportJobManager::getJob(const std::string& jobId) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = jobs_.find(jobId);
    if (it != jobs_.end()) return it->second;
    return nullptr;
}

bool ImportJobManager::cancelJob(const std::string& jobId) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = jobs_.find(jobId);
    if (it == jobs_.end()) return false;
    it->second->cancelRequested = true;
    it->second->state = ImportJobState::CANCELLED;
    it->second->errorCode = ErrorCode::CANCELLED;
    it->second->errorMessage = "Import was cancelled by user.";
    if (progressCb_) progressCb_(jobId, ImportJobState::CANCELLED, it->second->progress);
    return true;
}

void ImportJobManager::transitionState(std::shared_ptr<ImportJob> job, ImportJobState newState, float progress) {
    job->state = newState;
    job->progress = progress;
    if (progressCb_) {
        progressCb_(job->jobId, newState, progress);
    }
}

bool ImportJobManager::startJob(const std::string& jobId, const ImportOptions& options) {
    auto job = getJob(jobId);
    if (!job) return false;

    // 1. VALIDATING
    transitionState(job, ImportJobState::VALIDATING, 0.1f);
    if (job->cancelRequested) return false;

    // 2. DETECTING
    transitionState(job, ImportJobState::DETECTING, 0.2f);
    DetectionResult detectRes = FileDetector::detectFromFile(job->sourceUri);
    job->detectedFormat = detectRes.format;

    if (detectRes.estimatedSupport == SupportLevel::Unsupported || detectRes.format == "UNKNOWN") {
        job->state = ImportJobState::FAILED;
        job->errorCode = ErrorCode::UNSUPPORTED_FORMAT;
        job->errorMessage = "The format '" + detectRes.format + "' is not supported by Universal 3D Viewer.";
        if (errorCb_) errorCb_(jobId, job->errorCode, job->errorMessage);
        return false;
    }

    auto adapter = findAdapterForFormat(detectRes.format);
    if (!adapter) {
        job->state = ImportJobState::FAILED;
        job->errorCode = ErrorCode::IMPORTER_UNAVAILABLE;
        job->errorMessage = "No adapter available to process format: " + detectRes.format;
        if (errorCb_) errorCb_(jobId, job->errorCode, job->errorMessage);
        return false;
    }

    // 3. IMPORTING
    transitionState(job, ImportJobState::IMPORTING, 0.4f);
    if (job->cancelRequested) return false;

    ImportResult importRes = adapter->importModel(job->sourceUri, options);
    if (!importRes.success || !importRes.scene) {
        job->state = ImportJobState::FAILED;
        job->errorCode = importRes.errorCode != ErrorCode::NONE ? importRes.errorCode : ErrorCode::IMPORT_FAILED;
        job->errorMessage = importRes.errorMessage.empty() ? "Failed to parse 3D model." : importRes.errorMessage;
        job->warnings = importRes.warnings;
        if (errorCb_) errorCb_(jobId, job->errorCode, job->errorMessage);
        return false;
    }

    job->loadedScene = importRes.scene;
    job->warnings = importRes.warnings;

    // 4. NORMALIZING
    transitionState(job, ImportJobState::NORMALIZING, 0.65f);
    if (job->cancelRequested) return false;

    SceneNormalizer::normalize(*job->loadedScene);

    // 5. OPTIMIZING
    transitionState(job, ImportJobState::OPTIMIZING, 0.8f);
    if (job->cancelRequested) return false;

    GeometryProcessor::optimize(*job->loadedScene);

    // 6. CACHING
    transitionState(job, ImportJobState::CACHING, 0.95f);
    if (job->cancelRequested) return false;

    // Prepare ModelInfo
    job->modelInfo.modelId = job->jobId;
    job->modelInfo.fileName = job->sourceUri.substr(job->sourceUri.find_last_of("/\\") + 1);
    job->modelInfo.detectedFormat = detectRes.format;
    job->modelInfo.supportLevel = adapter->getSupportLevel(detectRes.format);
    job->modelInfo.nodeCount = static_cast<uint32_t>(job->loadedScene->nodes.size());
    job->modelInfo.meshCount = static_cast<uint32_t>(job->loadedScene->meshes.size());
    job->modelInfo.vertexCount = job->loadedScene->getTotalVertices();
    job->modelInfo.triangleCount = job->loadedScene->getTotalTriangles();
    job->modelInfo.bounds = job->loadedScene->sceneBounds;
    job->modelInfo.warnings = job->warnings;

    // 7. READY
    transitionState(job, ImportJobState::READY, 1.0f);
    if (completeCb_) {
        completeCb_(job->jobId, job->modelInfo, job->warnings);
    }

    return true;
}

} // namespace u3d
