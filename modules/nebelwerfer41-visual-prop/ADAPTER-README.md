# Nebelwerfer 41: fixed authored exterior → PGF

This module makes the existing Blender-authored, nonfunctional exterior art a real PGF generator asset. It is an authored-asset assembly and appearance adapter, not an online Blender service or a fully procedural rebuild.

## Actual capabilities

- Standard module-owned definition, strict JSON Schema, defaults, presets and recipe
- The unchanged N2 GLB, loaded locally in Node or from the bundled asset URL in a browser Worker
- Existing PGF static GLB validation, GLTFLoader, portable vehicle finish, Three-to-AssetIR and shared Worker export
- Five original semantic exterior groups can be shown or hidden; an all-hidden request is rejected
- Paint color, roughness, weathering and the existing PGF camouflage options alter the exported PBR material channels
- The byte-identical N4 shallow sealed-surface correction and a fixed art display pose
- Current visible geometry, textures and metadata export as a static GLB

No overall-scale parameter is offered. Geometry is not rebuilt from engineering dimensions. The imported art has unmeasured proportions; hidden surfaces are artistic approximations. There is no internal mechanism, fire-control logic, projectile performance, physical simulation, firing animation or functional design. The separate N4 presentation is outside this module; a static GLB is not its animation export.

## Source identity

N2 authoring source: the existing N2 exterior checkpoint from 2026-10-12. `assets/N41-N2-geometry.glb` is the original 5,064,756-byte file, SHA-256 `5c97cbb68542723fbca7dbcfaa114a08ffe216c1d15cb60eb1febca2845a6896`. Every load verifies that digest before parsing. The module does not accept arbitrary source URLs or imported files in a request.

`exterior-correction.mjs` is copied without edits from the N4 exterior-delta checkpoint at 03:51Z, SHA-256 `d87561b557f0e1e608b66ebd83d69fc4bd5e9b629fb291dc1868daca14bf7b97`. `sequence-core.mjs` deliberately supplies only the required fixed artwork direction from that source; it contains no animation system. The source direction is an art decision, not a measured real launch angle.

The runtime correction hides six front decorative pins and six overlaid front caps, and replaces six capped cosmetic collars with external rounded lips so they do not obscure the dark surface. It adjusts 576 vertices and keeps the six exterior meshes sealed. The asset retains dark vertex colors through AssetIR and GLB export. Original N2 bytes remain unchanged.

## Use

Browser: discover this manifest under the `dot-model-generator` collection, using the standard definition and shared Worker. The collection owns renderer, controls, selection and lifecycle; this module does not mount a nested renderer.

Node: import `definition.mjs` and call `prepareGenerator(adapter).generate({seed, params})`. Use the existing PGF AssetIR/GLB exporter. No new dependency installation is required.

The standalone module workbench uses the same shared data workbench only when opened directly. The collection consumes `definition.mjs` and `worker.js`, not this standalone workbench.

## Verification

Run from the PGF project root:

    node --test modules/nebelwerfer41-visual-prop/tests/adapter.test.mjs

The focused Node suite verifies immutable source checksums, real generation, strict inputs, deterministic export, material boundaries, all five part toggles and single-part states, rejected empty output, resource budgets, actual HTTP loading, errors, early/late abort, parser-error cleanup and idempotent disposal. A separately instantiated GLTFLoader and actual PNG decoder read the exported GLB: 355 visible meshes, 109,516 triangles, three decoded PBR textures, six retained dark vertex-color surfaces, zero animation clips. See `evidence/node-report.json` and `evidence/node-tests.log`.

The separate real unified-viewport Firefox acceptance passed all 30 checks against version 1.0.1: one shared viewport/schema, PBR and camouflage, all five groups, rejected empty output, canceled generation/export, recipe restoration, rapid switching, idle/hidden rendering, live GPU context and complete disposal. The actual browser-downloaded 2,939,728-byte GLB independently decodes to 355 meshes, 109,516 triangles, three textures, six dark vertex-color surfaces and zero animation clips. See `evidence/firefox-browser-report.json` and `evidence/firefox-static.glb`. The final screenshot was also inspected: all six dark sealed fronts and outer lips are visible without the former bright cap obstruction; the full asset fits the unified viewport. This is visual evidence, not a numerical likeness score.

The real shared MCP discovery/describe/model Worker path and an isolated Vite browser-Worker build also passed; the emitted bundle was executed and its static asset URL resolved. The MCP transport server was not exercised. Full repository tests/build and CodeGraph were not available in the restored dependency-focused working tree; these focused results are not a full-repository pass.
