# 装甲越野车 · 图像重建

根据用户提供的两角度图片和新生成的正/侧/后三视图制作的近似程序化模型。侧面涂装使用原始照片去光照后的像素，窗户与设备区域由附近原始漆面补齐；轮胎侧壁和凹面钢轮毂使用原始轮胎颜色投影在实体曲面上；未展示的后部、底盘和对侧设备属于推断。不是扫描模型，未达到照片级几何/纹理还原。

用户要求整体、关键部件和各验收视角均达到 0.90；当前状态为 **未通过**，不能把功能测试或可导出 GLB 当成视觉达标。`quality.mjs` 检查记录完整性和最低评分，不产生视觉评分。`outputs/armored-4x4/quality90/` 保存原图对比、每轮 Chrome 截图、相机、源文件哈希和主观视觉评审。生成的正/后视图仅用于推断，不能证明原车辆隐藏结构的真实性。

- `model.mjs` 的 `buildVehicle(params)` 返回 Three.js Group；使用后调用 `disposeVehicle(root)`。
- `definition.mjs` 唯一拥有 Schema、9 个参数、5 个预设和 Node/MCP/浏览器生成接口；清单自动注册在机械分类。
- 复用 `wheel-assembly/buildWheelGroup` 的胎体，附加实体胎块、厚胎肩、凹面钢制轮辋与八颗螺栓。复用共享 Worker、参数页签、AssetIR、PNG、GLB 和渲染调度。自己的预览器支持阴影、环境反射、部件点击选择、按需重绘及完整销毁。
- 米、Y-up、+X 车头。转向、设备开关与分解参数可导出当前静态姿态，GLB 不包含动力学或动画片段。
- 图像与建模记录：`outputs/armored-4x4/`。img2threejs intake、PBR 和严格规格验证已执行；像素对齐轮廓门槛仍未通过，不能宣称完整技能质量认证。

验收：`node --test modules/armored-4x4/tests/model.test.mjs`，`node outputs/armored-4x4/browser-acceptance.mjs`，`node outputs/armored-4x4/mcp-acceptance.mjs`，`node dev/generator-contract-audit.mjs --generator armored-4x4`，`npm run build`。预设缩略图来自本模块自己的真实 Chrome 预览，由 browser-acceptance 和 media.py 离线生成。
