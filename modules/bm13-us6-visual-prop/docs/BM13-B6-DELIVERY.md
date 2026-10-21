# BM-13N / Studebaker US6 — static exterior game asset

## Scope and status
The identity is based on the Poznań museum's description of a BM-13N on a 1944 Studebaker US6. This is a simplified exterior game interpretation, not a historically certified reconstruction. The exact US6 U-subtype is not established. Grille and rear fender details remain unconfirmed; hidden faces and decorative counts are artistic inference.

The asset has three axles and ten road tires, straight wheels, and a fixed, empty, horizontal display rack. It contains no ammunition, functioning launch mechanism, internal weapon geometry, real operating sequence, fire control, or ballistic simulation. All proportions are unmeasured art units. Exporting in nominal meter units does not make them engineering measurements.

Blender MCP authoring and PGF adaptation are complete at B6. The separate shared-workbench Firefox acceptance remains the integrator's responsibility. Native Blender images must not be labeled browser screenshots.

## Three quality tiers
- Low: 76,916 triangles
- Medium: 129,976 triangles
- High: 387,996 triangles

B6 lowers medium triangle count by 46.4% and low by 19.7% relative to B5. Medium/low non-wheel geometry is byte-identical at parsed geometry-attribute level; high retains all B5 geometry. Tire and hub density, not cab shape, was changed. The low hub is visibly faceted close up and is intended for more distant presentation. No GPU frame-time improvement is claimed.

Medium same-owner, same-material batching reduces 295 source meshes to 59 draws. Every source triangle range, material, owner, UV and transformed surface is audited. This is float-tolerant batching, not a claim of bit-identical world coordinates. Ten wheel pivots and eight exterior visibility groups are preserved. Static tire bounding boxes do not overlap; this is not a physics or engineering certification.

## Parameters
- Top-level printable seed, 1–128 characters: deterministic PGF surface appearance
- Detail: low / medium / high, backed by three distinct authored assets
- Uniform artScale: 0.65–1.5; tire proportions remain uniform
- Paint: six-digit hexadecimal color
- Roughness: 0.35–1; weathering: 0–1
- Existing PGF portable camouflage pattern, environment and scale controls
- Eight visibility groups: cab, hood/grille, fenders/steps, chassis, front wheels, rear dual wheels, empty rack, cosmetic fittings
- At least one group must remain visible

Geometry is authored and fixed except for uniform scale and part visibility. This is not an online remodeling or weapon-function generator. Wheel rolling is not enabled in this release. No smoke sequence or operating timeline is provided.

## Reused PGF assets
- `wheel-assembly`: tire geometry, normalized solely to the artistic truck scale
- `material-kit/metal-finish.mjs`: metalFinishPixels base, normal and ORM maps
- Existing portable vehicle camouflage and material binding
- Existing Gustav same-owner batching helper
- Shared generator SDK, Worker protocol and GLB writer

Missing body, cab, fender, hub, exterior rack and trim geometry was built through the real Blender MCP transport. Auxiliary preprocessing writes tire interchange data and performs audits; it is not represented as MCP authoring.

## Validation
The adapter suite passed 10/10: schema, immutable source checksums, real three-tier generation, all eight group-off and group-only variants, deterministic same-seed export, material-only variations, strict invalid-input rejection, budget rejection, HTTP load/error/abort, loader cancellation/error cleanup, resource ownership, independent PNG/GLTF decoding and shared Worker export.

Every source tier has zero degenerate triangles and finite geometry, complete UVs and unit normals, ten wheel pivots and zero animation clips. The final PBR exports are independently reread as well. See the included JSON audits for exact hashes and results.

Final renders use the same medium PGF GLB, CPU Cycles with 128 samples, neutral studio lighting, orthographic cameras and explicit camera evidence. Top view is strictly vertical. This Blender build does not provide OpenImageDenoise, so residual sampling noise is visible. No AI generation or retouching is used for actual model screenshots.

## Reference format and provenance
The approved reference presentation follows the actual Gustav templates: one sheet with a large side view above, top lower-left and front lower-right; a separate six-detail sheet in three columns by two rows. The corrected BM13 V3 reference sheets are original generated concept images, not historical evidence. Earlier nine-panel drafts are deprecated and retained only as history.

Primary identity references:
- https://www.wmn.poznan.pl/wystawy/plenerowy-park-sprzetu-wojskowego/
- https://www.wmn.poznan.pl/muzeum_dostepne/wyrzutnia-rakietowa-bm-13-na-podwoziu-samochodu-ciezarowegoprodukcji-amerykanskiej-studebaker-us-6/

No museum/Commons photograph is included as a texture, supplied to image generation, or redistributed with the model. A previously canceled Commons download was not retried through another route. Photographically unverified details remain labeled accordingly.
