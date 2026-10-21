# 来源与许可

资产及必要的共享运行源码来自 BitDG/PGF，冻结提交 `ab3216828c8e289f0e118a96cfbd7d05f1a0576c`。逐文件 Git blob 和 SHA-256 见 `provenance/import-manifest.json`。修改列表见 `provenance/migration-deltas.json`。K5 参考资料单独来自已记录分支，见 `provenance/archive-manifest.json`。

用户授权将自己的模型项目迁入此仓库。源仓库根目录没有可供本次统一沿用的 LICENSE；本仓库不擅自给所有模型授予 MIT、CC0 或商业再分发许可。公开可读不等于第三方可以无条件复用。各作者说明、模型出处、推测范围、AI 概念图身份、材质来源和已有许可按原文保留。历史证据不是本次验收。

必要共享代码中的原许可证：
- `modules/tank/upstream/vendor/legacy-tank-source/LICENSE`
- `modules/realmap/LICENSE`

运行时 npm 包按各自包内许可使用：Three.js、Ajv、ajv-formats、fflate；开发工具 Vite 和验证工具 @napi-rs/canvas 的许可由各自包提供。未将 node_modules 上传到仓库。

Kar98k 准备仅记录馆藏网址和事实，未复制馆藏照片、未作为图生图或贴图输入。K5 图片是原有 AI 概念参考，明确不当作模型、历史照片或工程图。原 PGF 无关项目、账户凭据与私人配置未迁入。

四张原始观察输入图因没有明确再分发许可记录，本次不复制到新仓库；它们仍在 PGF 原处，且不是运行依赖。详情见 `provenance/excluded-reference-inputs.json`。由此原文中指向这些输入图的历史说明链接不会在新仓库解析。
