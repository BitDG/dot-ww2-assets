# Kar98k 风格外观精修 · WIP

当前版本继续同一个非功能游戏美术资产。主形体已由等厚挤出块改为连续截面雕塑；仍未完成真实同物件多视照片核验，不是历史精确复原，也不含内部击发、闭锁、孔道或现实制造尺寸。

## 可见改动

- 木托使用变化的椭圆截面，圆润托尾、收腰及前托渐缩，替代平直厚板和突兀折线。
- 上护木沿长度改变厚度和宽度，端部收口；金属箍带改为有厚度的贴合环带。
- 封闭上壳分为主体、端环和侧面覆盖层；细小零件分别控制倒角，不再统一使用大圆角。
- 新增无触发件的外部装饰护圈、固定实心侧面凸起；全部不可操作，不形成工作机构。
- 背带以连续曲线替代折线，展示档增加皮革折返、外部扣带与表面饰件。
- 木色和现有 PGF 金属贴图保持不变，便于辨认真正的几何改善。

[同相机前后对比](comparison/before-after.png) · [Hero](hero.png) · [正面](front.png) · [侧面](side.png) · [严格 90° 顶视](top.png)

[木托](detail-stock.png) · [护木](detail-handguard.png) · [外部金属层次](detail-metal.png) · [箍带](detail-band.png) · [托尾](detail-butt.png) · [背带](detail-sling.png)

## 资产与档位

- `kar98k-exterior-wip.blend`：展示档，贴图打包，可编辑源文件。
- `kar98k-exterior-wip.glb`：默认展示档，全部新检视渲染来自这一文件。
- `kar98k-exterior-standard.glb`：同一资产标准档，主曲率采样较少，并省去折返扣带及表面饰件；不是第二个型号。
- `model-info.json`：各档实际面数与 hash；展厅使用此数据并支持切换、下载。
- `materials.json`：现有 PGF 金属材质与本任务原创木纹的来源/hash。未使用馆藏照片作为纹理。

上版完整源码、模型和渲染保留在 Git 历史 `033c819`；`comparison/before-033c819.png` 保留当时 hero。对比后图使用该版 GLB 计算相机与灯光，再替换为新 GLB 渲染，所以取景和灯光相同。没有把概念图或旧版图片标为新版实渲。

## 参数和复现

`build-params.schema.json` 定义实际支持的参数：`detail` 为 `standard` / `showcase`；`artScale` 为 0.85–1.15 无量纲整体缩放；`woodRoughness` 为 0.35–1；`showSling` 为布尔。原准备目录里的其他参数仍是草案。网页外观滑块只影响预览，下载保持所选档位的固定版本。

复用已批准的任务级 MCP 2.1.9 与 Blender 4.3.2；保持安全模式、本机监听、遥测和外部生成服务关闭。脚本定位 `/workspace/dot-ww2-assets`，其他目录需调整脚本 ROOT 与渲染路径。不会自动安装软件。

```sh
node scripts/prepare-kar98k-materials.mjs
DOT_ART_PARAMS_JSON='{"artScale":1,"woodRoughness":0.58,"showSling":true,"detail":"showcase"}' python scripts/tooling/run-kar98k-mcp.py scripts/tooling/kar98k-exterior-wip.py
node scripts/validate-kar98k-wip.mjs
python scripts/tooling/run-kar98k-mcp.py scripts/tooling/render-kar98k-wip.py scripts/tooling/render-kar98k-views.py scripts/tooling/render-kar98k-details.py
```

## 验收边界

真实 MCP 回执、档位差异、参数边界、独立 GLB 回读、确定性及网格检查见 `evidence/kar98k-wip/refinement-2026-10-22/`。初版小饰件倒角过大导致退化面，已修正；球形装饰件的隐式四边面切分曾影响跨进程字节确定性，已改为显式有序三角网格，其余面在导出前固定切分。失败与复查日志保留。

未完成：Firefox 交互/GPU 生命周期验收、真实子型照片对照、历史外观质量验收。木纹仍偏规则，部分层次和附件位置是美术推测，不能以面数增加或技术检查通过声称最终质量完成。参考检索未取得新的可检查多视像素；旧403资源、AI图像、Firefox及Library拒绝路径均未重试。
