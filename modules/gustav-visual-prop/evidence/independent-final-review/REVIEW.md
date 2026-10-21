# PGF 两个最终外观资产独立只读审查

结论：几何、嵌入资源、语义和当前材质接线通过本次独立检查。原 Gustav G6 的 72 个同索引同绕序重复面已在 G7 修复并复测。此结论不等于视觉相似度或完整产品验收通过。

## 最终固定输入
- Gustav G7 / 1.1.2：modules/gustav-visual-prop/evidence/gustav-G7-3e988dcd.glb；SHA256 3e988dcd4e60a72996030c23a58e54476a12ab08264ecc3cfa6308b968d54590；6,418,624 bytes；146,012 渲染三角；74 draw；19 唯一 mesh；7 材质、6 嵌入 PNG
- Diesel D6 / 1.2.1：modules/diesel-locomotive/evidence/diesel-medium.glb；SHA256 bb62ac17a9e3b57d581cc52aff70495fdd1b52973b5c60c6f035d737e40f72cc；3,131,440 bytes；86,716 渲染三角；48 draw；37 唯一 mesh；9 材质、3 嵌入 PNG

## 独立实测
两个文件均通过 GLB header/chunk/bufferView/accessor 边界检查；无外部 buffer/image 依赖；PNG CRC 和压缩数据解压长度完整；材质—纹理—图像引用有效。所有 accessor 非有限数、索引越界、零面积三角、叉积平方小于 1e-20 的极小面积三角、单位法线误差超过 1e-3、同位置三角重复、同索引同绕序重复均为 0。检查了可达节点层级、节点变换非有限数和零 scale。

G7 保留 74 语义组件、1,418 合批 sourceParts、6 sockets；D6 保留 48 组件、1,661 合批 sourceParts、9 sockets。sourceParts 范围连续、不越界，socket 指向存在的 pgfNodeId。裸钢/玻璃/橡胶等非 armorPaint 角色未引用涂装 baseColorTexture。当前 definition/core/worker/workbench 的静态本地 import 闭包分别检查 53/55 文件，未引用 native-finish、blender-native-pbr 或 native-surfaces。实际 core 采用 PGF portable vehicle finish；Gustav 甲板另用模块内 PGF deck finish。

## 已阅执行证据（本审查未重跑作者测试）
- G7-core-tests.log：13/13；G7-acceptance.log：12 变体；G7-worker.log：passed；G7-surface-audit.log：同 owner/material 合批前后 Float32 面坐标哈希相同
- G7-source-reopen-mcp-receipt.json：真实 MCP PASS，导入、保存、重开后 146,012 三角、74 mesh。另将回执 perMesh 与本次独立解析 GLB 的全部 74 节点三角数逐一比对，完全一致
- D6-core-tests.log：12/12，另 D6-visible-depth-test.log 1/1；D6-acceptance.log：13 变体；D6-worker.log：passed
- D6 hero、bogie-detail、side、top、front MCP 回执均 PASS，并绑定最终 bb62ac17 SHA；这是回执审查，不是本次重新渲染或逐像素视觉评价
- 两者隔离 preview build 日志成功；存在大 chunk 警告，不代表完整生产构建或全仓库测试通过

## 已修及未验证
- G6 72 重复面：已定位、由作者源端修复，G7 本次独立复测为 0；旧 G6 审查保留于 G6-historical-geometry-audit.json
- G6 文件 bytes 与 AssetIR 估算混淆：已修复区分并核对；G7 实际文件长度与声明一致
- 不把 G6 实渲图直接认证为 G7 新 SHA 实渲。G7 目前本审查确认的是真实 MCP 导入/保存/重开；最终同 SHA hero、严格正交、Firefox UI/下载/预设图验收应由对应最新证据另行完成
- 未验证完整生产构建、全仓库回归、PGF stdio MCP 全链；未做全模型碰撞/流形/跨 mesh 重合求解；未声称相似度、历史准确度或工程功能

## 审查产物与修改边界
独立脚本 audit.py / semantic_audit.py，结果 geometry-audit.json / semantic-audit.json。所有本审查写入仅在 pgf-model-final-review；未改 PGF 源文件或作者 evidence，未安装软件，未执行会覆写作者证据的测试。
