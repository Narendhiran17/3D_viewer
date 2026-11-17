cmake_minimum_required(VERSION 3.22)
project(Universal3DViewerCore VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(
    native/engine
    native/engine/core
    native/engine/scene
    native/engine/geometry
    native/engine/import
    native/engine/adapters/specialized
    native/engine/adapters/assimp
    native/engine/adapters/occt
    native/engine/cache
    native/engine/diagnostics
    native/bridge/shared
)

set(ENGINE_SOURCES
    native/engine/core/FileDetector.cpp
    native/engine/scene/UniversalSceneModel.cpp
    native/engine/scene/SceneNormalizer.cpp
    native/engine/geometry/GeometryProcessor.cpp
    native/engine/import/ImportJobManager.cpp
    native/engine/adapters/specialized/StlAdapter.cpp
    native/engine/adapters/assimp/ObjAdapter.cpp
    native/engine/adapters/occt/StepAdapter.cpp
    native/engine/cache/CacheManager.cpp
)

add_library(u3d_engine STATIC ${ENGINE_SOURCES})

# Test executable
add_executable(u3d_tests native/engine/tests/EngineTests.cpp ${ENGINE_SOURCES})
