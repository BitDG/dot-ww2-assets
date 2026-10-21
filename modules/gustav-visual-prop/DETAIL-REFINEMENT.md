# Exterior refinement after user review

User feedback relayed 2026-10-10: the G3 exterior contains too little detail. The 74,420-triangle contact-corrected first edition is an intermediate asset, not final delivery. Its complete source/evidence is frozen independently before this pass; original references and G1–G3 snapshots are unchanged.

## Three targeted regions
1. End wheel groups: sculpted closed wheel-face relief and external side-cover prototypes via actual Blender MCP; visible concentric levels, shallow recess language and panel lips, separately painted faces and bare running edges. PGF repeats covers, bands and selected cosmetic rivets.
2. Main framework and central shell: readable double-layer vertical ribs, upper/lower open cross-brace strips, panel edge returns, panel rhythm and sparse rivet strips. MCP creates layered beveled closed cladding plates. Only blind covers and static external silhouettes; no internal mechanism.
3. Walkways and rear deck: dedicated diamond-tread normal/albedo/ORM pixels, rail footplates and joints, stair edge strips. Staggered ordinary closed utility cases, decorative cable coils and short surface cables enrich the platform while retaining clear walkway gaps.

## Quality budgets
Low <=70k rendered triangles /75 draws; medium <=200k /90 draws; high <=360k /110 draws; all <=16 material slots and <=128MB. These are safety ceilings, never targets to fill. All three tiers retain identical major silhouette and contact relationships. Fine repeated details use dedicated baked textures or same-owner/material batching. normalScale remains [1,1]; normal variation is encoded in pixels.

## Gates
Actual MCP prototypes + public PGF assembly → new hero + wheel and central-walkway closeups for parent review → final API/Worker/GLB/Three/Blender evidence → Firefox differential acceptance and fresh actual Three preset thumbnails. The existing isolated preview remains the baseline for shared lifecycle checks until a separate v2 preview package is handed over.

## Clarified material direction and geometry review
The user clarified that separate Blender materials were unnecessary and PGF materials should be used. The completed bake experiment is preserved without active imports. Active 1.1.1 instead corrects three visible geometry gaps: rounded/stepped wheel-row side layers, a bevelled sloped closed pedestal replacing a plain box, and folded stair-side thickness with explicitly connected handguard ends. Twelve tests include end-deck/wheel spacing and actual platform-guard contact through artistic scale extremes. Final acceptance requires the same camera views; triangle count alone is not acceptance.
