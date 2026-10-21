# QF25 外观运行时接口方案（R3，真实GLB与PGF对象已验，待浏览器验收）

## 范围
- 非功能游戏美术资产。牵引展示只是一段艺术平移和双轮滚动；不表示自行行走、牵引操作流程或真实性能。
- 开火外观仅采用局部克制烟云。AWM F01697 黑白影像不足以认证火球、颜色、精确时序，因此无火球、弹道、弹丸、机械后坐或内部机构。
- 最新用户要求移除罩帽及外侧袋子，模型作者已实际删除。无罩帽不是错误：明确 metadata.showCover=false、唯一浅暗封闭口端可见、且无可见罩帽时才允许烟云；未知metadata仍拒绝。运行时不代替模型作者删除或隐藏部件。

## 宿主与所有权
沿用 src/plugins/preview.js 的 runtimeFactory({scene, object, asset, invalidate, valid})。复用宿主唯一 renderer/canvas/host tick；无 RAF、定时器、额外 renderer。API: play("tow"|"fire"), pause, reset/stop, seek, update(dt), setActive, dispose, bounds, diagnostics。

预览只临时修改借用 body root 的位置与两轮 pivot 的 quaternion；reset/dispose 恢复基线。几何、材质、纹理归宿主所有，不释放、不改写。烟云独立 sibling group，仅释放其自有/租用资源。静态 GLB 始终由不可变源 AssetIR 导出，不能从整个预览 scene 导出。

## 作者确认的模型合同（最终medium GLB已验）
- body root=QF25_ROOT；QF25_Wheel_Assembly为identity子节点；左右QF25_Wheel_Left_Pivot / QF25_Wheel_Right_Pivot。局部轴+X，外观半径.53，牵引+Z对应正滚动
- QF25_Cosmetic_Muzzle_Anchor，GLB局部+Y轴转为前向（不是+Z）；Q1实测world方向约[0,.194,.981]
- QF25_Canvas_Cover允许在明确metadata.showCover=false时物理缺失；QF25_Shallow_Sealed_Front必须唯一且可见
- 单箱尾架及收起圆盘保持作者固定外观姿态；若牵引必须变姿，应由作者给独立展示态，不推断操作机构
- 禁止通过模糊名字、最近网格或包围盒猜 anchor

## 验收分级
1. 接口/节点 fixture：只证明时序、门控、暂停/恢复、复位、重复播放及资源所有权，不代表真实模型验收
2. 实际生成 AssetIR 对象：核对唯一节点、轮轴、罩帽门控、导出前后字节及生命周期
3. 实际 GLB 重载：核对节点/姿态及静态导出无 FX
4. 唯一浏览器操作者完成 PGF 真正界面、单 canvas、PC 窗口、暂停/路由退出/重生成，实际截图/GIF；浏览器必须由主任务安排

## 当前限制
作者去帽去袋medium GLB哈希840f730f000e9cdd3df0fd0560c7ce926af1c6b22a65586f00a297dc754cf147已通过2项真实对象测试：轮轴、锚点、明确无帽、烟云和恢复通过。10项节点fixture另行标记，不写为实际GLB验收。实际PGF low/medium/high、比例边界、AssetIR对象绑定和静态GLB播放前后字节不变已通过另2项测试；仅浏览器验收未完成。现有 AWM 主体、Apollo Bay 无帽外观仅用于作者形态判断，牵引影片未核实。源码运行时目录没有 .git 或 CodeGraph 工具/索引，本模块通过读取现有宿主代码定位合同，不触碰共享 UI 或旧模块。
