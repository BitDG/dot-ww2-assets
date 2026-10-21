# Diesel locomotive exterior reference

## Source and scope
- User supplied Library image: libfile_65668fdf33688191938748f074dfb8d7, version 0, backing file file_00000000664081fb8fbb88c4d5726c69.
- Materialized source: `;D.jpg`; Library xattrs applied with current helper.
- Actual inspected image is a three-image collage of an American diesel locomotive. Top view is yellow Union Pacific livery, number 3530; lower two are gray exterior renders of similar locomotive forms. No exact historical model is asserted.
- Artwork/layout templates: `../pgf-gustav-references/gustav-three-view-v2.png` and `../pgf-gustav-references/gustav-exterior-details-v1.png`, both visually inspected.
- Generated using the built-in image generation tool. Source marks were not reproduced. New outputs are separate references, not modifications to the imported source.

## Selected deliverables
1. `locomotive-three-view-v2.png` — 1774 × 887, corrected side/top/front board, gray metal on light background.
2. `locomotive-exterior-details-v1.png` — 1536 × 1024, six exterior detail crops.
- `locomotive-three-view-v1.png` retained as earlier version, not recommended for delivery.
- Exact generation prompts: `prompts.txt`; one targeted correction: `correction-prompt.txt`.

## Visual verification
- All source/template/output images were actually viewed.
- The selected three-view board has separated SIDE/TOP/FRONT panels, whole-body silhouette and two three-axle bogies.
- One targeted correction reduced the side-view roof fan count to four to match top view. Longitudinal placement is still approximate rather than a registration-grade orthographic blueprint.
- Six-panel board contains cab/short hood, engine hood/grilles, walkways/railings, three-axle bogie, roof fans, and pilot/coupler.
- Generated views are artistic interpretations. Hidden surfaces, roof arrangement, fine hardware and cross-view alignment are not factual engineering evidence. Number of fans in the original is not established; four is an artistic consistency decision.
- Both boards retain visible artistic-interpretation footer. No measured dimensions or engineering specifications.

## Visual modeling modules
1. Main long chassis / side sill and underbody tank: establish length/width silhouette first.
2. Short front nose + angular cab + long rectangular hood: distinct meshes with bevels; cab glazing as dark inset planes.
3. Front and rear bogie assemblies: two visually separate repeated modules; each has three axles and six wheels; avoid accidentally producing four-axle trucks.
4. Side walkways / end platforms / stairs: consistent slender railings, larger readable stairs, tread texture rather than excessive geometry.
5. Long hood access doors and radiator grilles: repeated panels and shared trim atlas / normal detail; preserve large rectangular rhythm.
6. Roof fan / grille / exhaust silhouettes: visually plausible art modules, not internal machinery; follow a single coherent arrangement when constructing mesh.
7. Front pilot / knuckle coupler / hanging hose shapes: silhouette-focused external meshes.
8. Small lights / blank number plates / horn / handles: separate detail layer. Optional yellow livery must be chosen by parent/user later; current requested references use gray metal.

## Handoff constraints
- No PGF code or existing vehicle/Gustav assets were edited.
- No Library upload or publishing was performed; parent handles ordered upload and delivery.
- These are reference images only; no 3D model is claimed complete.
