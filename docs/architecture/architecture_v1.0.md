# Universal 3D Viewer

## End-to-End Technical Architecture

**Document type:** Solution Architecture\
**Product:** Universal 3D Viewer\
**Platforms:** Android and iOS\
**Architecture:** Offline-first, cross-platform UI, shared native C++
processing core, native GPU rendering\
**Primary stack:** React Native + TypeScript + C++ + Google Filament\
**Status:** Proposed baseline architecture\
**Version:** 1.0\
**Date:** 16 November 2026

------------------------------------------------------------------------

## 1. Executive Summary

Universal 3D Viewer is an offline-first mobile application for opening,
viewing, inspecting, and managing 3D models from general-purpose 3D
tools, CAD systems, architecture tools, and 3D-printing workflows.

The application targets Android and iOS from a shared codebase. React
Native and TypeScript provide the application UI. A shared C++ engine
handles file identification, importer orchestration, scene
normalization, geometry processing, caching, and renderer coordination.
Google Filament provides the real-time rendering layer.

The system uses a **format-adapter architecture**. Each supported format
family is handled by an appropriate importer or conversion adapter.
Imported data is mapped into a versioned internal scene representation.
The renderer consumes this representation rather than depending directly
on each source format.

The product is designed to work without an account, backend, or internet
connection for its core viewing workflows. Cloud features may be added
later, but must remain optional.

### 1.1 Product goals

-   Open a broad range of common 3D and CAD exchange formats.
-   Render models consistently on Android and iOS.
-   Preserve the original imported file.
-   Support offline import, viewing, recent files, and local caching.
-   Preserve scene hierarchy, materials, transforms, units, and
    supported metadata.
-   Handle large or complex models without blocking the UI.
-   Add format support through isolated adapters.
-   Fail safely and explain unsupported or partially supported content.

### 1.2 Non-goals for the first release

-   Full CAD authoring or parametric editing.
-   Replacing professional CAD or DCC applications.
-   Guaranteed support for every proprietary native format.
-   Executing scripts, macros, plugins, or embedded code from imported
    files.
-   Mandatory cloud upload or account registration.
-   Full fidelity for every source application's shaders, constraints,
    simulations, or animation system.

------------------------------------------------------------------------

## 2. Architecture Principles

1.  **Offline-first:** Local file opening and viewing must not require
    network access.
2.  **Original preservation:** Never overwrite or mutate the user's
    source file.
3.  **Adapter isolation:** Format-specific logic stays inside importer
    adapters.
4.  **Renderer independence:** Importers produce normalized scene data,
    not renderer-specific objects.
5.  **Shared native core:** CPU-intensive processing is implemented in
    C++ and reused by both platforms where feasible.
6.  **Platform-native graphics lifecycle:** Android and iOS own their
    surface, lifecycle, and GPU-context integration.
7.  **Bounded resource use:** Every import has time, memory, geometry,
    and archive-expansion budgets.
8.  **Explicit capability reporting:** The app distinguishes fully
    supported, partially supported, unsupported, and failed imports.
9.  **Versioned cache:** Cached assets are disposable and can be
    regenerated from the original.
10. **Tested compatibility:** A file extension alone does not establish
    format support.

------------------------------------------------------------------------

## 3. System Context

### 3.1 External actors and systems

-   **User:** Selects files, views models, changes display settings, and
    manages local history.
-   **Operating system file provider:** Provides document-picker access
    to local files and supported cloud-backed file providers.
-   **Device GPU:** Executes real-time rendering through Filament and
    platform graphics APIs.
-   **Optional future cloud services:** May provide backup, sharing, or
    server-side conversion, but are not required for MVP operation.

### 3.2 System context diagram

``` mermaid
flowchart TD
    U[User] --> APP[Universal 3D Viewer]
    OS[Android / iOS File Provider] --> APP
    APP --> CORE[Shared C++ 3D Core]
    CORE --> IMPORT[Format Import Adapters]
    IMPORT --> SCENE[Normalized Scene Model]
    SCENE --> RENDER[Filament Renderer]
    RENDER --> GPU[Device GPU]
    APP --> DB[SQLite Metadata Database]
    APP --> CACHE[Local Asset Cache]
    CORE --> CACHE
    CLOUD[Optional Future Cloud Services] -. optional .-> APP
```

------------------------------------------------------------------------

## 4. High-Level Architecture

The solution is divided into six major layers.

### 4.1 Presentation layer

**Technology:** React Native + TypeScript

Responsibilities:

-   Home and recent-files screens.
-   Document picker entry points.
-   Viewer controls and toolbars.
-   Model hierarchy and properties panels.
-   Import progress and error presentation.
-   Settings, preferences, and cache management.
-   Accessibility and localization.
-   Routing and application state.

The JavaScript layer must not own large geometry buffers or perform
expensive mesh processing.

### 4.2 Native integration layer

**Technology:** React Native Fabric Native Components, TurboModules/JSI
where appropriate, Kotlin, Swift, Objective-C++, JNI.

Responsibilities:

-   Expose the native rendering view to React Native.
-   Forward high-level commands and events.
-   Manage platform file URIs and file permissions.
-   Coordinate native lifecycle events.
-   Marshal compact metadata and identifiers.
-   Keep large binary geometry data inside native memory.

Use a Fabric Native Component for the embedded rendering surface. Use a
TurboModule or a carefully scoped JSI interface for asynchronous engine
operations. Do not pass large vertex/index arrays through JavaScript.

### 4.3 Shared C++ engine layer

Responsibilities:

-   File signature detection.
-   Import job scheduling.
-   Importer selection and capability reporting.
-   Scene normalization.
-   Geometry validation and optimization.
-   Unit and coordinate-system normalization.
-   Texture and material asset management.
-   Scene hierarchy and selection identifiers.
-   Cache coordination.
-   Renderer-neutral scene representation.
-   Diagnostics and telemetry stored locally.

### 4.4 Format adapter layer

Each adapter implements a common importer contract. Initial adapter
families:

-   Assimp: general-purpose mesh and scene formats.
-   OCCT: STEP and IGES CAD exchange formats.
-   OpenUSD: USD, USDA, USDC and related workflows.
-   Specialized adapters: 3MF, IFC, VRM, or other formats where
    dedicated handling is required.
-   Future licensed adapters: proprietary formats such as DWG or native
    CAD project files.

### 4.5 Rendering layer

**Technology:** Google Filament

Responsibilities:

-   GPU resource creation and destruction.
-   Scene rendering.
-   Camera and projection.
-   Lighting and environment.
-   Materials and textures.
-   Picking and selection support.
-   Render modes such as shaded, textured, and wireframe where
    implemented.
-   Surface resizing and lifecycle handling.

Filament is a renderer, not a universal importer. Import and conversion
remain separate responsibilities.

### 4.6 Local persistence layer

**Technology:** SQLite plus filesystem-managed assets.

Stores:

-   Recent file records.
-   Favorites.
-   User preferences.
-   Import status and capability reports.
-   Cache indexes and version metadata.
-   Thumbnail locations.
-   Last-viewed camera settings, if enabled.

Original model files remain in their original user-selected locations
unless the user explicitly imports or copies them into app-managed
storage.

------------------------------------------------------------------------

## 5. Component Architecture

``` mermaid
flowchart TB
    subgraph UI[React Native UI]
        HOME[Home / Library]
        VIEW[Viewer Screen]
        INSPECT[Hierarchy / Inspector]
        SETTINGS[Settings]
    end

    subgraph BRIDGE[Native Integration]
        FABRIC[Fabric Viewer Component]
        MODULE[TurboModule / JSI API]
        FILES[Platform File Access]
    end

    subgraph CORE[Shared C++ Core]
        DETECT[File Detector]
        JOB[Import Job Manager]
        NORMAL[Scene Normalizer]
        GEOM[Geometry Processor]
        CACHE[Cache Manager]
        META[Metadata / Capability Reporter]
    end

    subgraph ADAPTERS[Format Adapters]
        ASSIMP[Assimp Adapter]
        OCCT[OCCT Adapter]
        USD[OpenUSD Adapter]
        SPECIAL[Specialized Adapters]
    end

    subgraph RENDER[Rendering]
        SCENE[Renderer Scene Resources]
        FILAMENT[Filament]
        GPU[GPU]
    end

    subgraph DATA[Local Data]
        SQLITE[(SQLite)]
        FS[(App Cache / Thumbnails)]
        SOURCE[(Original User Files)]
    end

    UI --> BRIDGE
    FILES --> JOB
    MODULE --> JOB
    FABRIC --> FILAMENT
    JOB --> DETECT
    DETECT --> ASSIMP
    DETECT --> OCCT
    DETECT --> USD
    DETECT --> SPECIAL
    ASSIMP --> NORMAL
    OCCT --> NORMAL
    USD --> NORMAL
    SPECIAL --> NORMAL
    NORMAL --> GEOM
    GEOM --> CACHE
    NORMAL --> META
    NORMAL --> SCENE
    SCENE --> FILAMENT
    FILAMENT --> GPU
    HOME --> SQLITE
    CACHE --> FS
    FILES --> SOURCE
    META --> SQLITE
```

------------------------------------------------------------------------

## 6. End-to-End File Import Workflow

### 6.1 Import sequence

1.  User taps **Open Model**.
2.  React Native requests a document selection.
3.  Native platform file picker returns a URI and access grant.
4.  Native file-access service opens a read-only stream or stages the
    file in app-controlled temporary storage.
5.  File detector reads magic bytes and container signatures; extension
    is only a hint.
6.  Archive/container validation runs before extraction.
7.  Import manager selects an adapter based on detected format and
    available capabilities.
8.  Adapter parses source data under resource limits.
9.  Scene normalizer maps geometry, hierarchy, transforms, units,
    materials, textures, animation and metadata into the internal scene
    model.
10. Geometry processor validates and optionally optimizes the scene.
11. Cache manager writes versioned intermediate assets and a manifest
    atomically.
12. Renderer creates Filament resources on the correct rendering thread.
13. Viewer reports success or partial-support warnings to the UI.
14. SQLite stores recent-file metadata and cache references.

### 6.2 Import sequence diagram

``` mermaid
sequenceDiagram
    actor User
    participant UI as React Native UI
    participant OS as Platform File Picker
    participant Core as C++ Import Core
    participant Detect as File Detector
    participant Adapter as Format Adapter
    participant Scene as Scene Normalizer
    participant Cache as Cache Manager
    participant Render as Filament Renderer
    participant DB as SQLite

    User->>UI: Open model
    UI->>OS: Request document
    OS-->>UI: URI + access grant
    UI->>Core: openFile(uri)
    Core->>Detect: Inspect signature and container
    Detect-->>Core: Detected format
    Core->>Adapter: Import validated source
    Adapter-->>Core: Source scene data
    Core->>Scene: Normalize scene
    Scene-->>Core: Normalized scene
    Core->>Cache: Persist cache + manifest
    Cache-->>Core: Cache ready
    Core->>Render: Create renderer resources
    Render-->>UI: Model ready event
    Core->>DB: Save history and metadata
    UI-->>User: Display model
```

### 6.3 Import job states

Use an explicit state machine:

``` text
QUEUED
  -> VALIDATING
  -> DETECTING
  -> IMPORTING
  -> NORMALIZING
  -> OPTIMIZING
  -> CACHING
  -> READY

Any active state may transition to:
  -> CANCELLED
  -> FAILED

READY may transition to:
  -> EVICTED (cache removed)
```

Each job should expose:

-   Job ID.
-   Source URI.
-   Detected format.
-   Current state.
-   Progress percentage when measurable.
-   Warnings.
-   Error code and safe user-facing message.
-   Cancellation support.
-   Resource usage statistics for diagnostics.

Do not invent progress percentages when an importer cannot report
meaningful progress.

------------------------------------------------------------------------

## 7. File Format Strategy and Compatibility

The product must distinguish format recognition, import capability,
feature fidelity, and tested support.

### 7.1 Proposed format matrix

  ---------------------------------------------------------------------------
  Format / family  Candidate adapter        Initial priority Notes
  ---------------- ------------------- --------------------- ----------------
  GLB / glTF       Filament glTF path                     P0 Best canonical
                   or dedicated                              rendering path
                   adapter                                   

  OBJ              Assimp                                 P0 Companion MTL
                                                             and texture
                                                             paths

  STL              Assimp / custom                        P0 Often geometry
                                                             only

  PLY              Assimp / custom                        P0 Vertex colors
                                                             and point data
                                                             vary

  FBX              Assimp                                 P1 Feature fidelity
                                                             must be tested

  DAE / COLLADA    Assimp                                 P1 Validate
                                                             materials and
                                                             hierarchy

  3DS              Assimp                                 P1 Legacy format
                                                             limitations

  3MF              Dedicated / Assimp                     P1 Validate package
                   if suitable                               resources and
                                                             units

  STEP / STP       OCCT                                   P1 CAD B-Rep
                                                             tessellation

  IGES / IGS       OCCT                                   P2 Surface and
                                                             solid import

  USD / USDA /     OpenUSD                                P2 Scene
  USDC                                                       description and
                                                             composition

  USDZ             OpenUSD / package                      P2 Validate archive
                   adapter                                   and references

  IFC              IFC-specific                           P2 Building
                   adapter                                   information
                                                             semantics

  VRM              glTF/VRM-specific                      P2 Avatar
                   adapter                                   extensions and
                                                             animation

  DWG              Licensed SDK /                         P3 Licensing and
                   conversion                                vendor review

  Native           Licensed SDK /                         P3 Proprietary
  SolidWorks       conversion                                format

  BLEND            Blender conversion                     P3 Not a simple
                   workflow                                  generic mesh
                                                             import
  ---------------------------------------------------------------------------

P0/P1/P2/P3 are implementation priorities, not claims of complete
compatibility.

### 7.2 Format support levels

Every format must have a published support level:

-   **Recognized:** File is identified, but not necessarily importable.
-   **Basic:** Geometry can be imported and displayed.
-   **Partial:** Geometry displays, but some features may be lost.
-   **Advanced:** Tested hierarchy, materials, textures, units, and
    selected advanced features work.
-   **Unsupported:** No reliable importer is available.
-   **Failed:** A supported import was attempted but the file was
    invalid, damaged, or exceeded limits.

The UI should show warnings for missing or unsupported features.

### 7.3 Canonical output

Use the internal Universal Scene Model as the primary canonical
representation. GLB/glTF can be used as an interchange or cache
representation where it preserves the required features.

Do not force every source file through GLB. CAD B-Rep data, engineering
metadata, point clouds, and some USD scene semantics cannot be
faithfully represented by ordinary glTF meshes.

------------------------------------------------------------------------

## 8. Universal Scene Model

The Universal Scene Model (USM) is the renderer-neutral internal data
contract.

### 8.1 Core entities

-   `Scene`: root scene, metadata, units, coordinate system, bounds.
-   `Node`: hierarchy node, name, parent, children, local transform.
-   `Mesh`: vertex attributes, index buffers, primitive ranges.
-   `Material`: base color, metallic, roughness, opacity, texture slots.
-   `Texture`: image reference, color space, sampler and UV set.
-   `Animation`: channels, samplers, keyframes and targets.
-   `Camera`: projection and camera parameters when imported.
-   `Light`: supported light properties.
-   `Metadata`: source-format properties and preserved attributes.
-   `AssetReference`: original or cached external asset reference.

### 8.2 Conceptual C++ types

``` cpp
struct SceneId;
struct NodeId;
struct MeshId;
struct MaterialId;
struct TextureId;

struct Transform {
    Vector3 translation;
    Quaternion rotation;
    Vector3 scale;
};

struct Node {
    NodeId id;
    std::string name;
    std::optional<NodeId> parent;
    std::vector<NodeId> children;
    Transform localTransform;
    std::vector<MeshId> meshes;
};

struct Scene {
    std::string sourceFormat;
    std::string sourceVersion;
    std::string units;
    std::vector<Node> nodes;
    std::vector<Mesh> meshes;
    std::vector<Material> materials;
    std::vector<Texture> textures;
    Metadata metadata;
};
```

This is conceptual. Concrete types, ownership rules, buffer allocators,
and serialization must be defined in the engine implementation.

### 8.3 Coordinate and unit normalization

The engine must define a documented internal convention, for example:

-   Right-handed coordinate system.
-   Y-up.
-   Meters as the normalized linear unit.
-   Explicit source-to-internal transform.
-   Explicit winding-order and normal handling.

Do not assume every source format uses the same up axis, handedness, or
units. Store the original unit and conversion metadata so the user can
understand how the model was interpreted.

### 8.4 Geometry representation

Support a versioned geometry model that can represent:

-   Triangle lists.
-   Triangle strips where appropriate.
-   Lines and points.
-   Position, normal, tangent, UV, color and joint attributes.
-   Index buffers.
-   Multiple primitives and material assignments.
-   Optional source CAD tessellation metadata.

Point clouds and specialized CAD data may require extensions to the base
representation.

### 8.5 Preservation policy

Preserve source-specific metadata in namespaced extension fields.
Unknown fields should not be silently discarded during cache migration.
The renderer may ignore data it cannot display, but the import/cache
layer should preserve it when practical.

------------------------------------------------------------------------

## 9. CAD Processing Architecture

CAD is not equivalent to polygon mesh import.

### 9.1 STEP / IGES workflow

``` mermaid
flowchart TD
    FILE[STEP / IGES File] --> VALIDATE[Validate file and resource budget]
    VALIDATE --> OCCT[OCCT Reader]
    OCCT --> BREP[B-Rep Solids / Shells / Faces]
    BREP --> UNITS[Read units and assembly structure]
    UNITS --> TES[Tessellation with quality settings]
    TES --> MESH[Triangle meshes and normals]
    MESH --> USM[Universal Scene Model]
    USM --> FILAMENT[Filament rendering]
    BREP --> META[Preserve CAD source metadata]
    META --> USM
```

### 9.2 CAD requirements

-   Preserve assembly and component hierarchy.
-   Preserve part names and available colors.
-   Detect and normalize units.
-   Configure linear and angular tessellation tolerances.
-   Avoid excessive triangle generation.
-   Keep source CAD data separate from display meshes.
-   Provide import warnings when unsupported CAD entities are skipped.
-   Support cancellation for long imports.
-   Never claim that the viewer can edit original parametric features
    unless that capability is implemented.

### 9.3 Tessellation profiles

Provide user-selectable quality profiles:

-   Draft: faster import, lower geometric detail.
-   Balanced: default compromise.
-   High: higher geometric detail and more memory.
-   Custom: advanced tolerance controls in a later release.

The selected profile and tessellation settings must be included in the
cache key.

------------------------------------------------------------------------

## 10. Rendering Architecture

### 10.1 Rendering engine

Google Filament is the proposed cross-platform rendering engine.

The application embeds a native Filament view in the React Native UI.
Android and iOS have separate surface/lifecycle integration, while
renderer-neutral scene and geometry logic is shared.

### 10.2 Rendering responsibilities

-   Initialize and destroy engine resources.
-   Bind and resize the native rendering surface.
-   Create and destroy vertex/index buffers.
-   Create material instances and textures.
-   Build renderables from normalized scene objects.
-   Manage camera orbit, pan, zoom and reset.
-   Support selection/picking.
-   Support display modes where implemented.
-   Handle GPU resource loss and application lifecycle transitions.

### 10.3 Threading model

Use clear thread ownership:

-   **JS thread:** UI state and user interactions.
-   **Native worker pool:** file parsing, decompression, geometry
    processing and cache I/O.
-   **Renderer thread:** Filament scene and GPU resource operations,
    according to Filament/platform requirements.
-   **Platform UI thread:** native view and lifecycle operations.

Cross-thread messages should use queues or safe dispatch mechanisms. Do
not mutate Filament objects from arbitrary worker threads.

### 10.4 Camera controls

MVP controls:

-   One-finger drag: orbit.
-   Two-finger pinch: zoom.
-   Two-finger drag: pan.
-   Reset: fit model to view.
-   Optional axis/view presets in a later milestone.

The camera controller should calculate model bounds and choose a
suitable initial camera distance.

### 10.5 Render modes

Planned modes:

-   Shaded.
-   Textured.
-   Wireframe.
-   Normal visualization.
-   Transparent/background options.

Some modes require custom Filament materials or additional geometry
passes and should not be assumed to work automatically.

------------------------------------------------------------------------

## 11. React Native and Native Bridge

### 11.1 Recommended integration

-   Fabric Native Component: embeds the native Filament rendering view.
-   TurboModule: exposes asynchronous engine commands and queries.
-   JSI: used selectively for efficient native integration, not as a
    reason to expose raw internal memory unsafely.
-   JNI: Android Java/Kotlin-to-C++ integration.
-   Objective-C++: iOS Swift/Objective-C-to-C++ integration.

### 11.2 TypeScript API contract

``` ts
export interface ModelInfo {
  modelId: string;
  fileName: string;
  detectedFormat: string;
  supportLevel: "basic" | "partial" | "advanced";
  nodeCount: number;
  meshCount: number;
  warnings: string[];
}

export interface ViewerEngine {
  openFile(uri: string): Promise<ModelInfo>;
  closeModel(modelId?: string): Promise<void>;
  cancelImport(jobId: string): Promise<void>;
  resetCamera(): void;
  setRenderMode(mode: "shaded" | "textured" | "wireframe"): void;
  selectNode(nodeId: string | null): void;
  getHierarchy(): Promise<SceneNode[]>;
  getMetadata(): Promise<ModelMetadata>;
}
```

The actual implementation must define event delivery, error
serialization, cancellation behavior, and lifecycle semantics.

### 11.3 Native events

Suggested events:

-   `onImportProgress`
-   `onImportCompleted`
-   `onImportWarning`
-   `onImportFailed`
-   `onModelSelected`
-   `onRendererReady`
-   `onRendererError`
-   `onMemoryWarning`

Events must include job/model IDs to avoid confusing results when the
user rapidly opens and closes files.

------------------------------------------------------------------------

## 12. Android Architecture

### 12.1 Components

-   React Native Android application.
-   Kotlin platform integration.
-   Fabric native rendering component.
-   JNI bridge to shared C++ core.
-   Android NDK and CMake.
-   Filament Android integration.
-   Storage Access Framework for document selection.

### 12.2 File access

Use Android's Storage Access Framework and content URIs. Do not assume
arbitrary filesystem paths or unrestricted storage access.

If a library needs a seekable local file, stage the content into
app-controlled cache storage. Keep the source read-only and validate
staged files.

### 12.3 Lifecycle

Handle:

-   Activity pause/resume.
-   Surface creation/destruction.
-   Background/foreground transitions.
-   Device rotation and viewport resize.
-   Memory pressure.
-   Renderer teardown and reinitialization.

### 12.4 Build

Use Gradle, Android NDK, CMake, and the versions supported by the
selected React Native and Filament releases. Pin dependency versions and
test the combined toolchain before upgrading.

------------------------------------------------------------------------

## 13. iOS Architecture

### 13.1 Components

-   React Native iOS application.
-   Swift platform integration.
-   Fabric native rendering component.
-   Objective-C++ bridge to shared C++ core.
-   Filament iOS integration.
-   Xcode build system.
-   Document picker and security-scoped resource access.

### 13.2 File access

Use Apple's document picker and security-scoped resource APIs where
applicable. Access must remain valid for the duration of the import. If
required, copy the source into app-controlled cache storage before
parsing.

### 13.3 Lifecycle

Handle:

-   View appearance/disappearance.
-   App background/foreground.
-   Native rendering surface lifecycle.
-   Memory warnings.
-   Device rotation.
-   GPU resource cleanup.
-   Renderer reinitialization.

### 13.4 Build

Use a macOS host with a compatible Xcode version. Build shared C++ code
for device and simulator architectures as appropriate. Validate
third-party library packaging, static/dynamic linking, signing, and App
Store requirements.

------------------------------------------------------------------------

## 14. Local Storage and Cache Architecture

### 14.1 Storage categories

  -----------------------------------------------------------------------
  Storage                 Purpose                 Retention
  ----------------------- ----------------------- -----------------------
  Original source         User's imported model   User controlled

  Temporary import        Staged input and        Cleaned after import
                          intermediate files      

  Converted cache         Normalized              Evictable
                          geometry/assets         

  Thumbnails              Preview images          Evictable

  SQLite database         History, favorites,     App-managed
                          preferences             

  Diagnostics             Local error and         Bounded retention
                          performance records     
  -----------------------------------------------------------------------

### 14.2 Cache key

A cache key should include:

-   Source content hash.
-   Detected format.
-   Importer name and version.
-   Internal scene schema version.
-   Import options.
-   Tessellation settings.
-   Texture processing settings.
-   Relevant platform-independent conversion settings.

Do not use only the filename or file modification time as a cache
identity.

### 14.3 Atomic cache writes

Write to a temporary location, validate output and manifest, then
atomically promote the completed cache. Incomplete cache entries must
never be treated as valid.

### 14.4 SQLite tables

Suggested initial schema:

``` sql
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  source_uri TEXT NOT NULL,
  display_name TEXT NOT NULL,
  detected_format TEXT,
  source_size_bytes INTEGER,
  source_hash TEXT,
  imported_at TEXT,
  last_opened_at TEXT,
  support_level TEXT,
  cache_key TEXT,
  thumbnail_path TEXT,
  status TEXT NOT NULL
);

CREATE TABLE favorites (
  model_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  model_id TEXT,
  state TEXT NOT NULL,
  error_code TEXT,
  warning_json TEXT,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Schema migrations must be versioned. Database paths and cache paths must
be app-controlled.

------------------------------------------------------------------------

## 15. Performance and Resource Management

### 15.1 Performance requirements

The application should remain responsive while imports run. No universal
polygon-count limit should be promised before device testing.

Measure:

-   Import duration.
-   Peak resident memory.
-   CPU utilization.
-   GPU memory where measurable.
-   Triangle and vertex counts.
-   Texture memory.
-   Draw calls.
-   Frame time.
-   Battery and thermal behavior.
-   Cache size.

### 15.2 Optimization techniques

-   Background import workers.
-   Progressive loading where the format and adapter permit it.
-   Mesh deduplication where safe.
-   Index and vertex buffer optimization.
-   Texture resizing/compression where appropriate.
-   Level of detail for large scenes.
-   Frustum culling and visibility management.
-   Instancing for repeated geometry.
-   Cache reuse.
-   Explicit resource disposal.

### 15.3 Device quality profiles

-   **Standard:** conservative texture and geometry budgets.
-   **High quality:** increased detail where memory permits.
-   **Large model:** adaptive quality, progressive loading, and stronger
    memory limits.

The profile must adapt to actual device capabilities. Avoid relying only
on device marketing tier.

------------------------------------------------------------------------

## 16. Security Architecture

All imported files must be treated as untrusted.

### 16.1 Threats

-   Malformed parser inputs.
-   Parser vulnerabilities.
-   Excessive memory or CPU consumption.
-   Archive/decompression bombs.
-   Path traversal in package references.
-   Malicious external resource references.
-   Oversized textures.
-   Invalid or cyclic scene structures.
-   Integer overflow in geometry counts or buffer sizes.
-   Unexpected embedded scripts or macros.

### 16.2 Controls

-   Detect format using file signatures and validated containers.
-   Validate sizes, counts, offsets, dimensions, and references.
-   Use checked arithmetic for buffer allocation.
-   Set import time, memory, archive expansion, and geometry budgets.
-   Restrict package extraction to a controlled directory.
-   Reject path traversal and unsafe external references.
-   Do not execute scripts, macros, or embedded code.
-   Keep parsers and conversion libraries updated.
-   Use minimal enabled library features.
-   Fuzz parsers and run malformed-file regression tests.
-   Keep original files read-only.
-   Provide cancellation and safe cleanup.
-   Avoid logging sensitive full paths or file contents.

Native parser code is not automatically sandboxed by running in C++. For
high-risk or complex conversion, consider a separately isolated process
where platform capabilities permit it.

### 16.3 Privacy

-   No mandatory account.
-   No mandatory upload.
-   No analytics containing model contents.
-   No transmission of source files without explicit user action.
-   Clear cache controls.
-   Clear explanation of any optional future network feature.

------------------------------------------------------------------------

## 17. Error Handling and Observability

### 17.1 Error categories

-   `FILE_NOT_FOUND`
-   `ACCESS_DENIED`
-   `UNSUPPORTED_FORMAT`
-   `INVALID_FILE`
-   `CORRUPT_ARCHIVE`
-   `IMPORTER_UNAVAILABLE`
-   `IMPORT_FAILED`
-   `RESOURCE_LIMIT_EXCEEDED`
-   `CANCELLED`
-   `CACHE_WRITE_FAILED`
-   `RENDERER_INITIALIZATION_FAILED`
-   `GPU_RESOURCE_FAILED`

### 17.2 User-facing behavior

Errors should explain what happened and what the user can do next. Avoid
exposing stack traces, local filesystem internals, or sensitive paths.

Warnings should be separate from fatal errors. A model may render
successfully while missing unsupported textures or source features.

### 17.3 Local diagnostics

Record bounded, local diagnostic events such as importer version,
format, duration, resource usage, and error code. Sharing diagnostics
must be an explicit user action.

------------------------------------------------------------------------

## 18. Testing Strategy

### 18.1 Test levels

1.  Unit tests: file detector, scene model, transforms, units, cache
    keys.
2.  Adapter tests: one or more real sample files per supported format
    and feature.
3.  Golden tests: expected scene hierarchy, bounds, counts, materials
    and metadata.
4.  Rendering tests: visual output, camera controls, surface resize.
5.  Integration tests: file picker through import, cache, render, and
    close.
6.  Stress tests: large scenes, many nodes, large textures and repeated
    open/close.
7.  Security tests: malformed inputs, archive traversal, excessive
    dimensions and parser fuzzing.
8.  Device tests: multiple Android and iOS devices with different
    memory/GPU capabilities.
9.  Offline tests: airplane mode and denied network access.
10. Regression tests: compare results across importer and schema
    upgrades.

### 18.2 Format test corpus

Maintain a legally distributable test corpus with:

-   Simple geometry.
-   Multiple meshes.
-   Multiple materials.
-   Textures.
-   Hierarchy.
-   Large geometry.
-   Missing companion assets.
-   Different units and axes.
-   Corrupt and truncated files.
-   Edge cases specific to each format.

Do not use customer files in a shared test corpus without permission.

### 18.3 Release gates

A format is advertised as supported only after:

-   Valid files import.
-   Expected geometry renders.
-   Relevant hierarchy and metadata are verified.
-   Resource limits are enforced.
-   Corrupt inputs fail safely.
-   Android and iOS tests pass for the declared support level.

------------------------------------------------------------------------

## 19. Dependency and Licensing Governance

Third-party libraries must be reviewed before distribution.

Maintain a dependency register containing:

-   Library name and exact version/commit.
-   License and copyright notices.
-   Source URL.
-   Enabled components.
-   Platform build status.
-   Known security advisories.
-   Required notices and attribution.
-   Static/dynamic linking implications.
-   Commercial distribution restrictions.

Key candidates:

  -----------------------------------------------------------------------
  Component               Role                    Governance requirement
  ----------------------- ----------------------- -----------------------
  React Native            Mobile framework        Review license and
                                                  transitive packages

  Filament                Renderer                Pin version and include
                                                  notices

  Assimp                  General importer        Verify selected release
                                                  and license

  OCCT                    CAD kernel              Review applicable
                                                  license and
                                                  distribution
                                                  obligations

  OpenUSD                 USD scene support       Review dependencies and
                                                  distribution terms

  SQLite                  Local database          Verify distribution
                                                  notices

  CMake / Ninja           Build tools             Pin supported versions
  -----------------------------------------------------------------------

Do not assume all plugins, SDKs, codecs, or proprietary importers are
free for commercial redistribution. Obtain legal review for licensed CAD
SDKs.

------------------------------------------------------------------------

## 20. Repository Structure

Recommended monorepo:

``` text
universal-3d-viewer/
├── apps/
│   └── mobile/
│       ├── src/
│       │   ├── app/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── navigation/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── state/
│       │   ├── storage/
│       │   └── types/
│       ├── android/
│       ├── ios/
│       └── package.json
│
├── native/
│   ├── bridge/
│   │   ├── android/
│   │   ├── ios/
│   │   └── shared/
│   └── engine/
│       ├── core/
│       ├── scene/
│       ├── geometry/
│       ├── import/
│       ├── adapters/
│       │   ├── assimp/
│       │   ├── occt/
│       │   ├── openusd/
│       │   └── specialized/
│       ├── renderer/
│       ├── cache/
│       ├── diagnostics/
│       └── tests/
│
├── third_party/
│   ├── manifests/
│   └── patches/
│
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── formats/
│   ├── security/
│   └── release/
│
├── test-assets/
│   ├── general/
│   ├── cad/
│   ├── usd/
│   └── malformed/
│
├── scripts/
├── CMakeLists.txt
├── package.json
├── .gitignore
└── README.md
```

Generated native projects should be created with the selected official
React Native CLI version. Avoid hand-writing or copying stale Gradle,
CocoaPods, Fabric, or codegen templates.

------------------------------------------------------------------------

## 21. Build and CI/CD Architecture

### 21.1 Windows development

Windows is suitable for:

-   React Native TypeScript development.
-   Android builds.
-   C++ core development.
-   CMake unit tests.
-   Android NDK builds.
-   Android physical-device testing.

Windows cannot provide the complete native Xcode/iOS build and signing
environment.

### 21.2 macOS development

macOS is required for:

-   Xcode project builds.
-   iOS simulator tests.
-   iOS device builds.
-   Code signing.
-   App Store archive creation.
-   iOS native dependency integration.

### 21.3 CI pipeline

``` mermaid
flowchart TD
    COMMIT[Commit / Pull Request] --> LINT[TypeScript lint and typecheck]
    LINT --> CPP[Build C++ core]
    CPP --> UNIT[Unit and adapter tests]
    UNIT --> ANDROID[Android build and tests]
    ANDROID --> IOS[iOS build and tests on macOS]
    IOS --> SECURITY[Dependency and security checks]
    SECURITY --> ARTIFACTS[Signed / unsigned release artifacts]
    ARTIFACTS --> REVIEW[Release review and approval]
```

Build reproducibility requires pinned dependencies, lockfiles,
documented toolchains, and recorded native library versions.

------------------------------------------------------------------------

## 22. Development Roadmap

The strategy is to establish all major format-family boundaries from the
beginning, while implementing and validating formats in priority order.

  -----------------------------------------------------------------------
  Stage                   Scope                   Exit criteria
  ----------------------- ----------------------- -----------------------
  0                       Architecture and        Versions, licenses and
                          dependency feasibility  platform builds
                                                  verified

  1                       Native viewer           GLB rendered on Android
                          foundation              and iOS

  2                       General format adapters OBJ, STL, PLY and
                                                  selected glTF workflows
                                                  tested

  3                       App library and offline File history, cache,
                          storage                 favorites and recovery

  4                       CAD adapter             STEP/IGES import,
                                                  tessellation and
                                                  hierarchy

  5                       Additional scene        FBX, DAE, 3MF and USD
                          formats                 workflows

  6                       Advanced inspection     Selection, hierarchy,
                                                  metadata and
                                                  measurements

  7                       Compatibility and       Stress, security,
                          hardening               regression and device
                                                  testing

  8                       Production release      Store builds, notices,
                                                  privacy and support
                                                  process
  -----------------------------------------------------------------------

### Sprint 1: Native viewer foundation

Tasks:

1.  Create official React Native project.
2.  Verify Android toolchain.
3.  Verify iOS toolchain on macOS.
4.  Integrate Filament native rendering surface.
5.  Initialize and destroy renderer safely.
6.  Load one known-good GLB.
7.  Implement orbit, zoom, pan and reset.
8.  Test lifecycle, repeated open/close and memory cleanup.

Acceptance criteria:

-   Same test model renders on Android and iOS.
-   Viewer works offline.
-   Camera controls work.
-   UI remains responsive.
-   Closing the model releases resources.
-   No unexplained crash during repeated model loading.

### Sprint 2: Import framework

-   File signature detector.
-   Import adapter interface.
-   Import job state machine.
-   Normalized scene model.
-   Error and warning contract.
-   Import cancellation.
-   Initial Assimp integration.

### Sprint 3: Offline library

-   Document picker.
-   SQLite schema and migrations.
-   Cache manifest and atomic writes.
-   Recent models and favorites.
-   Thumbnail generation.
-   Cache cleanup.

### Sprint 4 onward

Add CAD and other format families with a test corpus and explicit
compatibility levels.

------------------------------------------------------------------------

## 23. Architecture Decision Records

### ADR-001: React Native for the mobile UI

**Decision:** Use React Native and TypeScript.

**Reason:** Shared UI, productive development, and reuse of React
skills.

**Trade-off:** Native rendering and platform file access require native
modules.

### ADR-002: C++ shared engine

**Decision:** Use C++ for common parsing, geometry and scene processing.

**Reason:** Native performance and reuse across Android and iOS.

**Trade-off:** More complex memory ownership, native debugging and build
configuration.

### ADR-003: Filament as the renderer

**Decision:** Use Filament on both platforms.

**Reason:** Shared rendering behavior and native real-time rendering.

**Trade-off:** Native surface and lifecycle integration must be
maintained.

### ADR-004: Adapter-based import

**Decision:** Use dedicated format adapters.

**Reason:** Format-specific fidelity, licensing and parser behavior
vary.

**Trade-off:** More integrations and compatibility testing.

### ADR-005: Internal scene model

**Decision:** Normalize imported data into a versioned Universal Scene
Model.

**Reason:** Decouples importer libraries from the renderer.

**Trade-off:** Mapping must preserve source-specific information and
evolve carefully.

### ADR-006: Offline-first storage

**Decision:** Local database and filesystem cache; no mandatory backend.

**Reason:** Privacy, reliability and offline usability.

**Trade-off:** Cross-device synchronization is not available initially.

### ADR-007: CAD B-Rep processing

**Decision:** Use OCCT for STEP/IGES and tessellate for visualization.

**Reason:** CAD exchange data contains exact geometry and assemblies,
not just triangle meshes.

**Trade-off:** Tessellation loses parametric editability; preserve
source data and metadata separately.

------------------------------------------------------------------------

## 24. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  Native library          High                    Prove Filament on both
  integration complexity                          platforms first

  Format feature loss     High                    Support levels and
                                                  golden test corpus

  Proprietary formats     High                    Licensed SDK or
                                                  conversion route

  CAD memory usage        High                    Tessellation profiles
                                                  and budgets

  Large native dependency Medium/High             Modular build and
  size                                            feature selection

  Platform GPU            High                    Cross-device visual and
  differences                                     lifecycle tests

  Parser vulnerabilities  High                    Validation, fuzzing and
                                                  resource limits

  Dependency license      High                    Legal and license
  conflict                                        review

  Cache schema changes    Medium                  Versioned manifests and
                                                  migrations

  iOS build availability  High                    Secure macOS build
                                                  environment early
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 25. Open Technical Questions

These decisions must be resolved through proof-of-concept work rather
than assumptions:

1.  Which exact Filament release and integration path will be pinned?
2.  Can the selected Filament release be built and embedded cleanly in
    both React Native native shells?
3.  Which React Native version and Fabric/codegen configuration will be
    used?
4.  Which Assimp importers and build options are required?
5.  What OCCT build configuration and license obligations apply to
    commercial mobile distribution?
6.  Which OpenUSD features and binary dependencies are needed on mobile?
7.  Which formats require dedicated adapters rather than Assimp?
8.  What are the supported minimum Android and iOS versions?
9.  What are the initial import memory, archive expansion, texture and
    geometry limits?
10. Which CAD sample corpus can be legally used for regression testing?

Do not lock production dependency versions until a reproducible Android
and iOS integration build has passed.

------------------------------------------------------------------------

## 26. Definition of Done

The architecture is considered implemented for a feature only when:

-   Its interfaces and ownership rules are documented.
-   It has unit and integration tests.
-   It handles errors and cancellation.
-   It respects memory and processing limits.
-   It is tested on Android and iOS where applicable.
-   It does not block the UI during expensive operations.
-   It preserves original source files.
-   It has appropriate security and license review.
-   It has measurable acceptance criteria.
-   Its actual support level is reflected in product documentation.

------------------------------------------------------------------------

## 27. Final Recommendation

Build Universal 3D Viewer as a **native 3D engine embedded inside a
cross-platform mobile application**, not as a JavaScript viewer with
many format-specific workarounds.

The long-term product advantage will come from:

1.  A robust and extensible import adapter system.
2.  A renderer-neutral, versioned scene representation.
3.  A shared C++ geometry and CAD processing core.
4.  Consistent Android and iOS rendering.
5.  Reliable offline file management.
6.  Honest, tested format compatibility.

The first engineering milestone remains simple: render one GLB model
using Filament inside React Native on both Android and iOS. Once that
foundation is proven, expand the importer ecosystem without changing the
application's core architecture.

**End of document.**
