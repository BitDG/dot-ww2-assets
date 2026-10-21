# Firefox 离线制品检查

当前环境的Playwright v1.57.0需要Firefox144.0.2、revision1497，Debian13 Linux x64构建。官方安装器路径是 `builds/firefox/1497/firefox-debian-13.zip`，官方主机包括 `cdn.playwright.dev` 与 `playwright.download.prss.microsoft.com`。这是官方源码中的候选来源，不是实测重定向链；本任务没有访问、重试这些下载地址，也没有换镜像。

需要管理员/制品提供方交付匹配的原始离线ZIP、可信的SHA256和来源记录。**本仓库不提供或猜测官方包hash。** 普通Mozilla Firefox不能直接当作Playwright补丁版的自动化替代。

收到包后，只读检查命令：

```sh
python scripts/tooling/check-firefox-offline.py /path/to/firefox-debian-13.zip --sha256 <独立提供的可信SHA256>
```

脚本检查精确hash、ZIP路径安全、application.ini版本、Linux x64 ELF和关键库存在；不联网、不解压安装、不启动浏览器。版本/目录检查不能证明Playwright补丁身份，仍需要可信来源。获准安装后的目标为任务目录 `.runtime/browsers/firefox-1497/`，不写系统浏览器目录、不更改代理或证书；缺少系统库时另报，不自动安装。

本轮没有离线包，未运行真实制品验收或Firefox测试；仅完成脚本编译检查和缺省/错误hash拒绝路径检查。
