# PGF 既有机械模型：历史影像与动画视觉边界

日期：2026-10-12
源码核对基线：BitDG/PGF 固定提交 `12f6836`
用途：游戏外观动画研究说明，仅原创文字与公开链接；不包含第三方影片、截图、纹理或音频。

## 结论先行

- 古斯塔夫风格模型已有实际观察过的历史铁路炮发射候选：Periscope Film 40884 的公开研究副本。能支持“局部亮团、浓厚不规则烟云、遮蔽与残烟”的表现方向；不能把新闻片整段每一个切镜头都认证为同一门古斯塔夫，不能称为完整真实还原。
- `tracked-mortar` 的仓库来源没有确证历史名称。仍称“履带外观模型”，不能自动改名 Karl-Gerät。
- `reference-armored-car` 的仓库来源没有确证具体型号。仍称“参考图四轮装甲车”；不能从棕漆、菱形标记或炮塔轮廓单独定型。
- `armored-4x4` 是悍马风格游戏外观；当前实际预设和模型代码显示车顶设备架、通信/光学外壳及天线，没有核实到车载武器。先做行走，不从设备箱或传感器位置发射。
- `diesel-locomotive` 是一般美式柴油机车风格，无武器；不拟开火。

本轮不提取或实现真实开火次序、发射间隔、速度、射程、弹道、火控、装填过程、内部机构或工程尺度。影片中的时码仅用于复查画面位置，不是动画时序参数。

## 一、古斯塔夫：实际看到了什么

### A. 已实际观察的公开影片

[Periscope Film 40884 官方条目](https://stock.periscopefilm.com/40884-world-war-ii-german-newsreel-siege-of-sevastopol-schwerer-gustav-gun-1942-eastern-front/)

[同片公开播放及研究副本：Internet Archive 的 PeriscopeFilm 馆藏](https://archive.org/details/40884takingsevastopilisthestrongestgestureintheworldgermanfilmmosvwr)

[档案发布者提供的 YouTube 页面](https://www.youtube.com/watch?v=Uvskjh0Bj14)

公开条目将约 01:57 起的巨型铁路炮段落标为 Schwerer Gustav。实际观察使用 Archive 页面列出的公开副本：对约 01:55–03:30 进行多帧抽样，另细看约 03:03–03:09、03:24–03:29 的可见发射与烟云。不是声称在浏览器完整连续看完影片，也没有把数字副本帧率当作原始拍摄速度。

实际看到：
- 前段有长炮管、高层平台、长铁路承载外形；尺度观感来自人物与外形对照，没有测量真实尺寸
- 发射画面中，炮口附近出现亮白的局部膨胀团，随后很厚的深灰块状烟云成为画面主体
- 烟云边缘是卷曲、多瓣、参差变化的轮廓，局部浓淡不同，遮挡炮口和部分上部轮廓；云边及炮口附近可见较薄的残烟
- 在所看镜头中，上部烟云比贴地尘雾更醒目；没有支持整齐环形冲击波或均匀铺满地面的烟毯
- 没有持续清晰可追踪的弹体或火箭式长尾焰
- 可见硬切换机位；尤其约 03:07 前后不能当作同一连续镜头，不能从画面角度跳变推断炮管大幅回动

归属强度：发布者目录明确命名，前段外形与巨型铁路炮一致；但片中也包含其他火炮，发射段有不同机位、局部裁切和烟雾遮挡。本次没有独立档案镜头表逐一认证每个发射镜头的型号。因此将其作为“目录标为 Gustav 的段落中的铁路炮视觉参考”，不冒称所有发射镜头均已逐镜确证。

黑白画面只支持明暗和形态观察。亮白不等于真实火焰颜色，深灰也不能直接指定真实烟气颜色或成分。曝光、复制、压缩、镜头距离与风向都会影响观感。残烟持续时间、炮管后移/回位幅度、地面尘烟比例均不作精确历史承诺。

### B. 官方档案核对与防误用

[IWM GWY 20：SCHWERER GUSTAV RAILWAY GUN AND 8.8 CM FLAK](https://film.iwmcollections.org.uk/record/19281)

官方目录明确包含 Schwerer Gustav，但页面显示未数字化、媒体当前不可用。本次没有观看这卷片。目录中的 Gustav 段是外观/组装状态；后续所述开火亮闪属于另列的 8.8 cm Flak 段，不能偷换成 Gustav 的发射证据。

[Footage Farm H1609-05：Germans Shell & Take Sevastopol](https://footagefarm.com/reel-details/wwii/generic/wwii---1942-ussr-germans-shell--take-sevastopol-ca-jul42)

目录含巨型铁路炮段，但实际页面为 Request Preview，没有提供可直接下载的预览。本次只读目录，未下载影片。标题中的年份与页面 Year/Date 栏也不一致，不依它确定镜头时间。

[Net-Film 104080：The third assault on Sevastopol](https://www.net-film.ru/en/film-104080/)

本次只观察其公开静态预览图，没有播放该站视频。约 02:34 的小图能看到长筒与下部烟雾，约 02:52 小图能看到阵地边的白灰云；分辨率与遮挡不足以独立确认具体型号。它不提高对动态或子镜头归属的认证等级。

## 二、固定提交中的模型身份与证据

### gustav-visual-prop

[模块 README](https://github.com/BitDG/PGF/blob/12f6836/modules/gustav-visual-prop/README.md) · [来源矩阵](https://github.com/BitDG/PGF/blob/12f6836/modules/gustav-visual-prop/SOURCE-MATRIX.md)

实际看了当前 `reference-gray` 预设图，并读了 README、来源矩阵及定义。模型是古斯塔夫风格的非功能性艺术外观：长筒、分层铁路平台、轮组和展示轨道；仓库明确隐藏面、重复数量和比例属艺术推测。不能用历史影片把这份网格反向认证成实测原型。

建议：
- 将单次局部亮团与扩张、卷曲、互相融合的厚烟云作为主视觉
- 烟云应真实遮住部分上部，而不是永远在模型后方透明叠加
- 保留稀薄残烟，去掉持续发光弹体、规则烟珠、长亮光束
- 炮口回动若因观感需要而做，标为克制的外观动画，不号称按片精确复原；不要把剪辑后的炮管角度变化照搬成动作
- 轮轨移动只表现可见金属轮滚动与车体平移的协调；影片未校准真实行走行为或工程运动

### tracked-mortar

[模块 README](https://github.com/BitDG/PGF/blob/12f6836/modules/tracked-mortar/README.md) · [参考配置](https://github.com/BitDG/PGF/blob/12f6836/modules/tracked-mortar/blender/art-configuration.json)

读到的源链为用户灰色侧/顶/另一侧图，以及辅助 AI 三视图。配置明确隐藏面、前视与米制比例是推测，未给历史型号。实际看了当前 `reference` 预设：长低履带底盘、密集小路轮、短粗外筒和平台栏杆。没有成功取得原始输入图片字节，因此不称本次重新验看过用户原图。

40884 前部约 01:29–01:49 还看到有伪装遮蔽的短粗炮管、浅色上扬烟云与阵地周围烟雾。但它是另一类炮的镜头，底盘被遮，本轮不能建立与当前 tracked-mortar 网格的一一对应。因此不据此给它冠名，也不把该段当本模型真实动态已确证。

建议：
- 行走突出履带表面循环与路轮外观转动的协调，车体不随每块履带产生夸张跳动；这是游戏视觉决策
- 若先接开火占位，以可见外筒前端的局部烟团为基础，强度、动作与节奏由美术设定
- 保留“历史型号未确证/外观动画”说明；不能使用 Karl 的操作或回动资料补齐未知模型

### reference-armored-car

[模块 README](https://github.com/BitDG/PGF/blob/12f6836/modules/reference-armored-car/README.md) · [原图来源配置](https://github.com/BitDG/PGF/blob/12f6836/modules/reference-armored-car/authoring/reference-config.json)

实际读了 README、来源配置与定义，并看了当前 `reference` 预设：棕色多面车体、四轮、紧凑炮塔、细长可见炮管、白色空心菱形、前部垂链和外部行李。源配置只标识用户输入文件及 AI 辅助图，没确证车型。不能仅凭这些细节命名某种历史装甲车。

建议：
- 四轮的滚动/转向与平移协调，车身只保留克制的地面反应
- 若当前范围先接视觉开火，占位效果只挂在已存在的炮口外观，采用较局部的亮闪与余烟
- 不把古斯塔夫巨型烟云、Nebelwerfer 连续拖尾直接缩放后套上
- 本轮没有本车型真实开火或行走片段；该建议为美术分型，不是史料认证

### armored-4x4

[模块 README](https://github.com/BitDG/PGF/blob/12f6836/modules/armored-4x4/README.md)

实际看了当前参考预设并核对模型代码。可称悍马风格装甲越野游戏外观，不指定真实变型。车顶现有物体被代码定义为通信、光学、传感器与一般设备；未核实出武器。建议只接四轮行走与适量轮旁地尘，不自动制造机枪、炮口或开火按钮。

### diesel-locomotive

[模块 README](https://github.com/BitDG/PGF/blob/12f6836/modules/diesel-locomotive/README.md)

README 明确为源图启发的一般美式柴油机车，不声称具体历史型号。无武器，不拟开火。轮轨行走是合适范围；任何排气视觉须与火炮烟焰分离，且本轮没有对该机车原型的排气颜色与运动动态作史料认证。

## 三、交付与权利

- 本说明可随项目交付；它只有原创观察、建议和稳定公共链接
- Periscope 的 Archive 条目标示 [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)，并保留商业授权说明。公开可看/可下载不等于可将影片、抽帧或截图放入游戏、商用演示或模型包
- 临时研究副本、抽样帧及网页预览图不进入源码、GitHub、ZIP、Library，也不送入其他 AI 平台
- 本轮没有重取先前被拒绝的 Buyout MP4，没有修改网络或安全配置，也没有使用 Firefox，避免打断动画验收
- 对无法取得或尚未确证的资料保留缺口，不用视频标题、相似外观或通用开火常识代替实际观看

