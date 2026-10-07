<!-- ============================================================
  DiscussionCard.vue — 右栏已论证卡片
  满足需求：
  1. 常态展示标题与论证推演；点击展开条才展开版本树与更新日志
  2. 版本树精确支持节点选取与多合一 Merge 汇聚
  3. Change Log 必填项强校验
  4. 一旦改动立即进入 Draft 阶段并激活“工作区草稿”指示灯
  5. Commit 按钮与 Split 下拉触发按钮像素级精准对齐
============================================================ -->
<template>
  <div
    :id="`discussion-card-${card.id}`"
    class="card discussion-card"
    :class="{
      selected: isSelected,
      'is-temp-merge': card.tempMeta?.type === 'merge',
      'is-temp-split': card.tempMeta?.type === 'split'
    }"
    @click="handleCardClick"
  >
    <!-- 卡片顶部操作条 -->
    <div class="card-header">
      <div class="header-left">
        <!-- 多选框 -->
        <label
          class="checkbox-wrapper"
          title="勾选或按住 Ctrl/Cmd 单击以多选合并"
          @click.stop
        >
          <input
            type="checkbox"
            :checked="isSelected"
            @change="toggleSelect"
          />
          <span class="custom-checkbox"></span>
        </label>

        <!-- 标题预览 -->
        <div class="header-title-box">
          <span class="header-title-text">{{ draftTitle || card.currentTitle }}</span>
        </div>

        <!-- 状态标签组 -->
        <div class="badge-group">
          <span v-if="card.tempMeta?.type === 'merge'" class="badge badge-merge">
            Merge Temp
          </span>
          <span v-else-if="card.tempMeta?.type === 'split'" class="badge badge-split">
            Split Part {{ (card.tempMeta.splitIndex ?? 0) + 1 }}/{{ card.tempMeta.splitTotalParts }}
          </span>
          <span v-if="currentBranchName" class="badge badge-branch">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            {{ currentBranchName }}
          </span>
          <span class="badge badge-neutral">
            {{ card.commits.length }} commits
          </span>
        </div>
      </div>

      <div class="header-right">
        <!-- 软删除按钮（移入回收站） -->
        <button
          :id="`delete-card-${card.id}`"
          class="btn-icon danger"
          title="移入回收站"
          @click.stop="handleSoftDelete"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 常态展示：上部标题与论证正文推演 -->
    <div class="card-top-content">
      <div class="input-field">
        <label class="field-label">论证议题标题</label>
        <input
          :id="`discussion-title-${card.id}`"
          v-model="draftTitle"
          class="input-title-full"
          placeholder="输入议题标题..."
          @input="onDraftInput"
          @click.stop
        />
      </div>

      <div class="input-field">
        <label class="field-label">论证推演详情</label>
        <textarea
          :id="`discussion-content-${card.id}`"
          v-model="draftContent"
          class="textarea discussion-textarea"
          placeholder="展开详细逻辑推演、论据陈述、反例探究..."
          rows="4"
          @input="onDraftInput"
          @click.stop
        ></textarea>
      </div>
    </div>

    <!-- 展开/收起版本控制树与提交的交互栏 (默认收起，点击才展开) -->
    <div
      class="version-control-toggle-bar"
      :class="{ expanded: isTreeExpanded }"
      @click.stop="isTreeExpanded = !isTreeExpanded"
    >
      <div class="toggle-left">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          class="chevron-icon"
          :class="{ rotated: isTreeExpanded }"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span class="toggle-text">
          {{ isTreeExpanded ? '收起版本树与提交控制' : `点击展开版本控制树与提交日志 (${card.commits.length} 个提交)` }}
        </span>
      </div>

      <div class="toggle-right">
        <span v-if="isDraftDirty" class="dirty-badge">
          <span class="dot-small"></span> 草稿未提交
        </span>
      </div>
    </div>

    <!-- 展开详情区域：树状图 + Change Log + Commit 按钮 -->
    <Transition name="slide-up">
      <div v-if="isTreeExpanded" class="card-tree-details" @click.stop>
        <!-- 历史快照提示条 -->
        <div v-if="isViewingHistorical && !isDraftDirty" class="historical-banner">
          <div class="banner-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>正在查看历史提交快照 <code>{{ activeCommitSummary?.id.slice(0, 7) }}</code>（若编辑内容将自动进入草稿并派生分支）</span>
          </div>
          <button class="btn btn-ghost btn-sm" @click="resetToGhostDraft">
            切到最新草稿
          </button>
        </div>

        <!-- 中部：版本树 (SVG DAG) -->
        <section class="section-mid">
          <VersionTree
            :commits="card.commits"
            :active-commit-id="card.activeCommitId"
            :show-ghost="true"
            :merge-parent-ids="card.tempMeta?.sourceTipIds || card.draft.baseCommitIds || []"
            :is-draft-active="isDraftDirty || !card.activeCommitId || card.activeCommitId === 'draft'"
            @select-commit="onSelectCommit"
            @select-ghost="onSelectGhost"
          />

          <!-- 当前选中提交的元信息摘要卡 -->
          <div v-if="activeCommitSummary" class="commit-inspector">
            <div class="inspector-item">
              <span class="inspector-label">当前节点</span>
              <span class="inspector-val font-mono">{{ activeCommitSummary.id.slice(0, 8) }}</span>
            </div>
            <div class="inspector-item">
              <span class="inspector-label">分支</span>
              <span class="inspector-val font-mono">{{ activeCommitSummary.branchName }}</span>
            </div>
            <div class="inspector-item">
              <span class="inspector-label">Change Log</span>
              <span class="inspector-val">{{ activeCommitSummary.changeLog }}</span>
            </div>
            <div class="inspector-item">
              <span class="inspector-label">时间</span>
              <span class="inspector-val">{{ formatTimestamp(activeCommitSummary.timestamp) }}</span>
            </div>
          </div>
        </section>

        <!-- 下部：变更说明与提交流转 -->
        <section class="section-bottom">
          <div class="changelog-row">
            <div class="changelog-input-wrap">
              <span class="input-prefix-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <input
                :id="`discussion-changelog-${card.id}`"
                v-model="draftChangeLog"
                class="input changelog-input"
                :placeholder="isBranchMode ? '新分支说明 *(必填，例如: 提出平行假设)' : '变更说明 *(必填，例如: 完善论据/修订结论)'"
                @input="onDraftInput"
              />
            </div>

            <!-- 操作按钮组 -->
            <div class="action-btn-group">
              <!-- 临时合并卡片操作 -->
              <template v-if="card.tempMeta?.type === 'merge'">
                <button
                  class="btn btn-secondary btn-sm"
                  title="撤销合并，恢复原有卡片"
                  @click="handleRevertMerge"
                >
                  Revert Merge
                </button>
                <button
                  class="btn btn-primary"
                  :disabled="!canCommit"
                  @click="handleCommit"
                >
                  Commit Merge
                </button>
              </template>

              <!-- 临时拆分卡片操作 -->
              <template v-else-if="card.tempMeta?.type === 'split'">
                <button
                  class="btn btn-secondary btn-sm"
                  title="撤销拆分并恢复原卡片"
                  @click="handleRevertSplit"
                >
                  Revert Split
                </button>
                <button
                  class="btn btn-primary"
                  :disabled="!canCommit"
                  @click="handleCommit"
                >
                  Commit Part
                </button>
              </template>

              <!-- 常规提交与拆分入口（严格高度 36px 绝对对齐） -->
              <template v-else>
                <div class="split-btn-group">
                  <!-- 核心提交按钮 -->
                  <button
                    :id="`discussion-commit-${card.id}`"
                    class="btn commit-main-btn"
                    :class="isBranchMode ? 'btn-branch' : 'btn-primary'"
                    :disabled="!canCommit"
                    @click="handleCommit"
                  >
                    <!-- 普通 Commit 图标 -->
                    <svg
                      v-if="!isBranchMode"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <line x1="1.05" y1="12" x2="7" y2="12" />
                      <line x1="17.01" y1="12" x2="22.96" y2="12" />
                    </svg>
                    <!-- 分支 Commit 图标 -->
                    <svg
                      v-else
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <line x1="6" y1="3" x2="6" y2="15" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 9a9 9 0 0 1-9 9" />
                    </svg>
                    <span>{{ isBranchMode ? 'Create Branch & Commit' : 'Commit' }}</span>
                  </button>

                  <!-- 拆分 Split 下拉触发按钮 -->
                  <div class="split-menu-container">
                    <button
                      :id="`split-trigger-${card.id}`"
                      class="btn btn-dropdown-trigger"
                      :class="isBranchMode ? 'btn-branch-trigger' : 'btn-primary-trigger'"
                      title="拆分卡片 (Split into X parts)"
                      @click="isSplitPopoverOpen = !isSplitPopoverOpen"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    <!-- 拆分弹出菜单 -->
                    <div v-if="isSplitPopoverOpen" class="split-popover glass">
                      <div class="popover-title">拆分论证议题</div>
                      <p class="popover-desc">将当前议题克隆拆分为多个独立的子议题并行论证：</p>
                      <div class="parts-selector">
                        <label class="parts-label">拆分份数：</label>
                        <div class="stepper">
                          <button
                            class="stepper-btn"
                            :disabled="splitParts <= 2"
                            @click="splitParts--"
                          >
                            -
                          </button>
                          <span class="parts-val">{{ splitParts }}</span>
                          <button
                            class="stepper-btn"
                            :disabled="splitParts >= 6"
                            @click="splitParts++"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div class="popover-actions">
                        <button class="btn btn-ghost btn-sm" @click="isSplitPopoverOpen = false">
                          取消
                        </button>
                        <button class="btn btn-primary btn-sm" @click="confirmSplit">
                          确认拆分 ({{ splitParts }} 份)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="!draftChangeLog.trim()" class="changelog-required-hint">
            * 提示：需输入 Change Log 变更说明后方可提交
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNotebookStore } from '~/stores/notebook'
import type { DiscussionCard, CommitNode } from '~/types/notebook'
import VersionTree from '~/components/graph/VersionTree.vue'
import { formatTimestamp } from '~/utils/helpers'

const props = defineProps<{
  card: DiscussionCard
}>()

const emit = defineEmits<{
  requestSplitRevertConfirm: [groupKey: string]
}>()

const store = useNotebookStore()

// 树状图与提交控制展开状态（默认收起，点击后展开）
const isTreeExpanded = ref(false)

// 拆分弹窗
const isSplitPopoverOpen = ref(false)
const splitParts = ref(2)

// 本地草稿响应式状态
const draftTitle = ref(props.card.draft.title || props.card.currentTitle)
const draftContent = ref(props.card.draft.content || props.card.currentContent)
const draftChangeLog = ref(props.card.draft.changeLog || '')

// 监听 card.draft 外部变化同步回本地
watch(
  () => props.card.draft,
  (newDraft) => {
    if (newDraft) {
      draftTitle.value = newDraft.title
      draftContent.value = newDraft.content
      draftChangeLog.value = newDraft.changeLog
    }
  },
  { deep: true }
)

// 多选判断
const isSelected = computed(() => {
  return store.selectedCardIds.includes(props.card.id)
})

function toggleSelect() {
  store.toggleSelection(props.card.id)
}

function handleCardClick(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) {
    toggleSelect()
  }
}

// 当前选中的实节点
const activeCommitSummary = computed<CommitNode | undefined>(() => {
  if (!props.card.activeCommitId || props.card.activeCommitId === 'draft') {
    return store.getLatestCommit(props.card)
  }
  return props.card.commits.find((c) => c.id === props.card.activeCommitId)
})

// 判断当前内容是否相对选中历史节点有改动 (Dirty)
const isDraftDirty = computed(() => {
  if (!props.card.activeCommitId || props.card.activeCommitId === 'draft') return true
  const active = activeCommitSummary.value
  if (!active) return true
  return (
    draftTitle.value !== active.title ||
    draftContent.value !== active.content ||
    draftChangeLog.value.trim().length > 0
  )
})

// 自动保存防抖 & 自动切入 Draft 阶段
let debounceTimer: ReturnType<typeof setTimeout> | null = null
function onDraftInput() {
  // 一旦发生输入修改，树状图立即脱离历史节点，进入工作区草稿阶段
  if (props.card.activeCommitId && props.card.activeCommitId !== 'draft') {
    if (isDraftDirty.value) {
      store.selectGhostDraft(props.card.id)
    }
  }

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.updateDraft(props.card.id, {
      title: draftTitle.value,
      content: draftContent.value,
      changeLog: draftChangeLog.value,
    })
  }, 300)
}

// 是否可以提交（Change Log 必填强校验）
const canCommit = computed(() => {
  return (
    draftTitle.value.trim().length > 0 &&
    draftContent.value.trim().length > 0 &&
    draftChangeLog.value.trim().length > 0
  )
})

// 是否处于查看历史非尖端节点模式
const isViewingHistorical = computed(() => {
  if (!props.card.activeCommitId || props.card.activeCommitId === 'draft') return false
  const latest = store.getLatestCommit(props.card)
  if (!latest) return false
  return props.card.activeCommitId !== latest.id
})

// 是否为分叉模式 (Create Branch & Commit)
const isBranchMode = computed(() => {
  if (!props.card.activeCommitId || props.card.activeCommitId === 'draft') return false
  return !store.isLeafCommit(props.card, props.card.activeCommitId)
})

// 当前活跃分支名
const currentBranchName = computed(() => {
  if (activeCommitSummary.value) {
    return activeCommitSummary.value.branchName
  }
  const latest = store.getLatestCommit(props.card)
  return latest ? latest.branchName : 'main'
})

// 节点切换
function onSelectCommit(commitId: string) {
  store.selectCommit(props.card.id, commitId)
  const commit = props.card.commits.find((c) => c.id === commitId)
  if (commit) {
    draftTitle.value = commit.title
    draftContent.value = commit.content
    draftChangeLog.value = ''
  }
}

function onSelectGhost() {
  store.selectGhostDraft(props.card.id)
}

function resetToGhostDraft() {
  store.selectGhostDraft(props.card.id)
}

// 提交
function handleCommit() {
  store.updateDraft(props.card.id, {
    title: draftTitle.value,
    content: draftContent.value,
    changeLog: draftChangeLog.value,
  })
  store.commitCard(props.card.id)
  draftChangeLog.value = ''
}

// 软删除
function handleSoftDelete() {
  store.softDeleteCard(props.card.id)
}

// 合并与拆分撤销
function handleRevertMerge() {
  store.revertMerge(props.card.id)
}

function handleRevertSplit() {
  const groupKey = props.card.tempMeta?.splitGroupKey
  if (!groupKey) return
  if (store.hasSplitGroupCommitted(groupKey)) {
    emit('requestSplitRevertConfirm', groupKey)
  } else {
    store.revertSplit(groupKey)
  }
}

function confirmSplit() {
  store.splitCard(props.card.id, splitParts.value)
  isSplitPopoverOpen.value = false
}
</script>

<style scoped>
.discussion-card {
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all var(--duration-normal) var(--ease-out);
}

.discussion-card.is-temp-merge {
  border-color: rgba(192, 132, 252, 0.4);
}
.discussion-card.is-temp-split {
  border-color: rgba(56, 189, 248, 0.4);
}

/* 顶部操作条 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.header-title-box {
  flex: 1;
  min-width: 0;
}

.header-title-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 标签组 */
.badge-group {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.badge {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.badge-merge {
  background: var(--color-merge-muted);
  color: var(--color-merge);
}
.badge-split {
  background: var(--color-split-muted);
  color: var(--color-split);
}
.badge-branch {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
.badge-neutral {
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

/* 自定义多选框 */
.checkbox-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.checkbox-wrapper input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}
.custom-checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-bg-input);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-out);
}
.checkbox-wrapper input:checked ~ .custom-checkbox {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
.checkbox-wrapper input:checked ~ .custom-checkbox::after {
  content: '';
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) translate(-1px, -1px);
}

/* 常态上部内容（标题与正文） */
.card-top-content {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.input-title-full {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--duration-fast) var(--ease-out);
}
.input-title-full:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.discussion-textarea {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.65;
}

/* 版本控制展开交互栏 */
.version-control-toggle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-lg);
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all var(--duration-fast) var(--ease-out);
}
.version-control-toggle-bar:hover {
  background: rgba(255, 255, 255, 0.05);
}
.version-control-toggle-bar.expanded {
  border-bottom-color: var(--color-border);
  background: rgba(120, 130, 255, 0.04);
}

.toggle-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
}
.version-control-toggle-bar:hover .toggle-left {
  color: var(--color-text-primary);
}

.chevron-icon {
  transition: transform var(--duration-fast) var(--ease-out);
}
.chevron-icon.rotated {
  transform: rotate(180deg);
}

.dirty-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.6875rem;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-weight: 600;
}
.dot-small {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
}

/* 展开树状图与提交区域 */
.card-tree-details {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  background: rgba(0, 0, 0, 0.15);
}

/* 历史快照提示条 */
.historical-banner {
  background: rgba(245, 166, 35, 0.12);
  border: 1px solid rgba(245, 166, 35, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  color: #fbbf24;
  font-size: 0.8125rem;
}
.banner-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.banner-left code {
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

/* 版本树部分 */
.section-mid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.commit-inspector {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-md);
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.inspector-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}
.inspector-label {
  color: var(--color-text-tertiary);
}
.inspector-val {
  color: var(--color-text-secondary);
}
.font-mono {
  font-family: var(--font-mono);
}

/* 提交控制部分 */
.section-bottom {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--color-border);
}

.changelog-row {
  display: flex;
  align-items: stretch;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.changelog-input-wrap {
  flex: 1;
  min-width: 240px;
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix-icon {
  position: absolute;
  left: var(--space-md);
  color: var(--color-text-tertiary);
  pointer-events: none;
  display: flex;
  align-items: center;
}

.changelog-input {
  padding-left: calc(var(--space-md) + 20px);
  height: 36px;
  box-sizing: border-box;
}

.action-btn-group {
  display: flex;
  align-items: stretch;
  gap: var(--space-sm);
}

.btn-branch {
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  color: #fff;
  border: none;
}
.btn-branch:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
}

/* ========================================================
   Commit 与 Split 按钮组（像素级精准对齐）
   ======================================================== */
.split-btn-group {
  display: inline-flex;
  align-items: stretch;
  height: 36px;
  position: relative;
}

.commit-main-btn {
  height: 36px !important;
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: var(--space-xs) !important;
  padding: 0 var(--space-md) !important;
  margin: 0 !important;
  line-height: 1 !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.25) !important;
}

.split-menu-container {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  height: 36px;
  margin: 0;
  padding: 0;
}

.btn-dropdown-trigger {
  height: 36px !important;
  width: 32px !important;
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1 !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  border-left: none !important;
}

.btn-primary-trigger {
  background: var(--color-accent);
  color: #fff;
}
.btn-primary-trigger:hover {
  background: var(--color-accent-hover);
}

.btn-branch-trigger {
  background: #818cf8;
  color: #fff;
}
.btn-branch-trigger:hover {
  filter: brightness(1.1);
}

.changelog-required-hint {
  font-size: 0.6875rem;
  color: var(--color-warning);
  padding-left: var(--space-xs);
}

/* 拆分气泡弹窗 */
.split-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: 280px;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  z-index: var(--z-dropdown);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  animation: slideUp 150ms var(--ease-spring);
}

.popover-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.popover-desc {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.parts-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) 0;
}
.parts-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  padding: 2px 4px;
}
.stepper-btn {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border-radius: 4px;
}
.stepper-btn:hover:not(:disabled) {
  background: var(--color-bg-card-hover);
}
.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.parts-val {
  font-weight: 600;
  font-size: 0.875rem;
  min-width: 16px;
  text-align: center;
}

.popover-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}
</style>
