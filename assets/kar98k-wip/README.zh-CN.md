# Kar98k 风格非功能外观初样 · WIP

这是调整制作顺序后，通过真实 Blender MCP 制作的原创外观初样。Firefox 只影响网页交互验收，离线建模、保存和渲染不依赖它。用户最新流程已取消 AI 概念多视图前置，改为真实外观参考；本轮未取得完整可检查的同物件真实三视像素，具体缺项见 preparation/kar98k/reference-update.zh-CN.md。初样尚未经过用户验收或馆藏照片子型核验。

- `kar98k-exterior-wip.blend`：可编辑源文件，木材/金属贴图已打包。
- `kar98k-exterior-wip.glb`：固定静态交付；`hero.png` 是重新导入这一个 GLB 后的真实渲染。
- 11 个外观网格、3 种材质，无动画，无内部结构、击发/闭锁机构、孔道或制造尺寸。坐标为无量纲游戏美术单位。
- 輪廓是作者的简化外观推测：木质主体、上护木、棕色背带有 AWM REL28841.001 馆藏文字依据；具体曲线、箍带与附件位置不声称历史准确。
- 金属使用原 PGF `metalFinishPixels` 的固定种子 PBR 输出；木材为本任务原创确定性纵向木纹与微法线（2026-10-22 替换早期复用纹理），皮革为原创常量 PBR。来源和 hash 见 `materials.json`。未下载或复制馆藏照片。

没有重试被拒 imagegen 请求。本次交付是独立的静态游戏网格及固定 GLB 的 hero、正侧顶与六个外观局部检视渲染；模型检视图不冒充原始参考。浏览器可预览调节木色、木材/金属粗糙度、整体无量纲艺术比例和背带显示，GLB 下载保持固定版本。当前没有实现参数化导出生成器或高低细节档；准备目录里的 schema 仍是未来草案。

展厅的 WIP 独立入口提供旋转缩放和 GLB/.blend 下载；这些浏览器交互代码尚未经过 Firefox 实测。新模型不会冒充原 11 款迁移资产中的已验收条目。

复现：先按 `scripts/tooling/README.zh-CN.md` 恢复已批准的任务内 MCP，再运行：

```sh
node scripts/prepare-kar98k-materials.mjs
python scripts/tooling/run-kar98k-mcp.py scripts/tooling/kar98k-exterior-wip.py
node scripts/validate-kar98k-wip.mjs
python scripts/tooling/run-kar98k-mcp.py scripts/tooling/render-kar98k-wip.py
```

脚本当前定位于 `/workspace/dot-ww2-assets`，换工作目录需更新作者脚本顶部的 ROOT 与渲染输入/输出路径。使用既有 Python MCP SDK 与 Blender；不会自动安装软件。所有调用保持安全模式、仅本机监听、遥测和外部生成服务关闭，并在完成后关闭进程。调用回执在 `evidence/kar98k-wip/`。

## 固定模型检视图

[Hero](hero.png) · [正面](front.png) · [侧面](side.png) · [严格 90° 顶视](top.png)

[木质主体](detail-stock.png) · [上护木](detail-handguard.png) · [封闭金属外壳](detail-metal.png) · [外部箍带](detail-band.png) · [托底外观](detail-butt.png) · [皮背带](detail-sling.png)

全部由同一个固定 GLB 回读实渲；源 hash、相机方向和图片 hash 见 `evidence/kar98k-wip/render-manifest.json`。木纹辨识度、历史曲线和细节仍需后续美术提升，不能把技术检查通过等同于最终质量验收。

通过：两个独立 Blender 进程生成的固定 GLB 字节一致；独立 Three.js GLTFLoader 回读得到 11 网格、2,564 三角面、3 材质、5 张解码纹理、0 动画，法线/UV齐全、属性有限、无检测到的退化三角面；回读资源显式释放。`.blend` 经 MCP 重开并检查纹理已打包。Vite 构建和新增 GLB/.blend/hero 的 HTTP/hash 检查通过。未运行：Firefox 交互、GPU 释放实测、历史子型照片对照和用户质量验收。


## 2026-10-22 木材与生成参数阶段

保持同一资产和外轮廓，替换早期近乎纯色的木材表现：原创纵向木纹、微法线与按物体纵轴连续投影的 UV。未以无法获取的照片宣称外形得到验证；参考检索结果见 `preparation/kar98k/reference-2026-10-22.zh-CN.md`。

新增实际生效的生成参数 `artScale`（0.85–1.15，无量纲）、`woodRoughness`（0.35–1）与 `showSling`（布尔），默认值见 `build-params.json`。通过 MCP runner 的 `DOT_ART_PARAMS_JSON` 提供 JSON；非法字段、错误类型和越界值在 Blender 启动前拒绝。预览参数与固定下载分开标示，默认 GLB 不随网页滑块更改。原准备目录的更多参数仍是未实现草案。

```sh
DOT_ART_PARAMS_JSON='{"artScale":1,"woodRoughness":0.58,"showSling":true}' python scripts/tooling/run-kar98k-mcp.py scripts/tooling/kar98k-exterior-wip.py
```

本日最初脚本因 `globals()` 命名空间访问被 MCP 安全模式拒绝，未执行建模。已删除该操作，改为传入经过验证的普通字面量；安全模式未关闭，也没有重复执行被拒的操作。拒绝记录保留。照片获取被代理拒绝后停止；Firefox 未运行。最新日检查、参数上下界实际导出与回读证据位于 `evidence/kar98k-wip/2026-10-22/`。
