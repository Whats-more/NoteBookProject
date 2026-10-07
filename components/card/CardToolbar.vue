<!-- ============================================================
  CardToolbar.vue — 批量多选 Merge 悬浮工具栏
  当用户选中 2 个或以上卡片时自动浮现，提供一键 Merge 与取消选择
============================================================ -->
<template>
  <Transition name="slide-up">
    <div v-if="store.showMergeBar" class="card-toolbar-wrapper">
      <div class="floating-bar glass">
        <div class="toolbar-info">
          <div class="merge-icon-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M6 21V9a9 9 0 0 0 9 9" />
            </svg>
          </div>
          <span class="selected-text">
            已选中 <strong class="count-num">{{ store.selectedCount }}</strong> 张卡片
          </span>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-actions">
          <button
            class="btn btn-ghost btn-sm"
            title="取消所有选中"
            @click="store.clearSelection"
          >
            取消
          </button>

          <button
            id="merge-action-btn"
            class="btn btn-merge"
            @click="handleMerge"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M6 21V9a9 9 0 0 0 9 9" />
            </svg>
            Merge {{ store.selectedCount }} Cards
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useNotebookStore } from '~/stores/notebook'

const store = useNotebookStore()

function handleMerge() {
  store.mergeSelectedCards()
}
</script>

<style scoped>
.card-toolbar-wrapper {
  position: fixed;
  bottom: var(--space-2xl);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: var(--z-floating-bar);
}

.floating-bar {
  pointer-events: auto;
  border: 1px solid rgba(192, 132, 252, 0.4);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 24px var(--color-merge-muted);
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.merge-icon-badge {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-merge-muted);
  color: var(--color-merge);
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
.count-num {
  color: var(--color-text-primary);
  font-weight: 700;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-merge {
  background: linear-gradient(135deg, #c084fc, #9333ea);
  color: #fff;
  border: none;
  font-weight: 600;
  box-shadow: 0 0 16px rgba(192, 132, 252, 0.35);
}
.btn-merge:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 24px rgba(192, 132, 252, 0.5);
}
</style>
