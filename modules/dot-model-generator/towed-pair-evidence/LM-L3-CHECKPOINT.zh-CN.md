# Land Mattress L3 / dot 0.9.0 · 最终接入与两款实渲增量

日期：2026-10-14。基线：已发布 QF17/dot0.8.0 main `00465811a4bbe5664b081fe338e465003c8018d8`。本包是 PGF 现有仓库的增量，不是独立应用；不覆盖 QF17 已发布核心或 L0。

## 已通过

- `land-mattress-visual-prop` v0.1.0/L3：No.8 Mk I / 1945 年外观，固定 30 浅封闭口（5×6）、单轴双轮与空载停放；冻结作者核心 14 件逐 SHA 验证未变
- 三档实际源 16,580 / 48,036 / 96,356 三角面；统一/原生同请求 GLB 逐字节一致并回读。`land-mattress-visual-prop/node-unified-report.json`
- 唯一 dot 工作台复用同一 canvas、Worker、Schema、材质、配方与导出；原十一条目录记录完整保留，现在十一款可运行，K5 仍不可用
- 共享+QF17+Land Node/VM 合计 120 通过、0 失败；最后目录/源校验 13 通过。`pair-combined-node.log` / `.exit`、`pair-final-catalog-node.log`
- Land Firefox 157 真实 GUI 51 通过、0 浏览器/着色器错误；三档、八部件、材质、seed、取消、失败恢复、重复切换（含 QF17）、单 canvas、空闲停帧、释放全部实跑。`land-mattress-visual-prop/browser-report.json`
- 可见 GLB 按钮真实下载，独立 GLTFLoader 与 PNG 解码回读：26 网格、48,036 三角面、3 贴图、0 动画。`visible-button-download.glb` / `visible-download-report.json`
- 1168 → 955 → 1168 px 两个窗口回合：全部视锥边界/无溢出/单 canvas 通过；真实整窗、窄窗、冬季材质与下载完成截图均保留
- dot0.9.0 定向生产构建退出 0。`pair-dot-build.log` / `.exit`
- 两款作者最终实渲均齐：各自同一冻结 medium PBR GLB 的 hero、严格正交三视及六细节，真实 Blender MCP 回执、相机配置和 source SHA 可追溯。QF17 新增证据 `modules/qf17-visual-prop/evidence/Q6-final/`；Land 新增证据 `modules/land-mattress-visual-prop/evidence/final/`

## 明确边界

- 动画均未提供，所有动作按钮保持禁用；GLB 只有静态外观、共享 PBR 和语义层级。没有武器操作、内部机构、制造测量或弹道模拟
- 形体为简化、未测绘的游戏外观；支脚、翼板、小件和隐藏面含美术推测。QF17 medium 炮口/轮胎近景保留可见分段轮廓，不据技术验收声称高精度历史复刻
- 最终版面只由实际 GLB 渲染像素组成；参考目录中的 AI 概念图不能替代实渲。馆藏照片/PDF未随包分发
- 本地全仓聚合未完成：QF17阶段曾因恢复快照缺 Vite CLI 链接（build 127）及其他模块测试源（test 1）失败；0.9.0 本地只计定向构建和本任务 120 项通过。0.9.0 标准 Git 发布与远端完整 CI 由父任务另验，未在本包中冒称通过
- 作者原生 `.blend` 与完整制作史由各自独立 Library 阶段包保留；本接入增量不重新生成原资产

## 恢复与发布

复用已接受条款、关闭诊断/崩溃发送的现有 Firefox157/PGFSmoke profile，通过 CUA/Sky 的云桌面 XFCE Terminal 使用现有服务脚本，loopback 5199 的实际 PGF 入口参数 `towed=check&asset=land-mattress-visual-prop` 或 `towed=visual&asset=land-mattress-visual-prop`。不换 Chrome、不用无 DISPLAY/headless 替代、不改安全设置。

`PAIR-GIT-WHITELIST.json` 是从上述基线应用的精确新增/修改路径、字节数和 SHA；没有删除项。仅覆盖明确的共享接入文件，QF17 作者目录只新增最终实渲 8 件，Land 只使用冻结/明确授权的模块、来源与证据。`PAIR-PACKAGE-MANIFEST.json` 是完整备份清单。Library 成功与 Git/CI 成功分别核验，后续修改使用同一 Library 身份替换。
