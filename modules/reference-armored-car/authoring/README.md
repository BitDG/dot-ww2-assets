# Blender authoring checkpoints

This directory documents a work-in-progress exterior artwork rebuild for `reference-armored-car`. It is separate from the Humvee-style `armored-4x4` generator.

## Reference authority

- Primary: the user-supplied 800 × 587 photograph of a brown, angular four-wheel vehicle, with an outline diamond, front chain and rear luggage
- Secondary: generated three-view sheet, whose front/top and unseen surfaces are AI-inferred and not exact aligned projections
- The old white-star photograph and its projection textures do not apply to this rebuild
- All dimensions are approximate visual proportions in metres. The model is nonfunctional game art. Pivots are exterior pose rotations only
- No numerical likeness percentage is asserted

## Stages

1. Structural neutral render: large forms, named part owners and wheel/turret/barrel pivots
2. Revised structural render: fuller tire sidewalls, recessed wheel dishes, lower/faceted turret and continuous stepped nose shoulders
3. Pending: chain, canvas folds and ties, stamped cans, panel fittings and controlled PBR wear
4. Pending: high/medium/low modular kits, actual Blender GLB reimport, runtime/export integration and browser acceptance

The frozen stage manifest lists the exact source/artifact hashes included in each approved checkpoint. Authoring .blend files and GLBs contain only the asset; the image uses a separate neutral studio floor and lighting.

## Reproduction

Run the frozen Python source through Blender MCP `execute_blender_code`, with Blender 4.3.2. Change the source's single `BASE` output path to the desired module directory first. The script creates a fresh asset, writes the .blend and GLB with named ownership, then makes the actual Cycles render. Do not run it inside an unrelated unsaved Blender document.

The verified environment used an actual stdio MCP client → mcp-for-blender 2.1.9 → bounded localhost add-on → Blender 4.3.2 path. Safe mode and telemetry-off were enabled. No third-party asset services were used. Each operation stopped its owned Blender process afterward. OpenImageDenoise is unavailable in this Blender build, so evidence renders use Cycles without denoising.

A dependency-free structural check can be run with:

    node dev/reference-armored-car-blender-audit.mjs modules/reference-armored-car/assets/blender/reference-armored-car-structural-v3.glb

This checks finite coordinates, triangle areas, normals, UVs, hierarchy and bounds. It is not a substitute for the separately recorded Blender reimport and visual review.
