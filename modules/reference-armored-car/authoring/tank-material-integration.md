# PGF tank material integration

The requested second material stage reuses existing PGF tank code rather than a new camouflage system. The additive shared adapter is `modules/tank/src/portable-vehicle-finish.mjs`; no existing tank source or behavior is changed.

## Sources and rights

- PBR: `modules/tank/upstream/src/turret-surface-materials.mjs`, `buildTurretSurfacePixels`
- Patterns: `modules/tank/src/camouflage.js`, `normalizeFinish`, `resolvedPattern`, `bindVehicleCamouflage`
- Painter: existing `bakePgfCamo` in `modules/tank/upstream/vendor/legacy-tank-source/src/vehicles/materials.js`
- Vendored painter license: `modules/tank/upstream/vendor/legacy-tank-source/LICENSE`, MIT, Copyright 2026 Kevin B. Liu. This does not declare the whole PGF module MIT. Existing `modules/tank/provenance.json` records the pinned upstream source.

## Contract

Existing car parameters and four preset IDs remain. Additive parameters `camoPattern`, `camoEnvironment`, `camoScale` map to the existing tank finish object. Defaults are `original`, `desert`, `1`. Pattern choices are `original`, `auto`, and all 45 existing tank patterns; environment choices are desert/jungle/snow/urban; density range 0.5–2.

Only armor and armor-edge roles receive tank paint. Bare metal, rubber, canvas, straps, wood, lamps and markings keep independent PBR channels and factors. Standard UV0 basecolor, tangent normal and metallic-roughness survive the actual PGF GLB path. Repeat is baked into image pixels because AssetIR has no texture-transform field. AO is not used or claimed.

The default portable Blender kit bakes material factors into 20 images (nine pairs of basecolor/MR plus separate tank and accessory normals). PGF uses six shared neutral channel images with per-material factors; pattern finishes replace the armor albedo with the existing painter's color pixels and reset painted material color through the existing binder. Source/runtime pixel comparison explicitly checks there is no double tinting.

Pure armor PBR needs no Canvas. Pattern generation uses existing Canvas2D APIs: Node loads the project-locked `@napi-rs/canvas` only when a pattern is requested, while browser Workers use OffscreenCanvas/Path2D and a main-thread review uses its native canvas. Temporary host globals are restored before returning. Native browser and Skia antialiasing can differ; cross-host byte identity is not claimed for pattern rasterization. Node/shared-Worker output and actual exports are tested independently.

## Validation

`tests/tank-materials.test.mjs` checks exact upstream PBR pixels, all 45 pattern IDs at small resolution, non-paint role isolation, host-global restoration, and full-resolution equivalence with the existing tank headless adapter for representative painters and scales. Other module tests validate geometry, poses, original parameter compatibility, standard channels, GLB roundtrip, and the real shared Worker. Browser checks and final stage hashes are recorded separately; pre-tank evidence is explicitly retained under `evidence/pre-tank/`.
