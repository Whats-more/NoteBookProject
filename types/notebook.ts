// ============================================================
// NoteBookProject — Core Data Models & Type Definitions
// ============================================================

/**
 * 单个提交快照节点（不可变）
 * 每次 Commit 产生一个新的 CommitNode，历史节点不可修改。
 */
export interface CommitNode {
  /** 唯一标识符 (UUID) */
  id: string
  /** 所属卡片 ID */
  cardId: string
  /** 父节点 ID 列表（合并时有多个 parent） */
  parentIds: string[]
  /** 提交时的标题快照 */
  title: string
  /** 提交时的论证正文快照 */
  content: string
  /** 变更日志（如 "initial commit"） */
  changeLog: string
  /** 提交时间戳（毫秒） */
  timestamp: number
  /** 分支名称，如 "main", "branch-1" */
  branchName: string
  /** 是否为多卡合并产生的节点 */
  isMergeCommit?: boolean
  /** 是否为拆分产生的节点 */
  isSplitCommit?: boolean
}

/**
 * 卡片编辑中的草稿状态（可变，自动保存）
 */
export interface CardDraft {
  /** 当前编辑的标题 */
  title: string
  /** 当前编辑的论证正文 */
  content: string
  /** 当前编辑的变更日志 */
  changeLog: string
  /** 当前编辑基于哪一个实节点的 ID */
  baseCommitId: string
  /** 合并草稿时基于的多个父节点 ID 列表 */
  baseCommitIds?: string[]
}

/**
 * 卡片状态枚举
 */
export type CardStatus = 'staging' | 'committed' | 'merged_temp' | 'split_temp'

/**
 * 卡片所在列
 */
export type CardColumn = 'left' | 'right'

/**
 * 临时操作上下文（Merge / Split）
 */
export interface TempMeta {
  /** 临时操作类型 */
  type: 'merge' | 'split'
  /** 合并来源卡片 ID 列表 */
  sourceCardIds?: string[]
  /** 合并来源各分支尖端提交 ID 列表（用于多合一收敛） */
  sourceTipIds?: string[]
  /** 拆分所属分组标识 */
  splitGroupKey?: string
  /** 拆分总份数 */
  splitTotalParts?: number
  /** 当前为第几份（0-indexed） */
  splitIndex?: number
}

/**
 * 核心卡片实体
 */
export interface DiscussionCard {
  /** 唯一标识符 (UUID) */
  id: string
  /** 当前展示标题（收起态可见） */
  currentTitle: string
  /** 当前展示内容（收起态摘要或最后提交快照） */
  currentContent: string
  /** 卡片状态 */
  status: CardStatus
  /** 所在列（左栏 / 右栏） */
  column: CardColumn
  /** 排序权重（用于列表排序） */
  order: number

  // --- 版本控制核心字段 ---
  /** 该卡片拥有的历史提交列表 */
  commits: CommitNode[]
  /** 当前选中的实节点 ID（浏览历史时切换） */
  activeCommitId: string
  /** 自动保存的草稿 */
  draft: CardDraft

  // --- 临时操作上下文 ---
  /** Merge / Split 的元数据 */
  tempMeta?: TempMeta

  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
}

/**
 * 回收站条目
 */
export interface TrashItem {
  /** 唯一标识符 */
  id: string
  /** 被删除的卡片完整数据 */
  card: DiscussionCard
  /** 删除时间 */
  deletedAt: number
}

/**
 * 版本树中节点的渲染位置信息（用于 SVG 绘制）
 */
export interface GraphNodePosition {
  /** 对应的 CommitNode ID */
  commitId: string
  /** 是否为虚节点（未提交的草稿态） */
  isGhost: boolean
  /** 横向列索引 */
  col: number
  /** 纵向轨道索引（分支 lane） */
  lane: number
  /** 计算出的 SVG x 坐标 */
  x: number
  /** 计算出的 SVG y 坐标 */
  y: number
}
