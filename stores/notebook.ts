// ============================================================
// NoteBookProject — Notebook Store (Pinia)
// 核心卡片状态管理：创建、提交、分支、合并、拆分、草稿自动保存与本地持久化
// ============================================================

import { defineStore } from 'pinia'
import type {
  DiscussionCard,
  CommitNode,
  CardDraft,
  TrashItem,
  TempMeta,
} from '~/types/notebook'
import { generateId, generateCaseName } from '~/utils/helpers'

// ---- Store State ----
interface NotebookState {
  /** 所有卡片（左栏 + 右栏）按 ID 索引 */
  cards: Record<string, DiscussionCard>
  /** 回收站条目 */
  trash: TrashItem[]
  /** 当前多选中的卡片 ID 列表（用于 Merge） */
  selectedCardIds: string[]
  /** 当前是否存在拆分组（组 key -> 源卡片 ID） */
  activeSplitGroups: Record<string, string>
}

const STORAGE_KEY = 'notebook_store_data_v1'

export const useNotebookStore = defineStore('notebook', {
  state: (): NotebookState => ({
    cards: {},
    trash: [],
    selectedCardIds: [],
    activeSplitGroups: {},
  }),

  getters: {
    /** 左栏卡片列表（按 order 排序） */
    leftCards(state): DiscussionCard[] {
      return Object.values(state.cards)
        .filter((c) => c.column === 'left')
        .sort((a, b) => a.order - b.order)
    },

    /** 右栏卡片列表（按 order 排序） */
    rightCards(state): DiscussionCard[] {
      return Object.values(state.cards)
        .filter((c) => c.column === 'right')
        .sort((a, b) => a.order - b.order)
    },

    /** 选中卡片数量 */
    selectedCount(state): number {
      return state.selectedCardIds.length
    },

    /** 是否显示 Merge 浮动条 */
    showMergeBar(state): boolean {
      return state.selectedCardIds.length >= 2
    },
  },

  actions: {
    // ==========================
    // 0. 持久化与初始化
    // ==========================

    initStore() {
      if (typeof window === 'undefined') return
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.cards && Object.keys(parsed.cards).length > 0) {
            this.cards = parsed.cards
            this.trash = parsed.trash || []
            this.activeSplitGroups = parsed.activeSplitGroups || {}
            return
          }
        }
      } catch (e) {
        console.error('Failed to load notebook data from localStorage', e)
      }

      // 若本地无数据，按规范初始化 Case A 和 Case B (左栏待论证区)
      this.initDefaultCards()
    },

    saveToStorage() {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            cards: this.cards,
            trash: this.trash,
            activeSplitGroups: this.activeSplitGroups,
          })
        )
      } catch (e) {
        console.error('Failed to save notebook data to localStorage', e)
      }
    },

    initDefaultCards() {
      this.cards = {}
      const now = Date.now()
      const idA = generateId()
      const idB = generateId()

      this.cards[idA] = {
        id: idA,
        currentTitle: 'Case A',
        currentContent: '',
        status: 'staging',
        column: 'left',
        order: 0,
        commits: [],
        activeCommitId: '',
        draft: {
          title: 'Case A',
          content: '',
          changeLog: 'initial commit',
          baseCommitId: '',
        },
        createdAt: now,
        updatedAt: now,
      }

      this.cards[idB] = {
        id: idB,
        currentTitle: 'Case B',
        currentContent: '',
        status: 'staging',
        column: 'left',
        order: 1,
        commits: [],
        activeCommitId: '',
        draft: {
          title: 'Case B',
          content: '',
          changeLog: 'initial commit',
          baseCommitId: '',
        },
        createdAt: now + 1,
        updatedAt: now + 1,
      }

      this.saveToStorage()
    },

    // ==========================
    // 1. 左栏操作
    // ==========================

    /** 在左栏新建一张空白标题卡片 */
    addStagingCard() {
      const existingNames = Object.values(this.cards).map((c) => c.currentTitle)
      const title = generateCaseName(existingNames)
      const now = Date.now()
      const id = generateId()

      const card: DiscussionCard = {
        id,
        currentTitle: title,
        currentContent: '',
        status: 'staging',
        column: 'left',
        order: this.leftCards.length,
        commits: [],
        activeCommitId: '',
        draft: {
          title,
          content: '',
          changeLog: 'initial commit',
          baseCommitId: '',
        },
        createdAt: now,
        updatedAt: now,
      }

      this.cards[id] = card
      this.saveToStorage()
    },

    /** 更新卡片的草稿内容（自动保存调用） */
    updateDraft(cardId: string, partial: Partial<CardDraft>) {
      const card = this.cards[cardId]
      if (!card) return
      Object.assign(card.draft, partial)
      card.updatedAt = Date.now()
      this.saveToStorage()
    },

    /** 左栏卡片物理删除（不入回收站） */
    deleteStagingCard(cardId: string) {
      const card = this.cards[cardId]
      if (!card || card.column !== 'left') return
      delete this.cards[cardId]
      this.saveToStorage()
    },

    // ==========================
    // 2. 提交与流转 (Commit & Branch)
    // ==========================

    /**
     * 执行 Commit
     * - 左栏卡片首次提交 -> 流转至右栏
     * - 右栏卡片基于叶子节点 -> 线性向前追加
     * - 右栏卡片基于已有子节点的历史节点 -> 自动新建分支
     * - 合并临时卡片提交 -> 生成含多个 parent 的 Merge Commit
     */
    commitCard(cardId: string) {
      const card = this.cards[cardId]
      if (!card) return

      const { draft } = card
      if (!draft.title.trim() || !draft.content.trim()) return

      const now = Date.now()
      const commitId = generateId()

      let parentIds: string[] = []
      let branchName = 'main'

      // 判断提交类型
      if (card.tempMeta?.type === 'merge') {
        // 合并卡片提交：收集所有源卡片在合并时的最新节点
        const sourceCards = (card.tempMeta.sourceCardIds || [])
          .map((id) => this.cards[id])
          .filter(Boolean) as DiscussionCard[]
        
        const sourceTips = sourceCards
          .map((c) => this.getLatestCommit(c)?.id)
          .filter(Boolean) as string[]

        parentIds = sourceTips.length > 0 ? sourceTips : (card.commits.length > 0 ? [card.commits[card.commits.length - 1].id] : [])
        branchName = 'main'
      } else if (card.commits.length === 0) {
        // 首次提交（左栏卡片初次 Commit）
        parentIds = []
        branchName = 'main'
      } else {
        // 已有提交的卡片：确定父节点与是否分叉
        const baseId = draft.baseCommitId || card.activeCommitId || (this.getLatestCommit(card)?.id ?? '')
        if (baseId) {
          parentIds = [baseId]
          const baseCommit = card.commits.find((c) => c.id === baseId)
          // 检查该父节点是否已有其他子节点
          const hasChildren = card.commits.some((c) => c.parentIds.includes(baseId))
          if (hasChildren) {
            // 已有子节点：分叉生成新分支！
            const existingBranches = new Set(card.commits.map((c) => c.branchName))
            branchName = `branch-${existingBranches.size}`
          } else {
            // 无子节点：顺延父节点所在分支
            branchName = baseCommit ? baseCommit.branchName : 'main'
          }
        }
      }

      const commitNode: CommitNode = {
        id: commitId,
        cardId,
        parentIds,
        title: draft.title,
        content: draft.content,
        changeLog: draft.changeLog || (card.commits.length === 0 ? 'initial commit' : 'update'),
        timestamp: now,
        branchName,
        isMergeCommit: card.tempMeta?.type === 'merge',
        isSplitCommit: card.tempMeta?.type === 'split',
      }

      card.commits.push(commitNode)
      card.activeCommitId = commitId
      card.currentTitle = draft.title
      card.currentContent = draft.content
      card.status = 'committed'
      card.updatedAt = now

      // 左栏首次提交 -> 流转至右栏
      if (card.column === 'left') {
        card.column = 'right'
        card.order = this.rightCards.length
      }

      // 若是合并临时卡片提交：清理合并临时状态，并彻底移除已被合并的源卡片
      if (card.tempMeta?.type === 'merge') {
        const sourceIds = card.tempMeta.sourceCardIds || []
        for (const sId of sourceIds) {
          delete this.cards[sId]
        }
        card.tempMeta = undefined
      }

      // 若是拆分临时卡片提交：解除拆分临时标记
      if (card.tempMeta?.type === 'split') {
        card.tempMeta = undefined
      }

      // 重置草稿为当前提交快照
      card.draft = {
        title: draft.title,
        content: draft.content,
        changeLog: '',
        baseCommitId: commitId,
      }

      this.saveToStorage()
    },

    // ==========================
    // 3. 右栏操作与回收站
    // ==========================

    /** 右栏卡片软删除（进回收站） */
    softDeleteCard(cardId: string) {
      const card = this.cards[cardId]
      if (!card || card.column !== 'right') return

      this.trash.push({
        id: generateId(),
        card: JSON.parse(JSON.stringify(card)),
        deletedAt: Date.now(),
      })
      // 取消多选
      this.selectedCardIds = this.selectedCardIds.filter((id) => id !== cardId)
      delete this.cards[cardId]
      this.saveToStorage()
    },

    /** 从回收站恢复 */
    restoreFromTrash(trashId: string) {
      const idx = this.trash.findIndex((t) => t.id === trashId)
      if (idx === -1) return
      const item = this.trash[idx]
      item.card.order = this.rightCards.length
      this.cards[item.card.id] = item.card
      this.trash.splice(idx, 1)
      this.saveToStorage()
    },

    /** 从回收站彻底删除 */
    permanentDeleteFromTrash(trashId: string) {
      const idx = this.trash.findIndex((t) => t.id === trashId)
      if (idx !== -1) {
        this.trash.splice(idx, 1)
        this.saveToStorage()
      }
    },

    /** 清空回收站 */
    clearTrash() {
      this.trash = []
      this.saveToStorage()
    },

    /** 切换查看某个历史实节点 */
    selectCommit(cardId: string, commitId: string) {
      const card = this.cards[cardId]
      if (!card) return
      card.activeCommitId = commitId
      // 同步准备草稿基础
      const commit = card.commits.find((c) => c.id === commitId)
      if (commit) {
        card.draft.baseCommitId = commitId
        // 当切换到历史节点时，将标题与内容同步给草稿供修改与比对
        card.draft.title = commit.title
        card.draft.content = commit.content
      }
      this.saveToStorage()
    },

    /** 切换回到最新草稿态 */
    selectGhostDraft(cardId: string) {
      const card = this.cards[cardId]
      if (!card) return
      const latest = this.getLatestCommit(card)
      card.activeCommitId = ''
      if (latest && !card.draft.baseCommitId) {
        card.draft.baseCommitId = latest.id
      }
    },

    // ==========================
    // 4. 多选与合并 (Merge)
    // ==========================

    /** 切换单个卡片的选中状态 */
    toggleSelection(cardId: string) {
      const idx = this.selectedCardIds.indexOf(cardId)
      if (idx === -1) {
        this.selectedCardIds.push(cardId)
      } else {
        this.selectedCardIds.splice(idx, 1)
      }
    },

    /** 清除所有选中 */
    clearSelection() {
      this.selectedCardIds = []
    },

    /** 执行合并：生成临时卡片 */
    mergeSelectedCards() {
      if (this.selectedCardIds.length < 2) return

      const sourceCards = this.selectedCardIds
        .map((id) => this.cards[id])
        .filter(Boolean) as DiscussionCard[]

      // 合并文本（双换行分隔）
      const mergedTitle = sourceCards.map((c) => c.currentTitle).join(' + ')
      const mergedContent = sourceCards.map((c) => c.currentContent).join('\n\n')

      const now = Date.now()
      const mergedId = generateId()

      // 提取每个源卡片的最新提交 ID 作为合并汇聚父节点
      const sourceTipIds = sourceCards
        .map((c) => this.getLatestCommit(c)?.id)
        .filter(Boolean) as string[]

      // 复制所有源卡片的历史提交：给每个源卡片分配独立的分支名称以形成清晰的平行轨道，最终多合一汇聚
      const allCommits: CommitNode[] = []
      sourceCards.forEach((c, idx) => {
        const branchPrefix = idx === 0 ? 'main' : `branch-${idx}`
        c.commits.forEach((commit) => {
          allCommits.push({
            ...commit,
            cardId: mergedId,
            branchName: commit.branchName === 'main' ? branchPrefix : `${branchPrefix}-${commit.branchName}`,
          })
        })
      })

      const mergedCard: DiscussionCard = {
        id: mergedId,
        currentTitle: mergedTitle,
        currentContent: mergedContent,
        status: 'merged_temp',
        column: 'right',
        order: this.rightCards.length,
        commits: allCommits,
        activeCommitId: '', // 处于工作区草稿状态
        draft: {
          title: mergedTitle,
          content: mergedContent,
          changeLog: `Merge: ${sourceCards.map((c) => c.currentTitle).join(' & ')}`,
          baseCommitId: '',
          baseCommitIds: sourceTipIds,
        },
        tempMeta: {
          type: 'merge',
          sourceCardIds: this.selectedCardIds.slice(),
          sourceTipIds: sourceTipIds,
        },
        createdAt: now,
        updatedAt: now,
      }

      // 将源卡片隐藏（放入后台，暂不销毁）
      for (const id of this.selectedCardIds) {
        const card = this.cards[id]
        if (card) card.column = 'left' // 临时隐去
      }

      this.cards[mergedId] = mergedCard
      this.clearSelection()
      this.saveToStorage()
    },

    /** 撤销合并 */
    revertMerge(mergedCardId: string) {
      const mergedCard = this.cards[mergedCardId]
      if (!mergedCard || mergedCard.tempMeta?.type !== 'merge') return

      const sourceIds = mergedCard.tempMeta.sourceCardIds || []

      // 恢复原卡片显示在右栏
      for (const id of sourceIds) {
        const card = this.cards[id]
        if (card) {
          card.column = 'right'
        }
      }

      // 删除临时合并卡片
      delete this.cards[mergedCardId]
      this.saveToStorage()
    },

    // ==========================
    // 5. 拆分 (Split)
    // ==========================

    /** 执行拆分：从当前卡片派生 X 个临时卡片 */
    splitCard(cardId: string, parts: number) {
      const sourceCard = this.cards[cardId]
      if (!sourceCard || parts < 2) return

      const groupKey = generateId()
      const now = Date.now()

      for (let i = 0; i < parts; i++) {
        const splitId = generateId()
        const splitCard: DiscussionCard = {
          id: splitId,
          currentTitle: `${sourceCard.currentTitle} (Part ${i + 1})`,
          currentContent: sourceCard.currentContent,
          status: 'split_temp',
          column: 'right',
          order: this.rightCards.length + i,
          // 完整克隆历史
          commits: sourceCard.commits.map((c) => ({ ...c, cardId: splitId })),
          activeCommitId: sourceCard.activeCommitId,
          draft: {
            title: `${sourceCard.currentTitle} (Part ${i + 1})`,
            content: sourceCard.currentContent,
            changeLog: `Split part ${i + 1}/${parts}`,
            baseCommitId: sourceCard.activeCommitId,
          },
          tempMeta: {
            type: 'split',
            splitGroupKey: groupKey,
            splitTotalParts: parts,
            splitIndex: i,
          },
          createdAt: now,
          updatedAt: now,
        }
        this.cards[splitId] = splitCard
      }

      // 记录活跃拆分组
      this.activeSplitGroups[groupKey] = cardId

      // 隐藏源卡片
      sourceCard.column = 'left'
      this.saveToStorage()
    },

    /** 撤销拆分 */
    revertSplit(groupKey: string) {
      const sourceCardId = this.activeSplitGroups[groupKey]
      if (!sourceCardId) return

      const splitCards = Object.values(this.cards).filter(
        (c) => c.tempMeta?.splitGroupKey === groupKey
      )

      // 删除所有未提交的拆分卡片，已提交的保留为独立卡片
      for (const card of splitCards) {
        if (card.status !== 'committed') {
          delete this.cards[card.id]
        } else {
          card.tempMeta = undefined
        }
      }

      // 恢复源卡片
      const sourceCard = this.cards[sourceCardId]
      if (sourceCard) {
        sourceCard.column = 'right'
      }

      delete this.activeSplitGroups[groupKey]
      this.saveToStorage()
    },

    /** 检查拆分组中是否有已提交的卡片 */
    hasSplitGroupCommitted(groupKey: string): boolean {
      return Object.values(this.cards).some(
        (c) => c.tempMeta?.splitGroupKey === groupKey && c.status === 'committed'
      )
    },

    // ==========================
    // 6. 辅助方法
    // ==========================

    /** 获取卡片在指定分支上的最新提交 */
    getLatestCommit(card: DiscussionCard): CommitNode | undefined {
      if (!card.commits || card.commits.length === 0) return undefined
      return [...card.commits].sort((a, b) => b.timestamp - a.timestamp)[0]
    },

    /** 检查某个提交是否为叶子节点（即没有以它为父节点的其他提交） */
    isLeafCommit(card: DiscussionCard, commitId: string): boolean {
      return !card.commits.some((c) => c.parentIds && c.parentIds.includes(commitId))
    },
  },
})
