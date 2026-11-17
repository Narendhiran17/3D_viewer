#include "../core/FileDetector.h"
#include "../core/Types.h"
#include "../scene/UniversalSceneModel.h"
#include "../scene/SceneNormalizer.h"
#include "../geometry/GeometryProcessor.h"
#include "../import/ImportJobManager.h"
#include "../adapters/specialized/StlAdapter.h"
#include "../adapters/assimp/ObjAdapter.h"
#include "../adapters/occt/StepAdapter.h"
#include <iostream>
#include <cassert>

using namespace u3d;

void testFileDetector() {
    std::cout << "[TEST] Running FileDetector tests..." << std::endl;
    std::vector<uint8_t> glbHeader = {'g', 'l', 'T', 'F', 0x02, 0x00, 0x00, 0x00};
    auto glbRes = FileDetector::detect("model.glb", glbHeader, "glb");
    assert(glbRes.format == "GLB");
    assert(glbRes.estimatedSupport == SupportLevel::Advanced);

    std::vector<uint8_t> stlHeader = {'s', 'o', 'l', 'i', 'd', ' '};
    auto stlRes = FileDetector::detect("bracket.stl", stlHeader, "stl");
    assert(stlRes.format == "STL");
    assert(stlRes.estimatedSupport == SupportLevel::Basic);

    std::cout << "  ✓ FileDetector tests passed." << std::endl;
}

void testSceneModel() {
    std::cout << "[TEST] Running UniversalSceneModel tests..." << std::endl;
    UniversalSceneModel scene;
    scene.name = "TestScene";

    Material mat;
    mat.name = "PBR_Mat";
    MaterialId matId = scene.addMaterial(mat);

    Mesh mesh;
    Primitive prim;
    prim.materialId = matId;
    prim.attributes.positions = {
        0.0f, 0.0f, 0.0f,
        1.0f, 0.0f, 0.0f,
        0.0f, 1.0f, 0.0f
    };
    mesh.primitives.push_back(prim);
    scene.addMesh(mesh);

    NodeId node = scene.addNode("Root");
    scene.getNode(node)->meshIndices.push_back(0);

    scene.updateTransformsAndBounds();

    assert(scene.getTotalVertices() == 3);
    assert(scene.getTotalTriangles() == 1);
    std::cout << "  ✓ UniversalSceneModel tests passed." << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "  Universal 3D Viewer - Native Test Suite" << std::endl;
    std::cout << "========================================" << std::endl;
    testFileDetector();
    testSceneModel();
    std::cout << "All native tests completed successfully." << std::endl;
    return 0;
}
