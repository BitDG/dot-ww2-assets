# Rebuild sequence and evidence scope

Baseline: BitDG/PGF main `02681b6` source snapshot. ID/version remain `reference-armored-car` / `1.1.0`; the visual revision records the changed default yaw/color and the additive tank finish controls. Original input pixel hashes and the inferred-view warning remain in `reference-config.json`. Stage 03 files are immutable and separately hashed.

## Authoring

Run the Python scripts through the approved actual Blender MCP command, never by substituting an unrecorded plain Blender build. Scripts currently carry this execution workspace's absolute BASE; update that one path consistently for another checkout. MCP safe mode permits Blender operators and pure geometry work, not arbitrary filesystem access.

1. `dev/reference-armored-car-blender-stage03.py`: accepted structural-v3 source and neutral render
2. `dev/reference-armored-car-blender-detail.py`: exterior chain, markings, cans, cloth and panel detail
3. `dev/reference-armored-car-blender-textures.mjs`: same actual tank/accessory pixel algorithms as runtime, 20 source PNGs; requires the locked Three dependency
4. `dev/reference-armored-car-blender-pbr.py`: portable material binding and editable packed detailed `.blend`
5. `dev/reference-armored-car-blender-export.py`: owner/material batching and cleaned three geometric tiers; text cap slivers below a dedicated threshold are removed before float32 export
6. `dev/reference-armored-car-blender-compile.mjs`: extracts the actual local positions/normals/UVs/indices and transforms, then losslessly compresses; verifies byte equality immediately
7. `dev/reference-armored-car-blender-acceptance.mjs` and module `tests/*.test.mjs`: canonical definition, actual shared Worker and PGF GLB roundtrip
8. `dev/reference-armored-car-blender-runtime-render.py` / `...-camo-render.py`: Blender MCP reimports the actual runtime GLB and renders it without rebuilding its geometry

`...-tank-pbr.py` and `...-tiers.py` are fast equivalent material/tier updates from the already-batched kit, avoiding an unnecessary full geometry rebuild. No slider invokes Blender. The canonical runtime definition remains the source for workbench, review and export.

## Evidence

- Stage 03: parent-reviewed structural shell, neutral visual checkpoint
- 04: neutral detail review before chain/diamond-fit corrections
- 07/08: actual PGF GLB PBR render before the user's later tank-material request; exact corresponding GLB retained in `evidence/pre-tank/`
- 09: actual MCP binding and export of the shared tank PBR into the source kits
- 10: final actual runtime tank-material GLB render, with actual MCP reimport receipt and current-byte binding validation
- 11: native `compress=True` source `.blend` save plus actual reopen; exact object/geometry/UV/material/packed-image snapshot equality, 13,045,141 → 3,750,973 bytes
- `pbr-parity.json`: actual source 20-image and runtime 6-image defaults, factors and sampled pixel equivalence
- `tank-pattern-coverage.json`: every existing pattern ID executed with source painter, not a render of every pattern
- `worker-byte-parity.json`: actual Node Worker transport and identical Node/Worker GLB hashes for original/desert

All styles are exterior game artwork. Unseen faces and scale are inferred. No numerical ground-truth likeness score, working mechanical design, AO preservation, browser/Skia pattern pixel identity, or unrun PGF stdio MCP acceptance is claimed.

Current authoring scripts save new `.blend` files with native compression. The frozen stage03 script and original stage04 payload remain immutable historical evidence. `stage-04b-compression-manifest.json` is a one-file source-container replacement with proof; it does not change generated geometry or materials.

Four actual native Firefox preset downloads are checked by `preset-artwork.test.mjs`. Use `dev/reference-armored-car-blender-browser-downloads.mjs ACTUAL.glb [ACTUAL.recipe.json]` for actual browser download geometry/PBR/recipe comparison. Source text changes against the external baseline archive are in `source-review.patch`; generated buffers and binary assets are covered by frozen manifest hashes.
