# BM13 B6 可恢复交付流程

更新：2026-10-14。共享生成器 0.7.0；作者模块 0.1.0/B6；仓库基线 main 416b1123c591375ca5fcd630391494df6d0c2774。不要重复创建模型或第二个生成器 UI。

## 1. 作者产物：已验证

独立模块：[`../../bm13-us6-visual-prop`](../../bm13-us6-visual-prop/)。三档源 GLB、定义和材质适配器保留原冻结身份；阶段包 `PACKAGE-MANIFEST.json` 逐文件记录 SHA-256/字节数。作者说明与实渲见 [`作者交付说明`](../../bm13-us6-visual-prop/docs/BM13-B6-DELIVERY.md)。固定空载外观，10 轮节点，零动画，不含功能发射机构。

原作者 Library 条目 libfile_00f0c126a4b081918d7c7776ce7c7532 v1 保留完整 .blend 源、审计和实渲，不重新生成。

## 2. 集成与审计：已验证

共享入口见 [`../catalog.mjs`](../catalog.mjs)，原资产保留。Node 合计 99 项通过见 [`combined-node.log`](combined-node.log)；最终目录元数据复测见 [`final-catalog-node.log`](final-catalog-node.log)。三档同请求统一/原生导出一致见 [`node-unified-report.json`](node-unified-report.json)。

定向构建脚本 [`build-check.mjs`](build-check.mjs)，最终结果 [`dot-build.log`](dot-build.log)、[`dot-build.exit`](dot-build.exit)。全仓构建尚失败，原恢复副本缺少其他模块输入，原始回执 [`build.log`](build.log)，不可宣称全仓构建通过。

## 3. Firefox 同 profile GUI：已验证

保留已恢复官方 Firefox、PGFSmoke profile 与隔离 HOME；从现有云桌面 Terminal 启动 [`run-gui-qa.py`](run-gui-qa.py)，不是无 DISPLAY 的隔离 shell。它使用 [`serve-qa.mjs`](serve-qa.mjs) 在 loopback 5198 启动既有 PGF 宿主。无需安装、无需重新接受条款。

首次条款于 2026-10-14 经披露后的用户继续授权接受；诊断/交互和崩溃报告复选框均关闭，回执 [`Firefox-consent-data-disabled.png`](Firefox-consent-data-disabled.png)。旧受遮罩截图仅作历史记录。

程序化 47 项通过：[`browser-check.mjs`](browser-check.mjs)、[`browser-report.json`](browser-report.json)。可见缩放三次采样通过：[`browser-visual.mjs`](browser-visual.mjs)、[`visual-report.json`](visual-report.json)。真实窗口图：[`整窗`](BM13-Firefox-workbench.png)、[`窄窗`](BM13-Firefox-narrow.png)、[`冬季材质`](BM13-Firefox-winter.png)。可见导出按钮下载的静态 GLB：[`BM13-visible-winter-download.glb`](BM13-visible-winter-download.glb)，独立回读 [`visible-download-report.json`](visible-download-report.json)。停止服务可在本目录创建 stop-qa 文件，恢复前移除该停止标记。

## 4. 同 Library 阶段备份：已验证 v1，准备 CAS 更新 v2

固定条目 libfile_c503abfc44948191af8c229e0ff212a2。用 [`package-checkpoint.py`](package-checkpoint.py) 生成同名 ZIP，并验证全部成员 hash。外部 package-receipt.json 记录 ZIP/hash；PACKAGE-MANIFEST.json 是包内规范清单。更新必须 expected_current_version=1；成功回执保存 library-receipt.json，按返回值同步本地 xattr。版本冲突先读回，不盲重试。真实整窗截图条目是 libfile_bc906cc505a4819192fd9d6f97f03d29 v0。

## 5. 标准 Git 发布：待云任务执行并远端回读

由独立已创建的保存云环境任务负责。使用最终精确文件清单及 SHA，先确认 main 基线未变，复用未变 blob，仅推送本阶段 diff。不要把 Library 备份成功视为已发布；不要重建模型。发布后必须记录 commit、分支、推送结果，并回读远端树和关键文件 hash。若鉴权或网络失败，保存精确错误与目标，取得所需授权后再继续。

当前 Firefox 打开 github.com 返回 Unable to connect，因此这一路线登录态未知；未尝试登录或上传。标准 Git 云任务的网络/推送结果仍待其自身回执，整条发布链尚未宣称完成。
