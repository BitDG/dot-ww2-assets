# 任务内 Blender MCP 恢复与只读验收

2026-10-21 在用户明确批准任务目录内工具恢复后执行。已恢复 mcp-for-blender 2.1.9，使用原环境 Blender 4.3.2、Python mcp 1.29.0、httpx 0.28.1。实际 stdio MCP initialize、tools/list、get_addon_status、get_scene_info 均通过。不是直接调用普通 bpy 冒充 MCP。

固定来源：PyPI `mcp-for-blender==2.1.9`，上游 https://github.com/ahujasid/blender-mcp 。下载及解包仅到 `.runtime/blender-mcp-2.1.9/`，第三方包不提交本仓库。wheel SHA256 `a5cbc6cf316fa7433566eb505a0c26ca22e28c10083bd1b09a23d9e357821ccc`；内置 addon.py SHA256 `eb0facf69781a30e69792532087d8d41c6a14fcd323353250abe7988ee297fa5`，与原 PGF 回执完全一致。

## 已授权环境中的复现

```sh
python scripts/tooling/restore-blender-mcp.py
python scripts/tooling/verify-blender-mcp.py
```

第二条运行临时 Blender（factory startup）和真实 MCP Python 客户端，仅本机 `127.0.0.1:19876`。硬超时180秒，客户端验收90秒超时，finally停止自有进程并核实端口关闭。不保存用户偏好、不注册全局 MCP、不建立长期访问、不调用第三方资产或收费生成服务。不创建任何凭据。

当前环境没有 DISPLAY/Xvfb。上游 GUI start() 依赖 Blender timer，因此本任务使用明确的后台生命周期适配器：原插件 `_server_loop` 接收队列，Blender主线程主动调用原 `_drain_command_queue`；插件本体字节未改，未删除安全检查。通信仍是 MCP stdio → 原服务器 → localhost socket → 原插件执行。当前仅诊断，不是模型制作验收。

安全模式环境变量为1；安全校验器通过只读 bpy 片段、拒绝不允许的导入（仅校验，未执行）。插件实际回报遥测 consent=false，Poly Haven/Sketchfab/Poly Pizza/Hyper3D/Hunyuan3D/Tripo全部关闭，无 premium generators。`get_scene_info` 内部通过原服务器的只读查询代码获取factory默认场景，回读Cube/Camera/Light；未修改或制作模型。

证据：`evidence/tooling/mcp-verification.json`、`safe-mode-and-hashes.json`、`verification.log`、`blender.log`、`mcp-server.log`。结束时监听已关闭，Blender退出码0。关闭socket后接受线程记录一次bad file descriptor，是停止阶段日志；非握手失败。

## Firefox仍未恢复

只读检查没有发现可用Firefox程序或离线包。此前Playwright官方CDN HEAD遭代理403，本次没有重试或换镜像；一般安装授权不等于管理员放行。需要管理员明确放行该官方来源，或提供已批准离线包。现有Playwright要求Firefox144.0.2/revision1497，历史157.0.1不能冒称已恢复。未运行Firefox验收。

## Kar98k仍暂停

此次恢复工具不解除此前图像工具拒绝；没有重试、改写提示或制作替代模型。仅工具连接检查通过，Kar98k模型/.blend/GLB/实渲仍未生成。
