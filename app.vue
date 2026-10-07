<!-- ============================================================
  NoteBookProject — 主页面 (app/app.vue)
  双栏流转架构：
  - 左侧：待论证纯标题孵化区 (+ 添加标题、草稿展开、initial commit 流转)
  - 右侧：已论证讨论与版本树演进区 (三段式展开、SVG Git-like DAG、分支分叉、Merge、Split)
============================================================ -->
<template>
  <div class="app-layout" @keydown.esc="onEscKey" tabindex="-1">
    <!-- 顶部状态导航栏 -->
    <AppHeader @open-trash="isTrashOpen = true" />

    <!-- 双栏工作区容器 -->
    <main class="columns-container">
      <!-- ==============================================
           左侧栏：纯标题孵化区 (Staging Area)
      =============================================== -->
      <section class="column column-left" aria-label="待论证纯标题孵化区">
        <header class="column-header">
          <div class="col-title-group">
            <h2 id="staging-heading">待论证议题</h2>
            <span class="count-pill">{{ store.leftCards.length }}</span>
          </div>
          <span class="col-subtitle">纯标题孵化 · 展开论证后 Commit 流转</span>
        </header>

        <!-- 卡片列表 -->
        <div class="card-list" role="list">
          <StagingCard
            v-for="card in store.leftCards"
            :key="card.id"
            :card="card"
          />

          <!-- 底部虚线按钮：+ 添加标题 -->
          <button
            id="add-card-btn"
            class="card-dashed add-staging-btn"
            @click="handleAddStaging"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            + 添加标题
          </button>
        </div>
      </section>

      <!-- ==============================================
           右侧栏：已论证讨论区 (Discussion & Version Tree)
      =============================================== -->
      <section class="column column-right" aria-label="已论证讨论区">
        <header class="column-header">
          <div class="col-title-group">
            <h2 id="discussion-heading">已论证讨论与版本树</h2>
            <span class="count-pill accent">{{ store.rightCards.length }}</span>
          </div>
          <div class="col-header-tips">
            <span class="shortcut-tip">按住 <code>Ctrl/Cmd</code> 单击卡片可多选进行 Merge</span>
          </div>
        </header>

        <!-- 卡片列表 -->
        <div class="card-list" role="list">
          <!-- 空状态说明 -->
          <div v-if="store.rightCards.length === 0" class="empty-column-state">
            <div class="empty-icon-box">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M6 21V9a9 9 0 0 0 9 9" />
              </svg>
            </div>
            <h3 class="empty-title">暂无已提交的论证讨论</h3>
            <p class="empty-desc">
              在左侧孵化区选择议题卡片，填写论据推演与 Change Log，点击 <strong>Commit</strong> 即可流转至此处并启动 Git-like 演进树。
            </p>
          </div>

          <!-- 已提交卡片列表 -->
          <DiscussionCard
            v-for="card in store.rightCards"
            :key="card.id"
            :card="card"
            @request-split-revert-confirm="openSplitRevertModal"
          />
        </div>
      </section>
    </main>

    <!-- 底部多选 Merge 悬浮工具栏 -->
    <CardToolbar />

    <!-- 回收站弹窗 -->
    <TrashModal
      :is-open="isTrashOpen"
      @close="isTrashOpen = false"
    />

    <!-- 拆分撤销防误删确认弹窗 -->
    <Transition name="fade">
      <div v-if="splitRevertGroupConfirm" class="overlay" @click.self="splitRevertGroupConfirm = null">
        <div class="modal glass split-confirm-modal">
          <div class="confirm-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 class="confirm-title">确认撤销拆分？</h3>
          <p class="confirm-desc">
            该拆分组中已有部分卡片完成了独立提交。撤销拆分将<strong>保留已提交的分支</strong>为独立卡片，仅恢复原主卡片并清理未提交的草稿。
          </p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="splitRevertGroupConfirm = null">
              取消
            </button>
            <button class="btn btn-danger" @click="confirmRevertSplit">
              确认撤销并保留已提交历史
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotebookStore } from '~/stores/notebook'
import AppHeader from '~/components/layout/AppHeader.vue'
import StagingCard from '~/components/card/StagingCard.vue'
import DiscussionCard from '~/components/card/DiscussionCard.vue'
import CardToolbar from '~/components/card/CardToolbar.vue'
import TrashModal from '~/components/layout/TrashModal.vue'

const store = useNotebookStore()
const isTrashOpen = ref(false)
const splitRevertGroupConfirm = ref<string | null>(null)

onMounted(() => {
  store.initStore()
})

function handleAddStaging() {
  store.addStagingCard()
}

function onEscKey() {
  if (store.selectedCardIds.length > 0) {
    store.clearSelection()
  }
}

function openSplitRevertModal(groupKey: string) {
  splitRevertGroupConfirm.value = groupKey
}

function confirmRevertSplit() {
  if (splitRevertGroupConfirm.value) {
    store.revertSplit(splitRevertGroupConfirm.value)
    splitRevertGroupConfirm.value = null
  }
}
</script>

<style scoped>
.col-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.count-pill {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.count-pill.accent {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: transparent;
}

.col-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.col-header-tips {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.shortcut-tip {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}
.shortcut-tip code {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.add-staging-btn {
  width: 100%;
}

/* 空状态 */
.empty-column-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
  gap: var(--space-sm);
  background: var(--color-bg-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-xl);
  margin-top: var(--space-md);
}

.empty-icon-box {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-xs);
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-desc {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
  max-width: 380px;
  line-height: 1.6;
}
.empty-desc strong {
  color: var(--color-accent);
}

/* 确认撤销拆分弹窗 */
.split-confirm-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
}

.confirm-icon-box {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-warning-muted);
  color: var(--color-warning);
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.confirm-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-sm);
}
</style>
