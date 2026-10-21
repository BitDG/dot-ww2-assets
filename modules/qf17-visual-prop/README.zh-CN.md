# QF 17磅炮 · 简化静态外观游戏资产

版本 0.1.0，生成器 ID `qf17-visual-prop`，入口 `definition.mjs`。

## 身份与边界

历史名称锁定为 Ordnance Q.F. 17-pr Mk I on Carriage 17-pr Mk I。荷兰国家军事博物馆 NMM 馆藏 00057312 的 1943 年书目题名直接确认该组合：https://collectie.nmm.nl/nl/collectie/detail/847144/ 。RCA April 2022 第6页仅提供1944年加拿大牵引17磅炮使用背景，未给炮架Mk：https://en.rcamuseum.com/wp-content/uploads/2022/03/Barrage-April-2022.pdf 。

这是简化、未测量的外观美术重建，不是精密复制品；不宣称与概念图等精度或历史高相似。隐藏面、轮胎花纹、紧固件数量和小配件是艺术推测。固定姿态为双轮着地、双尾架展开、炮管水平。使用本型独立牵引炮架，不混用25磅炮临时Pheasant炮架或坦克炮。

仅有闭合外壳、浅封闭炮口/侧凹面和装饰表面。没有真实内部武器结构、制造尺寸、弹药、火控、弹道或真实运行机构。无炮口罩或袋。GLB坐标为艺术比例，只为文件兼容标为米，不能用作实物尺寸。

## 真实制作与复用

Blender 4.3.2，通过 mcp-for-blender 2.1.9 的真实 MCP 会话制作、保存原生源文件、导出活动场景GLB。安全模式保持开启。作者原生 `.blend` 保留未改动的工厂 `Scene`，活动资产场景为 `QF17_Art_<tier>`；导出GLB不包含默认Cube。Q6三档均经独立Blender重开验证。

轮胎复用 PGF `wheel-assembly` 的几何并按艺术比例归一化。材质复用 `material-kit/metal-finish.mjs` 的 `metalFinishPixels`、现有 portable vehicle finish/camouflage 和 PGF 材质绑定；未新建烘焙内核。几何以同部件、同材质的PGF合批优化，保持所有面属性和部件归属。

博物馆照片只供人工观察，不用于图生图、纹理或交付包。`reference/L0/` 保留已发布的两张AI概念图及原始合同；概念图不是Blender实渲。

## 参数合同

- detail / quality：low、medium、high，实际源几何分别为24,944 / 50,776 / 101,224三角面
- 默认材质下合批绘制数：23 / 24 / 24；各档均6材质、3张共享程序化PBR通道图
- artScale：0.65–1.5，仅统一艺术缩放
- paintColor：六位十六进制颜色；roughness：0.35–1；weathering：0–1
- camoPattern、camoEnvironment、camoScale：复用PGF共享涂装合同；范围由 `params.mjs` 唯一Schema规定
- seed：1–128个非控制字符；只改变确定性的美术表面，不重新设计几何
- 8组显隐：炮管、盾牌、炮架、左轮、右轮、左尾架、右尾架、表面小件；至少保留一组

`procedural:false`、`authoredAssetAssembly:true`、`onlineRemodeling:false`、`animation:false`。当前静态GLB无动画片段。没有牵引、轮滚、烟云或开火演出；任何未来虚构演出应另行标识。

## 验收

在PGF根目录：

- `node --test modules/qf17-visual-prop/tests/adapter.test.mjs`
- 10项Node测试覆盖：清单/唯一Schema、三档真实几何、8组逐项显隐与单部件、严格参数边界、种子确定性、材质效果、预算、损坏源拒绝、HTTP读取/取消、实际GLTFLoader错误/晚取消资源回收、独立PNG/GLB回读、共享Worker导出
- 源GLB三档均零退化面、零非有限数、法线与UV齐备、两轮、零动画
- 尾部把手脚/上表面紧固件的实际GLB射线贴合检查：low 4、medium 20、high 42项全部贴合
- 最终PGF GLB独立回读通过，三张PNG被真实解码，材质通道与三角面数保持

真实Firefox统一入口、路由/取消/释放与实际浏览器下载验收由共享入口集成阶段另行完成；Node测试不能代替浏览器验收。最终同一固定PGF GLB的hero、严格三视和六细节实渲另存证据，不与AI概念混淆。
