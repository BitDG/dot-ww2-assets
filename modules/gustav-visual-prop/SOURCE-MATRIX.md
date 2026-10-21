# Gustav exterior game-art: source matrix and acceptance contract

2026-10-10. Stage G1. All four supplied/generated reference images have been opened and visually inspected in this task. Originals and the selected three-view v2/detail v1 are frozen under references/. The rejected v1 is not used.

## Scope
Nonfunctional game prop only. Coordinates are arbitrary art units carried through PGF's meter-compatible container; no historical scale claim. No internal weapon mechanisms, operating controls, firing/recoil simulation, engineering fit, manufacturing dimensions or performance model. All hidden faces, decorative repeat counts and underside panels are artistic inference. The two originals disagree at the rear deck; the generated orthographic sheet guides overall balance and the perspective original guides layered massing. All final views must come from one actual mesh.

## Inspected sources and decisions
| Visible family | Actual source/API | Decision and evidence |
|---|---|---|
| Repeated railway metal wheels | wheel-assembly buildWheelGroup is a road tire | Do not recolor rubber tires. Author a closed stepped metal wheel facade with lip/disc/hub in actual Blender MCP; uniform scale per wheel in PGF |
| Broad sloping outer side panels | generic rule-kit extrude exists, no matching reusable panel | Actual Blender MCP bevelled silhouette shell prototype, parameterized placement/relative scale by PGF; reference side + detail panel 02 |
| Scalloped end-car side fairing | no matching rail facade in audited catalog | Actual Blender MCP closed profile prototype; reference detail 01; no suspension internals |
| Central outer shell | no matching exterior mass in catalog | Actual Blender MCP bevelled closed silhouette prototype; reference side/front; underside opaque and inferred |
| Main beams, walkways, braces, trim, gantry | public rule-kit box/rod/cylinder | Direct API reuse with module-owned art layout; not a copy of private bridge beam helper |
| Four display rails and sleepers | public bridge generateBridge / modern part descriptors | Select only sleeper/clip/rail-* descriptors, rotate long direction into module X, remap art width/height; no bridge deck or pillars |
| Railings | public curve-infrastructure buildCurve | Generate lamps=false rail curves, convert its positions/UV into owned Three meshes, thin to art proportions; shared generator retains source identity |
| Closed elongated cylinder + collar bands | rule-kit cylinder/ring | Rule pieces only; dark front is a shallow opaque cap, never a functional bore |
| Stairs, ribs, rivets, seams, decorative boxes | rule-kit box/rod/cylinder | Repeated cosmetic components; omission at lower quality is explicit |
| Painted PBR and camouflage | tank/src/portable-vehicle-finish.mjs | Stable owner-approved interface; paint roles only; bare wheel treads/rails remain unpainted |
| Assembly/AssetIR/workbench | defineGenerator, threeToIR, prepareGenerator, shared Worker/workbench | One schema/defaults/presets; no custom MCP ID branch; stable owner/source/socket metadata added explicitly |

Blender MCP originals: assets/blender/*.{blend,glb}; authoring script and invocation receipts are retained. Compilation losslessly packages the same exported geometry for synchronous PGF runtime. It does not substitute a static whole vehicle for parameterization.

## Visual parameter contract
Only bounded dimensionless silhouetteLength/Width/Height (0.85–1.15), wheelVisualScale (0.85–1.15), shellLengthFactor (0.9–1.1), frameChunkiness (0.85–1.15), detail low/medium/high, cosmetic rivetDensity/weathering, paintColor/metalColor, shared camo fields and component switches. Seed is request-level. Wheel circular cross-sections never inherit silhouette stretch. Ground/display contact is recomputed from wheel radius and rail top. No operational pose parameter.

## Checkpoints and evidence gates
G1: source images, inspected matrix, parameters and tests planned. G2: actual MCP prototypes + PGF silhouette, rendered side/front/top/hero; parent silhouette review before detail expansion. G3: layered details/PBR/independent roles/parameter extreme tests and deterministic seed. G4: prepareGenerator → AssetIR → actual GLB → Blender/GLTFLoader readback, budgets, UV/normals/area/owners/sockets, preset renders, shared Worker and real Firefox PC 950/1440/1600 plus cancellation/restore/disposal/download.

Detail limits (rendered instances): low 120k triangles/1400 draws, medium 260k/2400, high 520k/3800; all <=128MB encoded and 16 materials. These are acceptance ceilings, not measured claims. Tiers are generation presets, not automatic runtime LOD.

All checks begin NOT RUN. Node tests are not browser acceptance. Dependency loader uses authorized isolated Three 0.180.0 and canvas 1.0.9; Vite 8.1.5 preview is not a fully lock-matched production build. No .git exists in the supplied source snapshot; publishing belongs to the designated publisher on dot/vehicle-blender-rebuild, never main.

CodeGraph consultation: no .codegraph database or executable is present in this source snapshot; mcp/graph.mjs is an asset graph validator, not a repository CodeGraph database. Static import/API inspection above is the available fallback, with runtime verification still mandatory.

Reusable presentation template requested by user: realistic gray/metal appearance, pale background, consistent lighting, separated side/top/front panels and six exterior close-up panels. Mark inferred/hidden surfaces. This is presentation style, not permission for calibrated measurement.

## G4 detail refinement (v1.1.0)
Actual Blender MCP added five closed external art prototypes: sculpted wheel facade, layered end/frame cover, layered central cladding, beveled ordinary utility case and decorative closed cable coil. Source script `dev/gustav-visual-prop-blender-detail-kit.py`, successful receipt `evidence/G4-detail-kit-mcp-receipt.json`, compressed native source `assets/blender/gustav-exterior-detail-prototypes.blend`. Three compiled tiers preserve the original source GLB hashes; exact file audit is `evidence/G4-detail-provenance.json`. PGF assembles/repeats these alongside its boxes, rods, bridge rails and curve railings. Deck tread is deterministic module-authored encoded PBR, not external photography or a measured manufacturing pattern.

## G6 targeted geometry revision (active 1.1.1)
The active material path remains PGF, following the user's clarified instruction. The separate native material bake is retained only as an unadopted experiment (authoring/UNADOPTED-NATIVE-PBR.md); it is not imported by core/definition.
Three additional actual Blender MCP exterior prototypes are now assembled at runtime: closed stepped/sloped plinth, layered rounded blind wheel-row cover, and bevelled folded stair side. Their geometry is not a texture replacement. PGF rods close handguard endpoints against the actual public curve-infrastructure post coordinates, and PGF strips connect paired wheel-row covers. Source tier kits now contain twelve authored parts. The adopted creation receipt is G6-geometry-retry-mcp-receipt.json; the earlier G6 invocation only repeated the previous nine-part script after a preparation error and is not evidence of the new geometry.
