# NoteBookProject — 结构化论证与版本控制笔记系统

本项目基于 **Nuxt 3 / Nuxt 4 (Vue 3, TypeScript, Pinia)** 构建，专为**复杂议题的分类讨论、逻辑推演与分支演进**设计。它将 Git 的核心心智模型（提交、分支、合并、拆分）与结构化笔记相结合，提供双栏工作流与轻量级 SVG DAG 可视化版本树。

---

## 核心设计与交互体系

### 1. 左右双栏流转模型
- **左侧栏（待论证纯标题孵化区）**：
  - 默认初始化基础议题草稿（如 `Case A`, `Case B`）。
  - 支持点击 `+ 添加标题` 快速追加新议题。
  - 点击卡片展开编辑态：支持标题修改、论证正文推演、Change Log 输入。
  - 点击垃圾桶物理删除（不入回收站）。
  - 填写完毕点击 **Commit** 后流转至右侧已论证讨论区，左侧不再保留。
- **右侧栏（已论证讨论与版本树演进区）**：
  - 严禁直接新建，必须由左侧初次提交流转进入。
  - 展开为**三段式结构**：
    1. **上部**：议题标题与当前版本论证正文（实时防抖持久化保存）。
    2. **中部（Git-like 版本树）**：自研轻量 SVG DAG 图，支持鼠标滚轮横向平移，实节点（历史提交快照）与虚节点（当前工作区草稿）动态连接，支持多分支独立色彩与轨道布局。
    3. **下部（提交控制区）**：输入变更说明；若位于分支尖端显示 **Commit**；若在历史节点上修改则自动变为 **Create Branch & Commit**（分叉生成独立分支）；同时提供 **Split** 拆分功能。
  - 右上角垃圾桶点击后软删除并移入**回收站**。

### 2. 高级重构机制：合并 (Merge) 与拆分 (Split)
- **多选合并 (Merge)**：按住 `Ctrl` / `Cmd` 单击卡片或勾选多选框，底部唤出悬浮工具栏 `Merge X Cards`。临时合并卡片保留所有源卡片历史提交拓扑并以 `\n\n` 拼接正文；支持 **Commit Merge**（生成多父节点合并提交）或 **Revert Merge**（撤销并恢复原卡片）。
- **并行拆分 (Split)**：点击 Commit 旁下拉三角选择 `Split into X parts`，将当前卡片派生为 X 份子议题并完整克隆历史版本树；支持各自独立论证提交或 **Revert Split** 撤销恢复。

### 3. 本地自动保存与回收站
- **自动保存 (Auto-Save)**：所有草稿与卡片状态自动持久化至本地存储，刷新无缝恢复。
- **回收站 (Recycle Bin)**：顶部状态栏垃圾桶图标支持查看已软删除卡片、一键恢复与彻底清空。

---

## 快速上手与本地运行

### 环境要求
- Node.js (推荐 v20+ / v22+)
- npm / pnpm / yarn

### 运行步骤
```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 访问地址：http://localhost:3000
```

### 构建生产包
```bash
npm run build
npm run preview
```

---

## 项目结构

```text
NoteBookProject/
├── app.vue                   # 根页面与双栏工作区布局
├── nuxt.config.ts            # Nuxt 配置 (Pinia 注册、CSS 全局导入)
├── GUIDELINE.md              # 业务规范与需求指南
├── assets/
│   └── css/
│       └── main.css          # 全局原生 CSS 变量系统与深色主题
├── components/
│   ├── card/
│   │   ├── StagingCard.vue   # 左侧待论证卡片
│   │   ├── DiscussionCard.vue# 右侧三段式已论证卡片
│   │   └── CardToolbar.vue   # 批量多选 Merge 悬浮栏
│   ├── graph/
│   │   └── VersionTree.vue   # SVG Git-like 横向 DAG 版本控制树
│   └── layout/
│       ├── AppHeader.vue     # 顶部状态与导航栏
│       └── TrashModal.vue    # 回收站管理弹窗
├── composables/
│   └── useKeyboard.ts        # 键盘快捷键监听
├── stores/
│   └── notebook.ts           # Pinia 核心状态管理与持久化
├── types/
│   └── notebook.ts           # 数据模型与类型定义
└── utils/
    └── helpers.ts            # 工具函数 (Case 命名、防抖、格式化)
```
