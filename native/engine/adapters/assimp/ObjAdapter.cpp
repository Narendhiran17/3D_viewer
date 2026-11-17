#include "ObjAdapter.h"
#include <fstream>
#include <sstream>
#include <iostream>

namespace u3d {

void ObjAdapter::parseMtl(const std::string& mtlPath, UniversalSceneModel& scene, std::unordered_map<std::string, MaterialId>& matMap) {
    std::ifstream file(mtlPath);
    if (!file.is_open()) return;

    std::string line, token;
    Material currentMat;
    bool hasMat = false;

    while (std::getline(file, line)) {
        std::istringstream iss(line);
        if (!(iss >> token)) continue;

        if (token == "newmtl") {
            if (hasMat) {
                MaterialId id = scene.addMaterial(currentMat);
                matMap[currentMat.name] = id;
            }
            std::string name;
            iss >> name;
            currentMat = Material();
            currentMat.name = name;
            hasMat = true;
        } else if (token == "Kd" && hasMat) {
            float r, g, b;
            iss >> r >> g >> b;
            currentMat.baseColorFactor = Vector4{r, g, b, 1.0f};
        } else if (token == "d" && hasMat) {
            float d;
            iss >> d;
            currentMat.opacity = d;
            currentMat.baseColorFactor.w = d;
        } else if (token == "Pm" && hasMat) {
            iss >> currentMat.metallicFactor;
        } else if (token == "Pr" && hasMat) {
            iss >> currentMat.roughnessFactor;
        }
    }
    if (hasMat) {
        MaterialId id = scene.addMaterial(currentMat);
        matMap[currentMat.name] = id;
    }
}

ImportResult ObjAdapter::importModel(const std::string& filePath, const ImportOptions& options) {
    ImportResult res;
    std::ifstream file(filePath);
    if (!file.is_open()) {
        res.errorCode = ErrorCode::FILE_NOT_FOUND;
        res.errorMessage = "Could not open OBJ file: " + filePath;
        return res;
    }

    auto scene = std::make_shared<UniversalSceneModel>();
    scene->name = filePath.substr(filePath.find_last_of("/\\") + 1);
    scene->metadata.sourceFormat = "OBJ";
    scene->metadata.originalUnits = "m";
    scene->metadata.upAxis = "Y";

    std::string baseDir = "";
    size_t lastSlash = filePath.find_last_of("/\\");
    if (lastSlash != std::string::npos) {
        baseDir = filePath.substr(0, lastSlash + 1);
    }

    std::unordered_map<std::string, MaterialId> materialMap;
    std::vector<Vector3> rawPositions;
    std::vector<Vector3> rawNormals;
    std::vector<std::pair<float, float>> rawUVs;

    Mesh mesh;
    mesh.name = "OBJ_MainMesh";
    Primitive currentPrim;

    std::string line, token;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::istringstream iss(line);
        if (!(iss >> token)) continue;

        if (token == "mtllib") {
            std::string mtlFile;
            iss >> mtlFile;
            parseMtl(baseDir + mtlFile, *scene, materialMap);
        } else if (token == "usemtl") {
            std::string mtlName;
            iss >> mtlName;
            if (materialMap.find(mtlName) != materialMap.end()) {
                currentPrim.materialId = materialMap[mtlName];
            }
        } else if (token == "v") {
            float x, y, z;
            iss >> x >> y >> z;
            rawPositions.push_back({x, y, z});
        } else if (token == "vn") {
            float nx, ny, nz;
            iss >> nx >> ny >> nz;
            rawNormals.push_back({nx, ny, nz});
        } else if (token == "vt") {
            float u, v;
            iss >> u >> v;
            rawUVs.push_back({u, v});
        } else if (token == "f") {
            std::string vertDef;
            std::vector<std::string> faceTokens;
            while (iss >> vertDef) {
                faceTokens.push_back(vertDef);
            }

            // Fan triangulation for convex polygons (quads, etc.)
            for (size_t i = 1; i + 1 < faceTokens.size(); ++i) {
                const std::string* tri[3] = {&faceTokens[0], &faceTokens[i], &faceTokens[i + 1]};
                for (int k = 0; k < 3; ++k) {
                    int vIdx = 0, vtIdx = 0, vnIdx = 0;
                    std::sscanf(tri[k]->c_str(), "%d/%d/%d", &vIdx, &vtIdx, &vnIdx);
                    if (vIdx == 0) std::sscanf(tri[k]->c_str(), "%d//%d", &vIdx, &vnIdx);
                    if (vIdx == 0) std::sscanf(tri[k]->c_str(), "%d/%d", &vIdx, &vtIdx);
                    if (vIdx == 0) std::sscanf(tri[k]->c_str(), "%d", &vIdx);

                    // 1-based indexing in OBJ
                    if (vIdx > 0 && size_t(vIdx) <= rawPositions.size()) {
                        const auto& p = rawPositions[vIdx - 1];
                        currentPrim.attributes.positions.push_back(p.x);
                        currentPrim.attributes.positions.push_back(p.y);
                        currentPrim.attributes.positions.push_back(p.z);
                    }
                    if (vnIdx > 0 && size_t(vnIdx) <= rawNormals.size()) {
                        const auto& n = rawNormals[vnIdx - 1];
                        currentPrim.attributes.normals.push_back(n.x);
                        currentPrim.attributes.normals.push_back(n.y);
                        currentPrim.attributes.normals.push_back(n.z);
                    }
                    if (vtIdx > 0 && size_t(vtIdx) <= rawUVs.size()) {
                        const auto& uv = rawUVs[vtIdx - 1];
                        currentPrim.attributes.uvs.push_back(uv.first);
                        currentPrim.attributes.uvs.push_back(uv.second);
                    }
                }
            }
        }
    }

    if (!currentPrim.materialId.has_value()) {
        Material defaultMat;
        defaultMat.name = "Default_OBJ_Material";
        defaultMat.baseColorFactor = Vector4{0.7f, 0.72f, 0.75f, 1.0f};
        defaultMat.metallicFactor = 0.2f;
        defaultMat.roughnessFactor = 0.5f;
        currentPrim.materialId = scene->addMaterial(defaultMat);
    }

    mesh.primitives.push_back(currentPrim);
    MeshId meshId = scene->addMesh(mesh);

    NodeId root = scene->addNode("RootNode");
    scene->getNode(root)->meshIndices.push_back(meshId);

    res.success = true;
    res.scene = scene;
    return res;
}

} // namespace u3d
