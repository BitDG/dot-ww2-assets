# Diesel locomotive: inspected source and reuse matrix

D1 · 2026-10-10. Original collage and selected three-view v2 / six-detail v1 have been opened and inspected at actual pixels. This is an exterior game-art interpretation, not an identified historical model or an engineering plan. Four roof fans are an artistic consistency choice. Hidden surfaces are inferred. No source trademarks will be replicated.

| Family | Inspected PGF source | Decision |
|---|---|---|
| Chassis, sill, doors, tanks, steps, slats, pipes | modules/rule-kit/geometry.mjs public box, cylinder, rod, ring | Reuse public geometry, own bounded art layout |
| Railway rail/sleeper | modules/bridge/src/bridge-core.js generateBridge descriptors | Reuse only rail/sleeper/clip descriptors, one pair of rails |
| Walkway guardrails | modules/curve-infrastructure/core.mjs buildCurve | Reuse linear infrastructure, lamps=false, module-owned scale and UV adaptation |
| Existing road wheels | wheel-assembly rubber-wheel builder | Wrong identity: do not reuse rubber tires as steel wheels |
| Metal railway wheel | gustav-visual-prop actual Blender MCP rail-wheel | Author approved frozen independent node/mesh copy; retain source SHA, no dependency on its mutable core. medium source GLB SHA256 793cc1ace6ab4c22fc07445f2497c98b5730cdb19a4dfd6012dfff274a3d2fba |
| Mechanical kits | mechanical-parts asset-tools and catalogs | Generic mating/structural parts do not match locomotive cab, pilot or three-axle sideframe; avoid pretending generic boxes are authored specialty pieces |
| Angular cab / short hood / bogie sideframe / curved pilot / knuckle exterior | no matching reusable source found | Author missing exterior prototypes through actual Blender MCP, retain .blend + tier GLBs + scripts + receipts |
| Roof fans | rule-kit ring/rod/cylinder | Actual layered concentric cage, radial spokes, visual blade forms; adjustable count |
| Vehicle paint / camouflage | tank/src/portable-vehicle-finish.mjs | Owner-confirmed stable public API; paint-only roles, untouched glass, rubber hoses, bare steel and lights |
| Parameter / AssetIR / Worker / workbench | shared generator-sdk and data-workbench | One definition/schema/defaults/presets; manifest discovery without shared registry changes |

Two bogies with three axles each: 12 wheels total. Wheels are uniformly scaled and independent of body stretch; center positions follow length/spacing while rail contact follows radius. Body dimensions and bogie spacing are relative art controls. Low/medium/high geometry is actually different; immutable rule repeats batch only within the same semantic owner and material, retaining original triangle source ranges. Bogies and wheel leaves stay separate.

## Verification gates
D1 references/reuse inventory; D2 actual MCP specialty kit + parametric silhouette + true PGF GLB hero; D3 details/material/parameter extremes; D4 real Node, shared Worker, GLB and Three readback, UV/normals/no degenerate faces, owned resources, browser 950/1440/1600, cancel/regenerate, exports, material restore, actual preset PNGs.

All tests start NOT RUN. Images are not modeling evidence. Vite 8.1.5 isolated preview differs from declared 8.3; no complete production build or stdio PGF MCP claim. Existing loader uses Three 0.180.0/canvas1.0.9 approved isolated deps; no new dependency installation. Scaffold command attempted but blocked by missing zod; equivalent module-local manifest/definition/worker/workbench will be authored without adding dependencies. CodeGraph absent in this snapshot, so inspected import/API sources are the fallback; no .git exists. Only modules/diesel-locomotive/** and dev/diesel-locomotive-* are edited. Publisher owns frozen stage payload publication to dot/vehicle-blender-rebuild; main unchanged.

## Reference correction reported by user
The generated TOP panel is oblique rather than strict 90-degree top. It is not width evidence. Final actual geometry views must use orthographic cameras with vertical-down top and horizontal front/side. Preserve camera pose/projection and GLB hash receipts.

Selected reference updated to locomotive-three-view-v3-top-correction.png after actual inspection. Earlier v2 remains historical and is explicitly non-calibrated. v3 fixes presentation but generated-view drift remains; only actual common-model orthographic cameras establish final projections.

## 1.2.0 外观结构增量与材质决定
- 转向架弹簧采用 Three TubeGeometry 沿本模块螺旋路径扫掠，中档 64 / 高档 96 纵向段，低档省略；上/下弹簧座与刹车块/吊杆均复用规则几何。来源是 PGF 运行时规则装配，不冒充新增 Blender MCP 模板。
- 格栅新增真实四边厚框、旋转叶片、内支撑；窗压条/铰链/灯座为 PGF rule-kit；连续弯接扶手为 Three 曲线扫掠。均保留 owner/material 合批前语义，镜像绕序测试仍通过。
- 用户澄清直接使用 PGF 材质后，活跃代码恢复坦克公共可移植漆面适配。已完成的 9 张 Blender native material PNG 和 .blend 保留为未采用实验，不进入运行时、GLB 或本次真实渲染。
- 从未导入或复制 PGF truck 几何或表面 shader。之前模型中原有五件特殊模板仍来自真实 Blender MCP，铁路轮仍使用冻结作者来源。
