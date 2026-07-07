# Account Manage Plugin

个人帐号管理 Chrome 浏览器扩展 — 管理多个网站的登录帐号，支持一键自动登录。

## 功能特性

- **帐号管理** — 添加、编辑、删除登录帐号（名称、用户名、密码、网址）
- **一键自动登录** — 点击帐号后自动导航到目标网站，填充用户名密码并提交登录
- **智能 DOM 识别** — 以密码框为锚点，自动查找用户名输入框和提交按钮，兼容 React/Vue 等框架
- **导入导出** — JSON 格式导出/导入帐号数据，支持覆盖和合并两种模式
- **页面自动填充** — 打开网站时自动检测匹配帐号并尝试填充（无需手动操作）

## 架构

项目基于 Manifest V3，包含四个构建入口：

| 入口 | 文件 | 说明 |
|------|------|------|
| Popup | `src/main.ts` → `index.html` | 扩展弹窗 UI，帐号管理主界面 |
| Content Script | `src/contentView/main.ts` → `content.js` | 注入页面，负责自动填充逻辑和 insert script 桥接 |
| Insert Script | `src/insert/main.ts` → `insert.js` | 注入页面真实 JS world（绕过扩展隔离），执行 DOM 填充 |
| Background | `src/background/main.ts` → `background.js` | Service Worker，负责 Popup ↔ Content 的消息转发 |

消息流：Popup → Background → Content Script → (postMessage) → Insert Script → DOM 操作

```
Popup (点击登录)
  → chrome.runtime.sendMessage (LOGIN_REQUEST)
    → Background (转发到目标 tab)
      → chrome.tabs.sendMessage (LOGIN_REQUEST)
        → Content Script (桥接)
          → window.postMessage (LOGIN_REQUEST)
            → Insert Script (执行 autoLogin)
              → DOM 填充 + 提交
```

## 技术栈

- Vue 3 + TypeScript
- Tailwind CSS 4
- Vite 7（多配置构建）
- Chrome Extension Manifest V3
- PostCSS（content script CSS 自动添加 `!important`，确保样式优先级）

## 项目结构

```
src/
├── background/          # Service Worker 消息转发
├── contentView/         # Content script + Vue 浮窗组件
│   ├── components/      # FloatingWindow, ModelConfigForm, ModelList
│   └── composables/
├── insert/              # Insert script（页面真实 JS world）
├── popupView/           # Popup 弹窗 UI
│   ├── components/      # AccountList, AccountForm, ImportExport, ConfirmDialog
│   └── composables/
├── config/              # 环境配置 (isDev/isProduction)
├── icons/               # 扩展图标组件
├── styles/              # 全局样式
├── types/               # TypeScript 类型定义 (account, chat, model)
├── utils/               # 工具函数
│   ├── autoLogin.ts     # 自动登录核心逻辑（DOM 查找 + 填充 + 提交）
│   ├── accountStorage.ts # 帐号 CRUD + 导入导出
│   ├── storage.ts       # chrome.storage 封装
│   ├── modelStorage.ts  # 模型数据存储
│   ├── chatClient.ts    # 聊天客户端
│   └── message.ts       # 消息工具
└── main.ts              # Popup 入口
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（热更新，端口 9527）
pnpm dev

# 构建生产版本
pnpm build
```

构建后产物位于 `dist/` 目录，包含 `background.js`、`content.js`、`content.css`、`insert.js` 及 `index.html` 等。

## 加载扩展

1. 执行 `pnpm build`
2. 打开 Chrome → `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」 → 选择项目 `dist` 目录

## 权限

| 权限 | 用途 |
|------|------|
| `storage` | 存储帐号数据到 chrome.storage.local |
| `activeTab` | 获取当前活动标签页信息 |
| `<all_urls>` | 在任意页面注入 content script 和 insert script |

## 许可

Private
