# N41 单预览宿主发射演出 runtime

这是统一 dot 模型生成器的可选 runtime，不注册第二个工作台。它借用 PGF 已经上传的 N5 object、scene 与材质，只增加独立的临时特效根。没有 renderer、显示 canvas、相机、控件、渲染循环或 RAF。

## 宿主接口

`import { createHostedLaunchRuntime } from '../nebelwerfer41-launch-runtime/index.mjs'`

作为 `createPluginPreview` 的同步 `runtimeFactory` 返回值使用，输入：

- `scene`、`object`：已经由宿主创建、上传并持有的 Three 对象
- `asset`：只读 AssetIR，用于诊断来源
- `invalidate()`：请求宿主绘制一次
- `valid()`：初始异步加载阶段的过期检查
- `reframe()`：首次有效 ready 后最多请求宿主重新取景一次，之后不会抢占用户相机
- 可选 `config`：原 N4 合法美术配方；不接受任何操作或真实性能参数
- 可选 `onFrame(snapshot)`：状态通知，不负责绘制

返回：

- `ready`：当前初始化 Promise，失败可拒绝；内部已安装 rejection handler，宿主可选择等待
- `available`：是否有完整六个源美术锚点；关闭管束时为 false
- `playing`：只有已就绪、激活且正在播放时为 true
- `play()`：清空旧效果并从头重播；连续调用仍只使用一次加载
- `pause()`、`resume()`、`stop()`、`reset()`
- `seek(seconds)`：原定步长 core 从头重建该美术时刻，保持原播放/暂停状态
- `update(dt)`：只能由宿主唯一的 tick 调用，dt 为秒
- `setActive(value)`：暂停隐藏页的推进；宿主恢复时应清除自己的上一帧时间
- `configure(config)`：验证并重置美术配方
- `diagnostics()`、幂等 `dispose()`
- `bounds()`：THREE.Box3 世界范围，涵盖静态模型、原 N4 曲线控制点凸包、自有弹体几何半径与当前可见粒子朝向无关包围球

`diagnostics().error` 可直接用于关闭管束或资源加载失败的提示。初始 `valid()` 失效只取消那次初始化：如果参数编辑取消后宿主仍保留旧资产，后续 `play()` 可以重试。成功绑定后不持续使用旧 ticket 的 `valid()`；宿主替换资产时必须先调用 runtime.dispose，再释放原 object。

## 资源与视觉边界

- 原 N4 最终 0.4.2-runtime 的 sequence-core、PGF adapter、projectile GLB 逐字复制至便携源码引用目录；哈希见 source-provenance.json
- 特效本体直接 import 既有 `modules/combat-fx/runtime`，没有第二套 FX 实现。其内部离屏 2D 贴图 canvas 沿用原实现，不是显示 canvas
- 使用 N5 的 Group → Mesh 包装读取六个具名美术锚点；不写 geometry.boundingBox，也不修改源 geometry、材质或 AssetIR
- 自有特效根挂在 scene，位于 asset 层级之外，并跟随借用 object 的矩阵。宿主场景背景、灯光、相机与显示尺寸保持由宿主控制
- N5 已包含浅暗封面，不再运行外观补丁。关闭管束时停止提供发射演出，不生成假锚点
- 所有位移、烟尘与次序均为原 N4 的美术演出，无真实操作、机构、点火次序或性能模拟
- 静态导出仍导出原 AssetIR；不含临时弹体、粒子或时间轴。capabilities 明示 `exportedAnimation:false` 与 `exportedParticles:false`

## 验证

在 PGF 根目录运行：

`node --test modules/nebelwerfer41-launch-runtime/tests/*.test.mjs`

已覆盖实际 N5 AssetIR 经 PGF 上传后绑定、Three 0.180.0、原 PGFCombatFX、反复播放、暂停/恢复、隐藏、结束、seek、stop/reset、异步迟到取消、销毁、保留旧资产的重试、缺少管束、静态 GLB 字节不变以及资源归属。证据在 evidence/。

这些 Node 测试本身不证明 GPU shader 或最终浏览器像素。统一 D4 宿主随后已完成真实 Firefox 157 验收：105/105 项通过、无浏览器或 shader 错误。N41 六个美术 cue、原 PGF FX 与弹体共享唯一 canvas；暂停/隐藏/复位、关闭管束、静态输出、三轮路由往返缓存稳定及最终销毁均通过。完整报告副本为 evidence/d4-host-browser-report.json。默认保留可读模型近景，完整演出范围为宿主提供的可选取景模式。
