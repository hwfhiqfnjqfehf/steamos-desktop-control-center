# SteamOS Desktop Control Center

一个面向 Steam Deck 桌面 SteamOS 环境的桌面应用骨架，包含三块核心能力：

- 系统版本更新
- 插件更新
- BIOS 版本切换

当前版本优先把项目结构、桌面 UI、系统命令适配层、终端安装脚本和 GitHub 发布流程梳理好，方便后续继续接真实 SteamOS 命令、在 Steam Deck 真机上继续开发，并长期维护给其他玩家使用。

## 技术栈

- Electron
- 原生 HTML / CSS / JavaScript
- IPC + 本地服务层

## 快速开始

```bash
npm install
npm run dev
```

## Steam Deck 终端安装

当前仓库已经自带安装脚本，后续配合 GitHub Release 后可以让玩家一条命令安装。现阶段你自己也可以这样安装：

```bash
git clone https://github.com/hwfhiqfnjqfehf/steamos-desktop-control-center.git
cd steamos-desktop-control-center
bash scripts/install-steamdeck.sh
```

## 目录结构

```text
src/
  main/
    main.js
    preload.js
    services/
      adapters/
        biosAdapter.js
        pluginAdapter.js
        systemAdapter.js
      platform.js
      stateStore.js
      steamosService.js
  renderer/
    index.html
    styles.css
    app.js
scripts/
  install-steamdeck.sh
  update-steamdeck.sh
.github/
  workflows/
    ci.yml
    release.yml
```

## 当前实现说明

### 1. 系统版本更新

- 读取当前系统版本
- 展示稳定版 / 预览版可更新信息
- 支持触发“检查更新”和“开始更新”

默认会优先探测当前是否为 Steam Deck / SteamOS 真机环境：

- 在真机环境里优先尝试调用 `steamos-update` 等本机命令
- 在非 Steam Deck 环境里自动回退到 mock 数据，方便你在开发机上持续做 UI 和结构开发

### 2. 插件更新

- 展示插件列表和版本状态
- 执行单个插件更新
- 执行全部插件更新

插件源现在支持两种模式：

- Steam Deck 真机时尝试从 Decky 插件目录探测
- 非真机环境回退到 mock 适配层

### 3. BIOS 版本切换

- 提供 `stable` / `beta` / `preview` 三个 BIOS 通道
- 可查看当前 BIOS 版本和目标通道
- 支持切换目标 BIOS 通道

当前实现会把选择记录到 Electron `userData` 目录中的 `steamos-control-state.json`，并为真机刷写预留了适配入口。当前默认仍不直接刷写 BIOS。

## 发布与维护

### 1. CI

- Push 和 Pull Request 会触发 GitHub Actions 执行 `npm install` 和 `npm run check`

### 2. Release

- 推送 `v*` 标签后会触发 Linux 构建
- 产出目标包括 `AppImage` 和 `tar.gz`
- 构建产物会自动上传到 GitHub Release

### 3. Steam Deck 本机开发

建议后续把仓库直接同步到 Steam Deck 上继续开发，这样可以：

- 直接验证真实 SteamOS 命令
- 逐步接入权限流程和系统服务
- 扩展模拟器、工具链、插件生态相关模块

## 后续建议

- 接入真实 SteamOS 系统命令和权限检查
- 为高风险操作增加二次确认、管理员权限引导和日志面板
- 为系统更新、BIOS 和插件操作补充真实执行脚本
- 将模拟器管理、ROM 管理、控制器映射拆成独立模块
- 为安装脚本补充依赖自检与回滚逻辑

## 注意事项

- BIOS 切换属于高风险操作，当前代码默认只做通道记录和模拟流程，不直接刷写固件
- 真机接入时建议把“查询状态”和“执行变更”拆成受控脚本，并加入明确的权限边界
