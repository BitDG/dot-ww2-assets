# PGF dot 车辆运动 M1

此检查点提供统一预览可调用的车辆运动适配器。它是覆写到完整 PGF 源树的增量源码包，不是独立网页或完整离线运行包。

## 已实现

- reference-armored-car：4 个原始轮心枢轴旋转
- armored-4x4：4 个原始车轮组旋转，保留各自转向姿态，备用轮不动
- tracked-mortar：原始 Blender kit 的 168 节履带鞋沿闭合路径流动；22 个负重轮、4 个端轮和 20 个回程轮旋转。高细节共 898 个运行件以 11 个 InstancedMesh 绘制；标准细节保留原标准部件筛选
- gustav-visual-prop：56 个原始轨道轮旋转，中/高细节的 112 个轮面装饰也从可靠三角形范围绑定旋转
- diesel-locomotive：12 个轨道轮旋转
- 轨道保持原地；车辆沿原始朝向小范围平滑往返，轮/履带方向与位移一致
- 演出倍率、播放、暂停、停止、重置、seek、活动状态和幂等释放
- 原生成器、参数定义、配方及静态 GLB 导出都保留；不向 GLB 添加动画

这是游戏美术预览。8 秒循环和 0.1–3 倍演出速度不代表真实车辆性能，不提供驾驶、武器控制或弹道训练。古斯塔夫只作牵引式轨道移动展示，不表示自行推进或完整机械仿真。履带保留原美术跑道与原轮组，但未模拟动态悬挂、负载接地或齿啮合。

## 明确未实现

- 本适配器不含开火；每种 capability 的 fire 都为 false
- N41 是牵引式资产，没有自行行走动作
- K5 尚无已确认的 PGF 绑定，不能把计划中的 adapter 标为可用
- 该 M1 阶段尚未挂接统一工作台动画栏，尚未通过该入口的 Firefox、实际 GPU、PC 布局和生命周期验收
- 不声明运动已发布到 main，也不声明已有可下载动画 GLB

## 统一视图接缝

导入 vehicle-motion.mjs 的 createVehicleMotionAdapter 和 vehicleMotionCapabilities。

复用现有 createPluginPreview(container, onFrame, {animated:true, runtimeFactory})。runtimeFactory 的 object、asset、invalidate、valid 可直接传入此适配器；params 默认读取 asset.metadata.recipe.params。runtimeFactory 与宿主只保留一条渲染循环。

运行时成员：

- available：本次真实部件绑定是否通过。UI 必须以此值门控，而不只是静态 capability
- playing：供共享渲染循环读取
- play('drive')、pause()、update(dt)
- stop()/reset()：暂停并还原起点。若使用共享 preview 方法，应调用 pause() 然后 seek(0)
- seek(seconds)、setSpeed(presentationMultiplier)
- setActive(boolean)：不活动时不会累积 dt；宿主隐藏/恢复时应转发
- diagnostics()/status()：具体部件数量、演出时间和不可用原因
- bounds()：固定覆盖完整小范围往返的相机包围盒
- dispose()：先移除自己拥有的预览运行件，再还原借用对象；不释放借用材质或贴图

如果组合行走与 FX，同一 tick 先更新行走，再让 FX 根据当前 matrixWorld 计算世界空间发射点。模型切换、取消旧上传和重新生成时，先 dispose 旧 runtime，再释放旧 asset handle。不要将运行中的预览对象作为静态 GLB 源；继续使用原 AssetIR 导出路径。

## 源码复用与完整性

已实查 PGF tank 的 procedural-vehicle.mjs、procedural-vehicle-running-gear.mjs、running-gear-layout.mjs 与现有 preview.js。tank 的 sampledRunningGear 会生成它自己的轮/履带几何，直接替换会改变此臼炮原外观。因此这里保留臼炮原 kit 的精确跑道与原型，沿用 PGF 的距离驱动运动方式和共享 runtime/tick 接口。

臼炮旧生成器已经将运行件按材质合批。适配器不猜测空间顶点归属，而是校验原 kit 指纹、材质批索引数量和实际顶点边界，借用旧材质重建可逆的预览实例。验证失败会保持原模型静止并说明原因。

古斯塔夫轮面使用原 AssetIR metadata.components.sourceParts 的完整三角形范围。PGF compactPrimitive 保证三角形顺序不变；只在自己的非索引几何副本中旋转相关顶点及法线，释放时还原原几何对象。

## 验证

在完整 PGF 源树使用已锁定依赖执行：

    node --test modules/dot-model-generator/tests/vehicle-motion.test.mjs
    node --test modules/dot-model-generator/tests/*.test.mjs

专项测试覆盖五类原始 AssetIR 和实际 Three 对象、变更 seed/尺寸/细节、旋转方向、履带局部运动、固定轨道、pause/stop/reset/seek、失效元数据、重复绑定和资源还原；五类实际静态 GLB 在预览运动前后字节一致，并通过回读。Node 图像 fixture 只提供原 PNG 尺寸用于构建纹理对象，不替代浏览器像素/着色器验收。

此源码闭包未附带可用 CodeGraph 数据库或工具，因此不声明 CodeGraph 检查通过。没有新增包，也没有修改 lockfile。
