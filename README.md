# SteamOS Desktop Control Center

一个面向 Steam Deck 桌面 SteamOS 环境的桌面应用骨架，包含三块核心能力：

- 系统版本更新
- 插件更新
- BIOS 版本切换

当前版本优先把项目结构、桌面 UI、系统命令适配层和状态流梳理好，方便后续继续接真实 SteamOS 命令并上传到 GitHub 长期维护。

## 技术栈

- Electron
- 原生 HTML / CSS / JavaScript
- IPC + 本地服务层

## 快速开始

```bash
npm install
npm run dev
```

## 目录结构

```text
src/
  main/
    main.js
    preload.js
    services/
      steamosService.js
  renderer/
    index.html
    styles.css
    app.js
```

## 当前实现说明

### 1. 系统版本更新

- 读取当前系统版本
- 展示稳定版 / 预览版可更新信息
- 支持触发“检查更新”和“开始更新”

默认会优先尝试调用本机命令；如果当前环境没有相关命令，则自动回退到 mock 数据，方便在开发机上继续联调。

### 2. 插件更新

- 展示插件列表和版本状态
- 执行单个插件更新
- 执行全部插件更新

插件源目前使用本地 mock 适配层，后续可以替换成 Decky Loader 或自定义插件管理命令。

### 3. BIOS 版本切换

- 提供 `stable` / `beta` / `preview` 三个 BIOS 通道
- 可查看当前 BIOS 版本和目标通道
- 支持切换目标 BIOS 通道

当前实现会把选择记录到 Electron `userData` 目录中的 `steamos-control-state.json`，后续可替换成实际 BIOS 管理命令。

## 后续建议

- 接入真实 SteamOS 系统命令和权限检查
- 为高风险操作增加二次确认和管理员权限引导
- 增加日志面板
- 增加 GitHub Actions 做 CI 检查
- 增加打包配置（如 electron-builder）

## 注意事项

- BIOS 切换属于高风险操作，当前代码默认只做通道记录和模拟流程，不直接刷写固件
- 真机接入时建议把“查询状态”和“执行变更”拆成受控脚本，并加入明确的权限边界
