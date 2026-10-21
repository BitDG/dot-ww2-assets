# Kar98k 外观游戏资产 — 准备阶段，模型未生成

优先级：本次新增首要示范资产。仅非功能性游戏外观，不含真实制造尺寸、内部击发/闭锁机构、装配制造图或可用机制。封闭枪管端面，内部实心简化；所有参数只描述艺术外形和材质。

## 已查参考与权利

- National Army Museum 馆藏条目：**Mauser KAR98, 1940**，馆藏号 NAM. 1996-07-97-1。https://collection.nam.ac.uk/detail.php?acc=1996-07-97-1 。条目明确标注 National Army Museum Copyright。仅记录来源，未复制、发布或送入图生图；照片的具体外观子型尚未完成像素核验，不能声称已辨识厂家、年代细分或配置。
- IWM 条目 https://www.iwm.org.uk/collections/item/object/30029612 ：页面读取返回 403；不将搜索摘要当作照片核验。
- NAM 页面经 Web 工具可读文字；执行环境获取照片页面遭代理 403，未重试或绕过。

## 可保存的外观拆件准备

计划分为木质枪托/护木外壳、封闭金属上壳、封闭前端轮廓、外部箍带、简化托底板、背带孔外观、不可操作的侧面轮廓件。外壳不包含任何工作结构，隐藏面是艺术推测。计划材料来源为 PGF `material-kit` 的既有金属涂层与木材纹理体系；尚未实现或通过材质检查。

计划外观参数：整体艺术比例、木色、金属色、粗糙度、表面旧化、可见外部附件开关及细节档。参数不承诺真实尺寸，也不开放内部结构或武器操作。

## 本次实际阻塞

1. 原创三视（正/侧/严格 90 度顶视）及六个外观细节的单次 imagegen 请求，被工具安全系统拒绝：HTTP 400，`moderation_blocked` / `violence`，request ID `d8d6ac88-a5f2-4c98-b02c-f9ee54c5ed80`。未产出图像；没有换措辞重试或绕过。
2. 当前工具清单未提供 Blender MCP，系统 Blender 4.3 的现有插件目录也未发现 MCP 插件。Blender 可执行文件存在，不等于已获批准的 MCP 连接可用。没有用普通 bpy 伪称 MCP 调用，也没有新安装或更改安全设置。
3. Firefox 系统命令与已有 Playwright Firefox 可执行路径均缺失，没有安装或改用 Chromium。

## 尚未完成

子型照片像素核验、多视一致原创图、MCP 建模及调用回执、.blend、固定 GLB、真实 hero/三视/细节渲染、外观参数实现、确定性/法线/UV/退化面/资源释放/独立 GLB 回读、Firefox 验收全部未完成。仓库没有 Kar98k 模型卡、下载占位或伪造实渲。

继续建模需要父线程提供已批准且可调用的 Blender MCP 连接；Firefox 验收需要可用的 Firefox 环境。图像工具此次安全拒绝不能用一般授权自动消除。

## 后续工具恢复更新

2026-10-21用户批准后，任务目录已恢复mcp-for-blender2.1.9，真实MCP initialize/tools-list/get_addon_status/get_scene_info通过。原“没有可用MCP”是迁移时历史状态，现已解决；未注册全局工具，检查后临时进程结束。[复现与回执](../../scripts/tooling/README.zh-CN.md)。图像拒绝和Firefox网络阻塞仍未解除，Kar98k所有建模与图像生成继续暂停。
