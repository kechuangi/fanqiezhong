# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

- 安装依赖：`npm install`
- 启动 Electron + React 开发版：`npm run dev`
- 构建前端资源：`npm run build`
- 在执行 `npm run build` 后，用接近打包环境的方式启动：`npm start`
- 构建 Windows 安装包和便携版 exe：`npm run dist`

当前 `package.json` 里还没有配置 lint 或 test 脚本。

## 架构说明

这个仓库里目前有两个可用的番茄钟版本：

- `pomodoro.html` 是最快可交付版本：单文件浏览器番茄钟，直接双击打开即可使用，不依赖 Node、Electron 或打包流程。
- Electron 桌面版使用 Vite + React 做渲染层，用 Electron 做桌面窗口、托盘和打包。

Electron 启动和通信流程：

- `package.json` 的 `main` 指向 `electron/main.cjs`。
- `electron/main.cjs` 创建主窗口 `BrowserWindow`；开发环境加载 Vite dev server，生产环境加载 `dist/index.html`。
- `electron/main.cjs` 负责系统托盘、托盘菜单、关闭窗口后隐藏到托盘、计时状态 IPC、完成提醒 IPC。
- `electron/preload.cjs` 向渲染层暴露 `window.pomodoro`，包含 `sendTimerState`、`notifyFinished`、`onTrayAction`。
- `src/App.jsx` 负责番茄钟核心状态：当前模式、剩余秒数、运行状态、完成轮次、自定义时长、localStorage 持久化、提示音、托盘动作响应。
- `src/styles.css` 负责 React 渲染层样式。

打包相关注意事项：

- `vite.config.js` 里的 `base: './'` 不要删除。Electron 生产环境通过 `file://` 加载，如果没有这个配置，打包后窗口可能空白，因为资源路径会解析错误。
- `npm run dist` 输出到 `release/`，会生成 NSIS 安装包和 portable 便携版 exe。
- `package.json` 的 dist 脚本里设置了 `CSC_IDENTITY_AUTO_DISCOVERY=false`，并且 `build.win.signAndEditExecutable=false`。这是因为 Windows 符号链接权限曾经阻止 electron-builder 解压签名辅助工具。
- `node_modules/`、`dist/`、`release/` 都是生成物，已被 git 忽略。

## 当前状态和已知卡点

- GitHub remote 是 `https://github.com/kechuangi/fanqiezhong.git`，本地 `master` 跟踪 `origin/master`。
- 如果 Electron 打包或启动被卡住，优先交付 `pomodoro.html`，这是当前最小可用版本。
- Electron 打包版曾出现空白窗口，原因是 Vite 资源路径不适配 `file://`，已通过 `vite.config.js` 的 `base: './'` 修复。
- 重新打包 exe 时，如果 `release/番茄钟 0.1.0.exe` 正在运行或被杀毒软件占用，`npm run dist` 可能卡在写入 exe。需要先从托盘退出应用，或等待文件锁释放，再重新运行。
- 当前 Electron 打包版仍使用默认 Electron 图标；后续优化可以加番茄图标和更完整的系统通知。
