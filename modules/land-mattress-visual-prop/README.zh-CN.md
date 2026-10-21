# Land Mattress No.8 Mk I · 静态外观游戏资产

此模块是二战 A.C. Cars 1945 年 No.8 Mk I 馆藏实物的未测量外观美术解释。铭牌登记号为 108。固定五排六列，共 30 个浅封闭外观口面；单轴双轮、空载停放。早期 1944 年 32 管文献只用于历史区分，没有混入本资产。

实际网格由 Blender MCP 制作，三档 GLB 作为不可变输入。PGF 负责有界外观装配、共享金属材质、部件显隐和导出。种子改变共享材质的外观图案，不重做网格。在线修改几何、操作动画、弹药与内部机构均不在此模块范围。

## 参数合同

- detail：low / medium / high，读取不同真实源网格
- seed：1 至 128 个可打印字符，默认 land-mattress-no8-mk1-art-1945
- artScale：0.65 至 1.5，无量纲统一艺术比例，不代表制造尺寸
- paintColor：RGB 十六进制颜色；roughness 0.35 至 1；weathering 0 至 1
- 既有 PGF portable-vehicle-finish 涂装参数保持共享合同。冬季等预设是游戏美术涂装，不是该实物历史配色结论
- 八个显隐组：管束、外框、底架、车轮、翼板、牵引架、展示支脚、表面小配件。全部隐藏被拒绝

固定排列、轮数与停放姿态不可编辑。GLB 不导出动画。所有孔口为浅封闭视觉形状，不包含贯通管道。

## 来源与取舍

LAC 官方馆藏入口：
https://recherche-collection-search.bac-lac.gc.ca/eng/home/record?IdNumber=5266285&app=fonandcol

馆藏铭牌与同展厅照片的实物观察：
https://commons.wikimedia.org/wiki/File:Land_Mattress_plaque.jpg
https://commons.wikimedia.org/wiki/File:Nebelwerfer_and_Land_Mattress.jpg

早期型号对照：
https://friends-amis.org/wp-content/uploads/2020/10/FS04_land_mattress_E.pdf

只观察照片中的右侧 Land Mattress，未采用左侧 Nebelwerfer。来源照片及 PDF 不作为纹理、图生图输入或随模型分发。源照片许可信息仅记录于参考合同，模型表面是原创几何与既有 PGF 程序材质。

顶部、背面、支脚、翼板、紧固件密度及隐藏面没有足够多视实证，均按明确标注的美术推测处理。较低陈列倾角用于减少正视管束下方拉长视觉，与概念一致，不声称是实物的精确操作姿态。真实博物馆展品带有演示弹；资产没有这些物件。

## 复用与验证

复用 generator-sdk、PGF material-kit 的 metalFinishPixels、portable-vehicle-finish、既有迷彩生成以及 Gustav 同属主网格合批。未另建烘焙系统。八个语义组及材质归属在合批前后逐面核验，记录位置、法线和 UV 差异。

独立审计包括：三个 LOD 的有限数值/三角面/UV/法线、两轮语义、静态无动画；实际导出的 GLB 回读和 PNG 解码；材质和种子的确定性；显隐、取消、失败、正常完成与重复释放。浏览器接入和最终固定 GLB 实渲由验收证据分别说明，不能以 Node 测试代替。没有历史准确率百分比或 GPU 性能认证。
