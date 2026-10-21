# QF17 Q6 · 统一 dot 接入阶段

日期：2026-10-14。作者模块 0.1.0/Q6；共享生成器 0.8.0。发布基线 main `9cf6e9487d14abf2ed9ae1019c221131da44fecc`。此阶段包是既有 PGF 的增量，不是独立应用。

## 完成

- 冻结作者核心逐文件 SHA-256 验证；三档固定源与原作者 `.blend` 保持身份，不重新建模
- 独立 `qf17-visual-prop` 进入唯一 dot 模型选择器，复用 Worker、Schema、材质、配方和静态 GLB；原十条目录记录完全保留
- 共享与作者 Node/VM：103 通过，0 失败。`qf17-combined-node.log` / `.exit`
- 统一/原生三档同请求导出逐字节一致，GLB 独立回读；`qf17-visual-prop/node-unified-report.json`
- Firefox 157 真实 GUI：48 通过，0 浏览器或着色器错误。含三档、八组部件、共享涂装、seed、取消、失败恢复、重复切换、单 canvas、停帧、GPU/Worker/URL 释放；`qf17-visual-prop/browser-report.json`
- 可见按钮实际下载后独立 GLTFLoader + PNG 解码：24 网格、50,776 三角面、3 张贴图、0 动画；`visible-button-download.glb` / `visible-download-report.json`
- 1147 → 955 → 1168 px 真实 Firefox 窗口回合：无横向溢出，模型包围盒始终在视锥内，单 canvas。`resize-roundtrip-report.json`
- 真实工作台、窄窗、冬季材质截图均来自当前 GLB，不是概念图
- 定向 dot 生产构建退出 0；`dot-build.log` / `.exit`

## 未完成与边界

- 全仓 `npm run build` 退出 127：恢复依赖没有 Vite CLI 链接；全仓 `npm test` 退出 1：缺少原仓 `modules/rock/tests/core.test.mjs`。原始日志已保留，不能宣称全仓构建/测试通过
- 作者最终冻结 GLB 的独立 PBR 多视图待补；不因运行通过宣称历史高相似
- 无真实武器操作、制造尺寸、内部机构、弹道或发射动画；固定水平炮管、正常轮式炮架与展开双尾架仅为游戏外观
- Land Mattress 尚未冻结，未注册为可运行。后续独立接入并复测
- Library 备份与标准 Git 发布分别核验；备份成功不等于远端发布成功

## GUI 复现

保留已有 Firefox157、隔离 HOME 与 `PGFSmoke`，不改安全/遥测设置。用 CUA/Sky 在云桌面 XFCE Terminal 运行 `serve-qa.mjs`（Node），打开 loopback 5199 的现有 PGF 入口：`/?generator=dot-model-generator&category=machines&towed=check&asset=qf17-visual-prop`。`towed=visual` 提供只采样窗口的同一页面。

已开 Firefox 时复用当前会话、新增本地标签，不关闭用户原有标签。地址栏 AT-SPI 输入可能失败；可通过 Terminal 启动现有 Firefox 命令传入同一 URL。不要改用无 DISPLAY/headless结论或 Chrome。回放会真实触发 GLB 下载；程序验收最后释放其工作台，视觉验收另开标签。

## 源码和发布

`QF17-FROZEN-CORE.json` 是作者冻结合同；只打包其中 `publishWhitelist`，不包含早期 Q2–Q5 GLB。已发布 L0 五件只在备份保留，不进入本次新增 Git 白名单。`QF17-GIT-WHITELIST.json` 提供本阶段精确路径/字节/SHA；`QF17-PACKAGE-MANIFEST.json` 提供完整备份清单。保持当前 Library 身份进行后续版本替换。
