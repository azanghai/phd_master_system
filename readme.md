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
npm run tauri:dev
npm run tauri:build
npm run cap:sync:android
```

命令说明：

- `npm run prepare:static`：生成静态入口、构建 Tailwind CSS，并复制本地 Chart.js / Font Awesome 资源。
- `npm run build`：执行静态资源准备流程。
- `npm run html:dev`：启动 HTML 版本地入口，并为坚果云 WebDAV 同步提供本地代理。
- `npm run tauri:dev`：启动 Tauri 桌面端开发环境。
- `npm run tauri:build`：构建 Tauri 桌面端应用。
- `npm run cap:sync:android`：同步 Web 资源到 Android 工程。

## 数据与同步

工作台数据保存在本地，并可在 `设置` 中导出 JSON 备份。桌面端会使用 `workspace-data.json` 作为数据文件。需要多设备同步时，可以在 `设置` 中配置坚果云 WebDAV。

涉及 `导入 JSON`、`清空全部数据`、`仅上传本地到云端`、`仅下载云端到本地` 等操作前，建议先导出 JSON 备份。

## 致谢与声明

感谢小红书用户分享的源文件，我在原有基础上完善了桌面端与移动端适配，并新增了坚果云网盘数据同步功能。

衷心鸣谢直接提供源码参考的用户：

“不是黑子是癫子” — 小红书号：61709040774

“橘子汽水” — 小红书号：romantic_Ksir

同时也向为上述源码提供者贡献内容的原始作者们致以谢意。本项目仅用于学习交流，非商业用途、未用于盈利。如涉及侵权，请通过 Issue 联系，我将立即处理删库。
