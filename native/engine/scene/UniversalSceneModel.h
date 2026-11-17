#pragma once

#include "../core/Types.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <optional>

namespace u3d {

using NodeId = uint32_t;
using MeshId = uint32_t;
using MaterialId = uint32_t;
using TextureId = uint32_t;

struct VertexAttribute {
    std::vector<float> positions; // x, y, z triplets
    std::vector<float> normals;   // nx, ny, nz
    std::vector<float> tangents;  // tx, ty, tz, tw
    std::vector<float> uvs;       // u, v pairs
    std::vector<float> colors;    // r, g, b, a
};

struct Primitive {
    std::vector<uint32_t> indices;
    VertexAttribute attributes;
    std::optional<MaterialId> materialId;
    BoundingBox bounds;
};

struct Mesh {
    MeshId id = 0;
    std::string name;
    std::vector<Primitive> primitives;
    BoundingBox bounds;

    uint32_t totalVertices() const {
        uint32_t total = 0;
        for (const auto& p : primitives) {
            total += static_cast<uint32_t>(p.attributes.positions.size() / 3);
        }
        return total;
    }

    uint32_t totalTriangles() const {
        uint32_t total = 0;
        for (const auto& p : primitives) {
            if (!p.indices.empty()) {
                total += static_cast<uint32_t>(p.indices.size() / 3);
            } else {
                total += static_cast<uint32_t>(p.attributes.positions.size() / 9);
            }
        }
        return total;
    }
};

struct Texture {
    TextureId id = 0;
    std::string uri;
    std::string mimeType;
    std::vector<uint8_t> embeddedData;
    uint32_t width = 0;
    uint32_t height = 0;
    bool sRGB = true;
};

struct Material {
    MaterialId id = 0;
    std::string name;
    Vector4 baseColorFactor{0.8f, 0.8f, 0.82f, 1.0f};
    float metallicFactor = 0.1f;
    float roughnessFactor = 0.6f;
    Vector3 emissiveFactor{0.0f, 0.0f, 0.0f};
    float opacity = 1.0f;
    bool doubleSided = false;
    bool wireframe = false;

    std::optional<TextureId> baseColorTexture;
    std::optional<TextureId> metallicRoughnessTexture;
    std::optional<TextureId> normalTexture;
    std::optional<TextureId> emissiveTexture;
    std::optional<TextureId> occlusionTexture;
};

struct SceneNode {
    NodeId id = 0;
    std::string name;
    std::optional<NodeId> parent;
    std::vector<NodeId> children;
    Transform localTransform;
    Matrix4x4 worldMatrix;
    std::vector<MeshId> meshIndices;
    bool visible = true;
    BoundingBox worldBounds;
};

struct MetadataItem {
    std::string key;
    std::string value;
};

struct SceneMetadata {
    std::string sourceFormat;
    std::string sourceVersion;
    std::string originalUnits = "m";
    float unitScaleToMeters = 1.0f;
    std::string upAxis = "Y";
    std::vector<MetadataItem> properties;
    std::unordered_map<std::string, std::string> customExtensions;
};

class UniversalSceneModel {
public:
    UniversalSceneModel();
    ~UniversalSceneModel() = default;

    std::string name;
    SceneMetadata metadata;
    std::vector<SceneNode> nodes;
    std::vector<Mesh> meshes;
    std::vector<Material> materials;
    std::vector<Texture> textures;
    BoundingBox sceneBounds;

    NodeId addNode(const std::string& name, std::optional<NodeId> parent = std::nullopt);
    MeshId addMesh(const Mesh& mesh);
    MaterialId addMaterial(const Material& material);
    TextureId addTexture(const Texture& texture);

    SceneNode* getNode(NodeId id);
    const SceneNode* getNode(NodeId id) const;
    Mesh* getMesh(MeshId id);
    const Mesh* getMesh(MeshId id) const;

    void updateTransformsAndBounds();
    uint32_t getTotalVertices() const;
    uint32_t getTotalTriangles() const;

    std::string serializeToJson() const;
};

} // namespace u3d
