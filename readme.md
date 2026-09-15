# 博士工作台

博士工作台是一套面向研究生和科研工作者的本地学术管理工具，用来记录任务、日程、专注、论文、投稿、导师沟通、复盘、习惯、报销和数据同步。

## 如何使用

- 完整操作说明：[docs/操作说明.md](docs/操作说明.md)
- 静态页面入口：`app/index.html`
- 桌面端入口：使用 Tauri 开发或构建命令启动
- Android 端入口：使用 Capacitor 同步后在 Android 工程中构建

第一次使用建议先进入 `设置`，选择角色预设并检查模块开关；日常使用可以从 `今日` 页面开始新增任务、查看提醒和进入常用模块。

## 常用命令

```bash
npm run prepare:static
npm run build
npm run html:dev
npm run server
npm run test:server
npm run tauri:dev
npm run tauri:build
npm run cap:sync:android
```

命令说明：

- `npm run prepare:static`：生成静态入口、构建 Tailwind CSS，并复制本地 Chart.js / Font Awesome 资源。
- `npm run build`：执行静态资源准备流程。
- `npm run html:dev`：启动 HTML 版本地入口，并为坚果云 WebDAV 同步提供本地代理。
- `npm run server`：启动带 SQLite 持久化、登录会话、工作区和附件 API 的服务端（默认端口 `47637`）。
- `npm run test:server`：运行服务端冒烟测试。
- `npm run tauri:dev`：启动 Tauri 桌面端开发环境。
- `npm run tauri:build`：构建 Tauri 桌面端应用。
- `npm run cap:sync:android`：同步 Web 资源到 Android 工程。

## Docker / NAS 部署

项目通过 Docker 运行 Node 服务端，使用构建后的 `app/index.html`，SQLite 数据库和
附件保存在 `phd-workbench-data` 持久卷中：

```bash
docker compose up -d --build
```

启动后访问 `http://NAS_IP:47637/`。在飞牛 OS 中可以将 `compose.yaml` 所在目录
作为项目目录导入 Docker/Compose 管理器，或在 NAS 终端执行上面的命令。

首次启动前设置 `PHD_WORKBENCH_ADMIN_USERNAME` 和
`PHD_WORKBENCH_ADMIN_PASSWORD`（至少 12 个字符）即可自动创建管理员。服务端 API
包括 `/api/auth/login|logout|me`、管理员创建用户、每用户 `/api/workspace/state`
和 `/api/attachments`。会话使用 HttpOnly、SameSite Strict cookie，写请求校验同源
Origin/Referer。健康检查位于 `/api/health`。可以先复制 `.env.example` 为 `.env`
再启动；管理员登录后可通过 `POST /api/auth/users` 创建其他用户（当前不开放公开注册）。

直接局域网访问时保持 `PHD_WORKBENCH_COOKIE_SECURE=0`。如果通过飞牛 OS 反向代理并
启用 HTTPS，将这两个变量设为 `1`，然后只对外暴露 HTTPS 端口，不要把应用端口直接
映射到公网。SQLite 和附件位于 `/data`，请在飞牛 OS 中定期备份
`phd-workbench-data` 卷。

更新后如果仍然直接进入页面、没有登录框或看不到其他设备的数据，请确认运行的是
Node 服务端容器，而不是旧的静态 HTML 服务，并强制重建：

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

随后在浏览器执行强制刷新（Windows/Linux 使用 `Ctrl+F5`，macOS 使用
`Cmd+Shift+R`）。正常情况下首页会先显示登录框，登录后设置中的存储方式显示为
“NAS 服务端 SQLite”。也可以访问 `/api/health` 确认请求到达 Node 服务端。

## macOS 打包说明

macOS 下载版如果未签名，可能会被系统提示“应用已损坏，无法打开”。`npm run desktop:build:mac` 在没有配置 Apple 证书时会自动使用 ad-hoc 签名，适合内部测试；正式对外分发仍建议配置 Apple Developer ID 证书并完成公证。

GitHub Actions 的桌面发布流程已预留以下 secrets：`APPLE_CERTIFICATE`、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_SIGNING_IDENTITY`、`APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID`。配置后重新发布 tag，macOS 产物会使用正式签名/公证流程。

## 数据与同步

通过 NAS Web 入口登录后，工作台状态和附件会按账号保存到服务端 SQLite/数据卷，
从任何设备登录都可以继续之前的记录。`设置` 中仍保留 JSON 导入/导出，用于备份
和把旧浏览器数据手动导入当前账号；旧数据不会自动迁移。桌面端和旧版坚果云同步
仍可用于不登录 NAS 的本地场景，但不要把它们与服务端账号同时作为同一份数据的主存储。

管理员登录后可从页面右下角进入“管理后台”，执行用户创建、角色调整、停用/启用、
密码重置、系统统计和整站备份。恢复备份会覆盖所有账号和数据，系统会先自动保留
当前备份，并在恢复后让所有账号重新登录。管理员页面和相关 API 仅管理员可访问。

涉及 `导入 JSON`、`清空全部数据`、`仅上传本地到云端`、`仅下载云端到本地` 等操作前，建议先导出 JSON 备份。

## 致谢与声明

感谢小红书用户分享的源文件，我在原有基础上完善了桌面端与移动端适配，并新增了坚果云网盘数据同步功能。

衷心鸣谢直接提供源码参考的用户：

“不是黑子是癫子” — 小红书号：61709040774

“橘子汽水” — 小红书号：romantic_Ksir

同时也向为上述源码提供者贡献内容的原始作者们致以谢意。本项目仅用于学习交流，非商业用途、未用于盈利。如涉及侵权，请通过 Issue 联系，我将立即处理删库。
