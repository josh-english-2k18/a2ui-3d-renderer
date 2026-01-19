# Technical Design Document: Three.js-Based WebGL Renderer for the A2UI Protocol

**Document Version:** 1.0  
**Date:** January 15, 2026  
**Author:** Grok (xAI)  
**Contributor:** Josh English (@JoshSeriesAI)  
**Classification:** Public / Open Design  

## Revision History

| Version | Date       | Author          | Changes                                      |
|---------|------------|-----------------|----------------------------------------------|
| 1.0     | 2026-01-15 | Grok (xAI)      | Initial release – comprehensive design        |

## Abstract

This document presents a world-class, production-ready architectural design for a high-performance WebGL renderer of the A2UI (Agent-to-UI) protocol using Three.js as the foundational graphics engine.

The renderer delivers pixel-perfect 2D UI rendering with native 3D depth, cinematic post-processing effects, and GPU-accelerated scalability suitable for demanding applications such as real-time games, immersive web experiences, and AI-driven interfaces.

By combining Three.js’s mature 3D capabilities with precise flexbox layout (via Yoga), advanced text rendering (Troika), and full protocol compliance, this design achieves superior visual fidelity, interactivity, and performance compared to traditional DOM-based or 2D-only renderers.

The architecture is modular, extensible, and optimized for incremental updates, making it ideal for streaming AI-generated UIs.

## 1. Introduction

### 1.1 Background

The A2UI protocol (v0.8 as of January 2026) is an open, declarative, streaming format developed by Google that enables AI agents to securely generate and update user interfaces across platforms. It uses JSONL over Server-Sent Events (SSE) to deliver component trees, data models, and progressive rendering commands.

Existing reference implementations focus on web frameworks (Lit, React) and mobile (Flutter). This design introduces a GPU-accelerated, canvas-based renderer targeting high-visual-quality environments where DOM overhead is unacceptable — particularly video games, VR/AR frontends, and premium web applications.

### 1.2 Objectives

- Full compliance with the A2UI protocol (streaming, buffering, data binding, actions).
- Exceptional visual sophistication: depth, lighting, bloom, parallax, and custom materials.
- Outstanding performance: thousands of elements at 60+ FPS on mid-range hardware.
- Seamless integration into existing Three.js scenes (e.g., games, 3D dashboards).
- Extensibility for custom catalogs, shaders, and animations.
- Accessibility and security considerations.

### 1.3 Scope

This document covers architecture, component mapping, data flow, implementation strategy, and advanced features. It does not include full source code but provides detailed pseudocode and patterns sufficient for a senior engineer to implement.

## 2. Requirements

### 2.1 Functional Requirements

- Parse and buffer A2UI JSONL messages (surfaceUpdate, dataModelUpdate, beginRendering, etc.).
- Construct component hierarchy with data binding.
- Perform flexbox layout using Yoga.
- Render to HTML `<canvas>` with WebGL2.
- Support multiple concurrent surfaces.
- Handle user interactions and dispatch `userAction` messages.
- Progressive rendering and incremental updates.

### 2.2 Non-Functional Requirements

- Performance: ≥5000 interactive elements at 60 FPS.
- Visual quality: anti-aliased text, soft shadows, selective bloom.
- Responsiveness: sub-16ms update latency for data model changes.
- Memory efficiency: object pooling, texture atlasing.
- Accessibility: off-screen DOM mirror for screen readers.

## 3. High-Level Architecture

```
SSE Stream (JSONL)
   │
   ▼
Message Parser & Buffer
   │
   ▼
Tree Builder (on beginRendering)
   │
   ▼
Layout Engine (Yoga WASM)
   │
   ▼
Scene Graph Builder (Three.js Objects)
   │
   ▼
Binding Resolver & Dirty Propagation
   │
   ▼
Render Loop (Three.js + EffectComposer)
   │
   ▼
Interaction Layer (Raycaster → userAction)
```

- Core loop: retained-mode scene graph with incremental patching.
- Camera: Orthographic for pixel-perfect 2D, with Z-depth for elevation.
- Scene: single THREE.Scene with per-surface THREE.Group roots.

## 4. Key Technologies

| Component              | Technology                          | Rationale                                                                 |
|------------------------|-------------------------------------|---------------------------------------------------------------------------|
| Core Rendering         | Three.js r160+                      | Mature WebGL2 abstraction, post-processing, instancing, ecosystem         |
| Layout                 | yoga-layout (WASM)                  | Exact flexbox semantics matching A2UI spec                                |
| Text Rendering         | troika-three-text                   | SDF/MSDF text with outlining, wrapping, GPU-efficient syncing             |
| Post-Processing        | EffectComposer + UnrealBloomPass    | Selective glow, depth-of-field, outline effects                           |
| Streaming              | Native EventSource (SSE)            | Standard-compliant, low overhead                                          |
| Animation              | GSAP (optional)                     | Precise timeline control for entrance/hover transitions                    |
| Interaction            | THREE.Raycaster                     | Precise hit-testing in 3D space                                           |

## 5. Detailed Component Design

### 5.1 Node Hierarchy

Base class: `A2UINode`

```typescript
abstract class A2UINode {
  id: string;
  type: string;
  threeObject: THREE.Object3D;
  yoga: Yoga.Node;
  children: A2UINode[];
  parent?: A2UINode;
  elevation: number = 0;
  dirty: boolean = true;

  abstract createThreeObject(): THREE.Object3D;
  abstract updateFromComponent(component: any, dataModel: any): void;
}
```

### 5.2 Component Mapping

| A2UI Component | Three.js Representation                     | Key Implementation Details                                  |
|----------------|---------------------------------------------|-------------------------------------------------------------|
| Row / Column   | THREE.Group                                 | Children ordered by Z-index for correct draw order          |
| View / Card    | THREE.Mesh (PlaneGeometry) + MeshPhysicalMaterial | Rounded corners via custom SDF shader; elevation → position.z |
| Text           | TroikaText                                  | sync() on binding changes; outline, shadow, glow materials  |
| Button         | THREE.Group (background Mesh + Text + optional icon) | Hover: rotation + lift + emissive intensity; click dispatch |
| Image          | THREE.Mesh (Plane) or Sprite                | Texture caching, nine-slice via shader                      |
| List           | THREE.Group + InstancedMesh (for items)     | Virtualized scrolling, object pooling                       |

Custom components extend `A2UINode` and register in a factory map.

### 5.3 Layout and Transform Pipeline

1. Yoga configuration from component props (flexDirection, padding, etc.).
2. `root.yoga.calculateLayout(width, height, Yoga.DIRECTION_LTR)`.
3. Recursive transform update:
   ```typescript
   obj.position.set(
     left - canvasWidth / 2,
     canvasHeight / 2 - top,   // Y-flip for Three.js
     -elevation
   );
   obj.scale.set(width, height, 1);
   ```

### 5.4 Data Binding and Incremental Updates

- Resolver uses JSONPath-like lookup on flattened data model.
- Dirty flag propagation: mark subtree on relevant path change.
- List diffing: virtual-DOM-style reconciliation with pooling.

### 5.5 Interactivity

- Global raycaster on pointermove/pointerdown.
- Store node references in `object.userData.node = this`.
- Hover effects: GSAP timeline (rotationX/Y ±5°, position.z +10, emissive +0.5).
- Click: traverse to deepest interactive node → resolve action context → send `userAction`.

### 5.6 Advanced Visual Features

- **Depth & Parallax**: Global subtle scene rotation based on normalized pointer position.
- **Lighting**: AmbientLight + soft DirectionalLight for natural shadows.
- **Post-Processing Stack**:
  - RenderPass
  - UnrealBloomPass (selective via emissiveMap)
  - OutlinePass for focus
  - Optional SSAO or DoF for modal backgrounds.
- **Custom Shaders**: Card background shader supporting gradients, noise, and rounded corners without masks.

## 6. Performance Optimization Strategy

- InstancedMesh for repeated list items and icons.
- Frustum culling + visibility flags for off-screen elements.
- Texture atlas via THREE.TextureLoader caching.
- TroikaText batching and reuse.
- Dirty rect avoidance via retained mode.
- Benchmark targets: 10k cards with bloom at 60 FPS on RTX 3060-class GPU.

## 7. Extensibility & Integration

- Custom catalog support via registry.
- Shared renderer: inject external Three.js scene objects as A2UI children.
- Game engine bridges: export renderer as module for Unity/Unreal WebGL overlays.
- Animation hooks: expose timeline events for AI-driven transitions.

## 8. Security Considerations

- Sanitize all bound values (escape if mirrored to DOM).
- Action dispatch via secure backend channel only.
- No eval() or dynamic script execution.

## 9. Accessibility

- Maintain hidden DOM mirror (ARIA roles synced with A2UI semantics).
- Keyboard navigation: simulate raycast focus ring.

## 10. Implementation Roadmap

| Phase | Milestones                                      | Estimated Effort |
|-------|-------------------------------------------------|------------------|
| 1     | Core parsing, buffering, tree building          | 2 weeks          |
| 2     | Yoga integration + basic View/Text/Card         | 3 weeks          |
| 3     | Interaction, actions, data binding              | 2 weeks          |
| 4     | Advanced visuals (post-processing, animations) | 3 weeks          |
| 5     | Performance tuning, virtualization, testing     | 2 weeks          |

## 11. Appendix A: Example Initialization

```typescript
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass, UnrealBloomPass } from 'three/examples/jsm/postprocessing';
import { Text } from 'troika-three-text';

class A2UIRenderer {
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.camera = new THREE.OrthographicCamera(
      -canvas.width / 2, canvas.width / 2,
      canvas.height / 2, -canvas.height / 2,
      0.1, 1000
    );
    this.camera.position.z = 100;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(undefined, 0.8, 0.4, 0.85));

    this.animate();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.composer.render();
  };

  // Message handling, tree building, layout, etc. as described
}
```

This design represents a pinnacle of modern WebGL UI engineering — merging declarative AI-driven interfaces with cinematic 3D graphics in a performant, extensible package ready for production deployment.
