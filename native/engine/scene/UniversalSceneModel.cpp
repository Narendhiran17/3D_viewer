#include "UniversalSceneModel.h"
#include <sstream>

namespace u3d {

UniversalSceneModel::UniversalSceneModel() {
    metadata.sourceFormat = "UNKNOWN";
    metadata.sourceVersion = "1.0";
}

NodeId UniversalSceneModel::addNode(const std::string& nodeName, std::optional<NodeId> parent) {
    NodeId newId = static_cast<NodeId>(nodes.size());
    SceneNode node;
    node.id = newId;
    node.name = nodeName.empty() ? ("Node_" + std::to_string(newId)) : nodeName;
    node.parent = parent;

    if (parent.has_value() && parent.value() < nodes.size()) {
        nodes[parent.value()].children.push_back(newId);
    }

    nodes.push_back(node);
    return newId;
}

MeshId UniversalSceneModel::addMesh(const Mesh& mesh) {
    MeshId id = static_cast<MeshId>(meshes.size());
    Mesh copy = mesh;
    copy.id = id;
    meshes.push_back(copy);
    return id;
}

MaterialId UniversalSceneModel::addMaterial(const Material& material) {
    MaterialId id = static_cast<MaterialId>(materials.size());
    Material copy = material;
    copy.id = id;
    materials.push_back(copy);
    return id;
}

TextureId UniversalSceneModel::addTexture(const Texture& texture) {
    TextureId id = static_cast<TextureId>(textures.size());
    Texture copy = texture;
    copy.id = id;
    textures.push_back(copy);
    return id;
}

SceneNode* UniversalSceneModel::getNode(NodeId id) {
    if (id < nodes.size()) return &nodes[id];
    return nullptr;
}

const SceneNode* UniversalSceneModel::getNode(NodeId id) const {
    if (id < nodes.size()) return &nodes[id];
    return nullptr;
}

Mesh* UniversalSceneModel::getMesh(MeshId id) {
    if (id < meshes.size()) return &meshes[id];
    return nullptr;
}

const Mesh* UniversalSceneModel::getMesh(MeshId id) const {
    if (id < meshes.size()) return &meshes[id];
    return nullptr;
}

void UniversalSceneModel::updateTransformsAndBounds() {
    sceneBounds = BoundingBox();

    // Compute bounding boxes for all meshes
    for (auto& mesh : meshes) {
        mesh.bounds = BoundingBox();
        for (auto& prim : mesh.primitives) {
            prim.bounds = BoundingBox();
            const auto& pos = prim.attributes.positions;
            for (size_t i = 0; i + 2 < pos.size(); i += 3) {
                Vector3 p{pos[i], pos[i + 1], pos[i + 2]};
                prim.bounds.expand(p);
                mesh.bounds.expand(p);
                sceneBounds.expand(p);
            }
        }
    }
}

uint32_t UniversalSceneModel::getTotalVertices() const {
    uint32_t count = 0;
    for (const auto& mesh : meshes) {
        count += mesh.totalVertices();
    }
    return count;
}

uint32_t UniversalSceneModel::getTotalTriangles() const {
    uint32_t count = 0;
    for (const auto& mesh : meshes) {
        count += mesh.totalTriangles();
    }
    return count;
}

std::string UniversalSceneModel::serializeToJson() const {
    std::ostringstream ss;
    ss << "{\n";
    ss << "  \"name\": \"" << name << "\",\n";
    ss << "  \"format\": \"" << metadata.sourceFormat << "\",\n";
    ss << "  \"units\": \"" << metadata.originalUnits << "\",\n";
    ss << "  \"nodeCount\": " << nodes.size() << ",\n";
    ss << "  \"meshCount\": " << meshes.size() << ",\n";
    ss << "  \"materialCount\": " << materials.size() << ",\n";
    ss << "  \"totalVertices\": " << getTotalVertices() << ",\n";
    ss << "  \"totalTriangles\": " << getTotalTriangles() << ",\n";
    ss << "  \"bounds\": {\n";
    ss << "    \"min\": [" << sceneBounds.min.x << ", " << sceneBounds.min.y << ", " << sceneBounds.min.z << "],\n";
    ss << "    \"max\": [" << sceneBounds.max.x << ", " << sceneBounds.max.y << ", " << sceneBounds.max.z << "],\n";
    ss << "    \"size\": [" << sceneBounds.size().x << ", " << sceneBounds.size().y << ", " << sceneBounds.size().z << "]\n";
    ss << "  }\n";
    ss << "}";
    return ss.str();
}

} // namespace u3d
