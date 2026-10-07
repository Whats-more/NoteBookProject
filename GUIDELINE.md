# NoteBookProject 开发与设计规范指南 (Technical Specification & Architecture Guideline)

## 1. 项目概述与核心目标

NoteBookProject 是一个**面向分类讨论与逻辑演进的结构化笔记系统**。其核心理念是将版本控制（Git 式分支、提交与合并）的思维模型引入到日常文本论证、命题推演与案例分析（Case Analysis）中。

### 核心设计哲学
- **分离与演进**：未成型的概念（纯标题/待论证）与已成型的论证（已提交卡片）在物理视界上左右分离。
- **无损版本演进**：卡片的每一次修改都对应一个不可变的历史节点（Commit Node），支持回溯查看与分叉演变（Branching）。
- **复合论证重构**：支持多个分类案例的多选合并（Merge）以及单个案例的多维拆分（Split），并保留完整的血统关联（Lineage）。
- **免顾虑编辑（Auto-Save）**：草稿实时自动保存，随意切换历史节点预览而不丢失当前正在编辑的内容。

---

## 2. 界面架构与布局规范

整个页面采用左右双栏布局，辅以顶部全局状态条与全局浮动/弹窗层。

```
+-----------------------------------------------------------------------------------+
| Top Bar: NoteBookProject | 全局检索 | 回收站入口 | 数据导出/重置                         |
+------------------------------------+----------------------------------------------+
| 左栏: 命题/草稿孵化区 (Title Staging)  | 右栏: 已论证讨论区 (Committed Discussion)        |
|                                    |                                              |
| [ Case A (纯标题/编辑态)          ] | [ Case A (卡片模块)                          ] |
|   - 标题输入框                      |   +----------------------------------------+ |
|   - 论证正文区                      |   | 上部: 标题与论证内容编辑区                 | |
|   - 分割线                         |   +----------------------------------------+ |
|   - Change Log (默认 initial...)   |   | 中部: 横向版本控制树 (Git-like DAG 图)    | |
|   - [Commit 按钮]                  |   |       (○ 实节点) --- (○) --- (◌ 虚节点)   | |
|                                    |   +----------------------------------------+ |
| [ Case B (收起态纯标题)           ] |   | 下部: Change Log 输入 & Commit / Branch| |
|                                    |   +----------------------------------------+ |
| [ + 添加标题 (虚线占位卡片)        ] |                                              |
|                                    | [ Case C (折叠态卡片)                        ] |
+------------------------------------+----------------------------------------------+
| 浮动操作栏 (选中态触发): [ 已选择 X 个卡片 | Merge X Cards ]                           |
+-----------------------------------------------------------------------------------+
```

### 2.1 左侧面板：纯标题与孵化区 (Title Staging Column)
- **职责**：作为所有论证单元的起点。不可在右侧直接新建卡片，必须经由左侧输入标题并完成首次论证后流转至右侧。
- **卡片形态**：
  1. **默认未展开态**：仅显示标题单行文本，默认命名为递增格式（如 `Case A`、`Case B`、`Case C`...），支持就地点击更名。
  2. **展开编辑态**（点击卡片触发）：
     - 顶部：可编辑标题。
     - 正文区：多行文本输入框，用于编写论证正文。
     - 分割线：视觉分隔线。
     - Change Log 区域：提示标语为 `Change Log`，输入框默认填充 `"initial commit"`。
     - 底部操作栏：右下角包含 `Commit` 按钮。
  3. **删除操作**：右上角垃圾桶图标，点击后**直接彻底物理删除**（不入回收站）。
  4. **尾部新建入口**：列表最底部为一个具有虚线边框（Dashed border）的卡片控件 `+ 添加标题`，点击后立即在上方追加一个默认标题卡片。
- **流转行为**：点击 `Commit` 后，若标题与论证有效，该卡片从左侧移除，并在右侧生成对应的已提交卡片模块。

### 2.2 右侧面板：已论证模块流转区 (Committed Discussion Column)
- **职责**：展示并管理所有包含有效论证的历史单元。
- **展示与交互规则**：
  - **禁止直接新建**：右侧不提供新建入口，严格保证所有卡片有据可循。
  - **删除保护机制**：右上角垃圾桶图标点击后**进入回收站（Soft Delete）**，支持从回收站恢复或彻底清除，避免误删导致论证链条断裂。
  - **展开态三段式结构**（点击右侧卡片进入修改态）：
    1. **上部（Title & Content Area）**：展示当前激活版本的标题与论证文本，支持编辑。
    2. **中部（Version Control Tree Area）**：
       - 横向布局的 Git-like 版本图（Commit Graph）。
       - 支持鼠标滚轮左右横向平移（Horizontal Scroll）与拖拽。
       - **实节点（Solid Nodes）**：代表历史上已经真实提交的快照。点击任一实节点可查看对应历史时刻的论证文本与 Change Log。
       - **虚节点（Ghost / Staging Nodes）**：起到示意作用。刚点开卡片时，游标落在最新实节点上，其右侧自动浮现一个虚节点，代表当前正在草拟的未提交状态。
    3. **下部（Commit & Action Area）**：
       - Change Log 输入框。
       - 提交行为动态切换：
         - 若当前编辑基于**最新实节点**：按钮显示为 `Commit`，提交后虚节点变为最新实节点，线性向前追加。
         - 若当前编辑基于**历史非叶子实节点**：按钮自动变更为 `Create Branch & Commit`，提交后在控制树上生长出一条新的分支线。

---

## 3. 高级分支演进机制：合并 (Merge) 与拆分 (Split)

### 3.1 跨卡片合并机制 (Card Merge)
1. **多选触发**：按住键盘 `Ctrl`（Mac 上兼容 `Command`）同时鼠标左键单击多个右侧卡片，卡片进入高亮激活多选态。
2. **合并指示器**：底部弹出浮动操作条，显示 `Merge X Cards` 按钮（X 为当前选中的卡片数量，X >= 2）。
3. **点击合并生成临时卡片（Temporary Merged Card）**：
   - 生成一个临时占位卡片，其版本树处于虚节点状态。
   - **版本树图拓扑**：该虚节点的左侧同时引出多条连线，分别连接原各个被合并卡片的最新实节点（类似 Git 中的多源 Merge Commit 图形）。
   - **文本拼接规则**：按选中顺序将所有原卡片的文本拼接到一起，两两之间以**两个换行符**（`\n\n`）严格隔开。
4. **状态控制操作**：
   - **左下角**：`Revert Merge`（撤销合并，直接放弃临时卡片，恢复原卡片独立状态）。
   - **右下角**：`Commit`（确认合并提交，正式生成合并实节点，持久化多父节点关系，历史记录无损归并）。

### 3.2 卡片拆分机制 (Card Split)
1. **触发入口**：
   - 在正常卡片以及处于 `Revert Merge` 状态的临时卡片右下角，`Commit` 按钮右侧带有一个下三角下拉箭头（Dropdown trigger）。
   - 点击下拉箭头弹出扩展菜单项 `Split`。
2. **拆分参数交互**：
   - 点击 `Split` 后，整个 `Commit + Split` 操作区切换为内嵌配置表单：
     - 第一行/主体：`Split into [ X ] parts`（X 为正整数数字输入框，默认为 2）。
     - 第二行：原 Split 区域位置变为 `Confirm` 按钮。
3. **拆分派生流程**：
   - 点击 `Confirm` 后，当前卡片派生为 X 个**临时卡片**。
   - 每一个临时卡片均**完整克隆**原卡片截止到当前时刻的完整历史版本树。
   - 每个临时卡片分别挂载在一个独立的虚节点上，等待用户调整正文。
4. **控制与二次确认规范**：
   - **右下角**：`Commit`（将该拆分出来的临时卡片独立确认提交）。
   - **左下角**：`Revert Split`。
   - **安全确认守则**：如果撤销拆分时，同组中已经有某个派生卡片被用户提前执行了 `Commit`，则点击 `Revert Split` 必须强制弹出确认对话框：
     > *“当前操作将回退已拆分的结构。已提交的派生卡片将被转换为独立历史分支保留，确定继续吗？”*
   - 确认后，已提交的卡片作为独立历史分支（半虚节点/历史保留标识）存在，不会暴力抹杀已有数据。

---

## 4. 自动保存与无感知历史回溯设计 (Auto-Save & Preview)

### 4.1 自动保存模型
- **实时脏值追踪**：用户在编辑任何卡片的标题、正文、Change Log、拆分数量时，变更在 300ms 防抖（Debounce）后自动写入本地持久化引擎（IndexedDB / LocalStorage）。
- **草稿态隔离**：每个卡片拥有两个状态视图：
  1. `Committed Snapshot`（最后提交态）：外部列表收起时展示的数据，保证全局总览的稳定。
  2. `Working Draft`（未提交草稿态）：进入卡片激活编辑时所呈现的数据。
- **安全回溯体验**：用户在版本树上自由点击历史节点查看过去的内容时，当前编辑的草稿数据依然妥善保存在内存与本地草稿池中，切回最新节点或虚节点时完整恢复，杜绝“看一眼历史记录导致刚写的长文丢失”。

---

## 5. 技术选型与架构规范 (Nuxt 3 生态)

### 5.1 基础技术栈
- **框架**：Nuxt 3 (SSR/SSG 混合，本项目主要依托 Client-side SPA 交互体验)
- **UI 逻辑**：Vue 3 Composition API (`<script setup lang="ts">`)
- **状态管理**：Pinia 2 + `pinia-plugin-persistedstate` (配合 IndexedDB 做大容量版本快照持久化)
- **样式方案**：现代 Vanilla CSS / CSS Modules，遵循深浅色自适应、高质感设计规范（Glassmorphism、平滑弹性微交互、专业排版）
- **图标系统**：Lucide-vue-next（垃圾桶、分支、合并、下拉三角、历史时钟等精致图标）

### 5.2 版本控制树渲染方案评估与选型

| 方案 | 优势 | 劣势 | 选型结论 |
| :--- | :--- | :--- | :--- |
| **自研轻量 SVG / Canvas DAG 渲染器** | 1. 零冗余依赖，包体积小<br>2. 像素级还原 GitHub Commit Graph 效果<br>3. 完全掌控虚节点、多父节点 Bezier 连线及动效 | 需要手写贝塞尔曲线坐标计算与横向布局算法 | **推荐首选（纯 SVG）** |
| **Vue Flow / D3-hierarchy** | 内置拖拽缩放与节点库 | 外部包体积偏大，针对横向从左到右紧凑型 Git 树定制成本较高 | 备选 |

**SVG 渲染核心算法规范**：
- 节点按时间戳与拓扑排序（Topological Sort）确定列索引 $X = col \times \Delta x$。
- 分支分配独立的轨道索引（Lane / Row）$Y = lane \times \Delta y$。
- 连线采用三阶贝塞尔曲线（Cubic Bézier Curve）：
  $$M(x_1, y_1) \;\; C(x_1 + \frac{\Delta x}{2}, y_1,\;\; x_2 - \frac{\Delta x}{2}, y_2,\;\; x_2, y_2)$$
- 实节点渲染为实心圆带高亮边框；虚节点渲染为虚线描边圆点或半透明呼吸光晕圆点。

---

## 6. 数据结构设计 (TypeScript Interfaces)

```typescript
// 1. 单个提交快照节点 (不可变)
export interface CommitNode {
  id: string;               // 唯一 UUID / 短 Hash
  cardId: string;           // 所属卡片 ID
  parentIds: string[];      // 父节点 ID 列表（合并时有多个 parent）
  title: string;            // 提交时的标题
  content: string;          // 提交时的论证正文
  changeLog: string;        // 变更日志（如 "initial commit"）
  timestamp: number;        // 提交时间毫秒数
  branchName: string;       // 分支名称，如 "main", "branch-1"
  isMergeCommit?: boolean;  // 是否为多卡合并产生的节点
  isSplitCommit?: boolean;  // 是否为拆分产生的节点
}

// 2. 卡片编辑中草稿状态 (可变)
export interface CardDraft {
  title: string;
  content: string;
  changeLog: string;
  baseCommitId: string;     // 当前编辑基于哪一个实节点
}

// 3. 核心卡片实体
export interface DiscussionCard {
  id: string;
  currentTitle: string;
  currentContent: string;
  status: 'staging' | 'committed' | 'merged_temp' | 'split_temp';
  column: 'left' | 'right'; // 处于左栏还是右栏
  
  // 版本控制核心字段
  commits: CommitNode[];    // 该卡片拥有的历史提交列表
  activeCommitId: string;   // 当前选中的实节点 ID
  draft: CardDraft;         // 自动保存的草稿
  
  // 临时操作上下文（Merge / Split）
  tempMeta?: {
    type: 'merge' | 'split';
    sourceCardIds?: string[];      // 合并来源卡片
    splitGroupKey?: string;        // 拆分所属分组标识
    splitTotalParts?: number;      // 拆分总份数
    splitIndex?: number;           // 当前为第几份
  };
  
  createdAt: number;
  updatedAt: number;
}

// 4. 回收站条目
export interface TrashItem {
  id: string;
  card: DiscussionCard;
  deletedAt: number;
}
```

---

## 7. 详细开发阶段与实施计划 (Milestones & Roadmap)

### 阶段一：项目底座搭建与设计系统规范 (Nuxt 3 Foundation)
- [ ] 初始化 Nuxt 3 干净工程结构，配置 TypeScript、Pinia、VueUse。
- [ ] 确立统一的现代 CSS 调色板（深浅模式变量、卡片阴影、边框微渐变、字体栈）。
- [ ] 封装基础原子组件：`BaseButton`、`BaseInput`、`BaseTextarea`、`Modal`、`DropdownMenu`。

### 阶段二：左栏孵化区与卡片基础流转 (Left Column & Lifecycle)
- [ ] 实现左侧卡片列表的默认排序与自增名称生成逻辑（`Case A`, `Case B`）。
- [ ] 实现底部 `+ 添加标题` 虚线交互卡片。
- [ ] 实现左侧卡片点击展开编辑态（正文、分割线、Change Log、默认 "initial commit"）。
- [ ] 实现左侧物理删除功能。
- [ ] 实现 `Commit` 校验与跨栏流转机制（从左栏转移至右栏）。

### 阶段三：右栏三段式模块与横向 Git-like 版本树 (Right Column & Git DAG)
- [ ] 构建右侧卡片折叠/展开视图。
- [ ] 研发专用的横向 Git DAG 渲染组件（`GitCommitGraph.vue`）：
  - 支持实节点与虚节点的绘制与区分。
  - 支持根据父子节点动态绘制曲线分支与合并线。
  - 支持横向平滑滚动与滚轮驱动。
- [ ] 点击历史节点查看快照，并保证当前草稿无损驻留（自动保存机制）。
- [ ] 区分普通提交（向前推进）与跨节点提交（`Create Branch & Commit`）。

### 阶段四：高级特性：多卡合并 (Merge) 与卡片拆分 (Split)
- [ ] 支持 `Ctrl + 鼠标左键` 跨卡片多选状态管理，触发底部浮动工具条。
- [ ] 实现 `Merge X Cards` 逻辑：生成多父节点虚卡片、双换行符文本拼接、`Revert Merge` 撤销与确认提交。
- [ ] 在 Commit 按钮旁开发 Split 下拉菜单，展开 `Split into X parts` 配置面板。
- [ ] 实现拆分生成 X 个克隆历史的临时卡片机制。
- [ ] 实现 `Revert Split` 撤销守则与已提交分支卡片的防误删确认弹窗。

### 阶段五：数据持久化、回收站与极客细节打磨 (Persistence, Trash & Polish)
- [ ] 完善右侧卡片的软删除逻辑与全局回收站抽屉（Trash Bin Drawer）。
- [ ] 实现全量状态与草稿在 IndexedDB / LocalStorage 的持久化与恢复。
- [ ] 针对高频交互进行键盘快捷键增强（如 `Ctrl+Enter` 快速 Commit、`Esc` 退出编辑）。
- [ ] 端到端功能走查与边界异常测试（如空标题、大量节点重绘、长文本换行保护）。

---

## 8. 代码规范与工程约束
1. **组件职责单一**：将复杂的版本树绘制、多选合并逻辑与单纯的卡片渲染充分解耦。
2. **纯函数式历史演进**：每次 Commit 产生的数据节点均为不可变对象（Immutable Snapshot），杜绝对象浅拷贝引发的历史污染。
3. **视觉标准**：拒绝粗糙简陋的默认排版，必须具备高质感的现代化工具软件美学。
