#include "StlAdapter.h"
#include <fstream>
#include <sstream>
#include <iostream>

namespace u3d {

ImportResult StlAdapter::importModel(const std::string& filePath, const ImportOptions& options) {
    std::ifstream file(filePath, std::ios::binary);
    if (!file.is_open()) {
        ImportResult res;
        res.errorCode = ErrorCode::FILE_NOT_FOUND;
        res.errorMessage = "Could not open STL file at: " + filePath;
        return res;
    }

    char header[6] = {0};
    file.read(header, 5);
    file.seekg(0, std::ios::beg);

    if (std::string(header) == "solid") {
        // Could be ASCII or binary STL starting with word solid
        // Check file size vs triangle count
        file.seekg(80, std::ios::beg);
        uint32_t numTriangles = 0;
        file.read(reinterpret_cast<char*>(&numTriangles), 4);
        file.seekg(0, std::ios::end);
        size_t fileSize = file.tellg();
        file.seekg(0, std::ios::beg);

        if (fileSize == 84 + size_t(numTriangles) * 50) {
            return importBinary(file, filePath);
        } else {
            return importAscii(file, filePath);
        }
    } else {
        return importBinary(file, filePath);
    }
}

ImportResult StlAdapter::importBinary(std::ifstream& file, const std::string& filePath) {
    ImportResult res;
    file.seekg(80, std::ios::beg);
    uint32_t numTriangles = 0;
    file.read(reinterpret_cast<char*>(&numTriangles), 4);

    if (numTriangles > 20000000) {
        res.errorCode = ErrorCode::RESOURCE_LIMIT_EXCEEDED;
        res.errorMessage = "STL triangle count exceeds safety threshold (20M).";
        return res;
    }

    auto scene = std::make_shared<UniversalSceneModel>();
    scene->name = filePath.substr(filePath.find_last_of("/\\") + 1);
    scene->metadata.sourceFormat = "STL";
    scene->metadata.originalUnits = "mm";
    scene->metadata.upAxis = "Z";

    Material defaultMat;
    defaultMat.name = "STL_Default_Material";
    defaultMat.baseColorFactor = Vector4{0.75f, 0.78f, 0.82f, 1.0f};
    defaultMat.metallicFactor = 0.2f;
    defaultMat.roughnessFactor = 0.5f;
    MaterialId matId = scene->addMaterial(defaultMat);

    Mesh mesh;
    mesh.name = "STL_Mesh";
    Primitive prim;
    prim.materialId = matId;

    prim.attributes.positions.reserve(numTriangles * 9);
    prim.attributes.normals.reserve(numTriangles * 9);

    for (uint32_t i = 0; i < numTriangles; ++i) {
        float norm[3];
        float v1[3], v2[3], v3[3];
        uint16_t attrByteCount;

        file.read(reinterpret_cast<char*>(norm), 12);
        file.read(reinterpret_cast<char*>(v1), 12);
        file.read(reinterpret_cast<char*>(v2), 12);
        file.read(reinterpret_cast<char*>(v3), 12);
        file.read(reinterpret_cast<char*>(&attrByteCount), 2);

        prim.attributes.positions.push_back(v1[0]); prim.attributes.positions.push_back(v1[1]); prim.attributes.positions.push_back(v1[2]);
        prim.attributes.positions.push_back(v2[0]); prim.attributes.positions.push_back(v2[1]); prim.attributes.positions.push_back(v2[2]);
        prim.attributes.positions.push_back(v3[0]); prim.attributes.positions.push_back(v3[1]); prim.attributes.positions.push_back(v3[2]);

        for (int k = 0; k < 3; ++k) {
            prim.attributes.normals.push_back(norm[0]);
            prim.attributes.normals.push_back(norm[1]);
            prim.attributes.normals.push_back(norm[2]);
        }
    }

    mesh.primitives.push_back(prim);
    MeshId meshId = scene->addMesh(mesh);

    NodeId rootNode = scene->addNode("RootNode");
    scene->getNode(rootNode)->meshIndices.push_back(meshId);

    res.success = true;
    res.scene = scene;
    res.warnings.push_back("STL format contains geometry only; materials and scene hierarchy are synthesized.");
    return res;
}

ImportResult StlAdapter::importAscii(std::ifstream& file, const std::string& filePath) {
    ImportResult res;
    auto scene = std::make_shared<UniversalSceneModel>();
    scene->name = filePath.substr(filePath.find_last_of("/\\") + 1);
    scene->metadata.sourceFormat = "STL";
    scene->metadata.originalUnits = "mm";
    scene->metadata.upAxis = "Z";

    Material defaultMat;
    defaultMat.name = "STL_Default_Material";
    defaultMat.baseColorFactor = Vector4{0.75f, 0.78f, 0.82f, 1.0f};
    MaterialId matId = scene->addMaterial(defaultMat);

    Mesh mesh;
    mesh.name = "STL_Mesh";
    Primitive prim;
    prim.materialId = matId;

    std::string line, token;
    float nx = 0, ny = 0, nz = 0;

    while (std::getline(file, line)) {
        std::istringstream iss(line);
        if (!(iss >> token)) continue;

        if (token == "facet" && iss >> token && token == "normal") {
            iss >> nx >> ny >> nz;
        } else if (token == "vertex") {
            float vx, vy, vz;
            iss >> vx >> vy >> vz;
            prim.attributes.positions.push_back(vx);
            prim.attributes.positions.push_back(vy);
            prim.attributes.positions.push_back(vz);

            prim.attributes.normals.push_back(nx);
            prim.attributes.normals.push_back(ny);
            prim.attributes.normals.push_back(nz);
        }
    }

    mesh.primitives.push_back(prim);
    MeshId meshId = scene->addMesh(mesh);

    NodeId rootNode = scene->addNode("RootNode");
    scene->getNode(rootNode)->meshIndices.push_back(meshId);

    res.success = true;
    res.scene = scene;
    res.warnings.push_back("Imported ASCII STL. Notice: ASCII format does not store colors or hierarchy.");
    return res;
}

} // namespace u3d
