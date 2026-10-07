<!-- ============================================================
  TrashModal.vue — 回收站抽屉/弹窗组件
  包含：已删除卡片列表预览、按条目恢复、彻底删除、一键清空
============================================================ -->
<template>
  <Transition name="fade">
    <div v-if="isOpen" class="overlay" @click.self="$emit('close')">
      <div class="modal trash-modal glass">
        <!-- 弹窗标题 -->
        <div class="modal-header">
          <div class="header-title-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <h3 class="modal-title">回收站</h3>
            <span class="trash-count-badge">{{ store.trash.length }}</span>
          </div>

          <button class="btn-icon" title="关闭" @click="$emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- 列表内容 -->
        <div class="modal-body">
          <div v-if="store.trash.length === 0" class="empty-trash-state">
            <div class="empty-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <p class="empty-text">回收站是空的</p>
            <span class="empty-subtext">右栏已论证讨论删除后将暂存至此，可随时恢复</span>
          </div>

          <div v-else class="trash-items-list">
            <div
              v-for="item in store.trash"
              :key="item.id"
              class="trash-item-card"
            >
              <div class="item-main">
                <div class="item-title-row">
                  <span class="item-title">{{ item.card.currentTitle }}</span>
                  <span class="item-meta-commits">{{ item.card.commits.length }} 个提交</span>
                </div>
                <p class="item-preview">
                  {{ truncate(item.card.currentContent || '无正文描述', 80) }}
                </p>
                <span class="item-date">删除于 {{ formatTimestamp(item.deletedAt) }}</span>
              </div>

              <div class="item-actions">
                <button
                  class="btn btn-secondary btn-sm"
                  title="恢复回右侧讨论区"
                  @click="store.restoreFromTrash(item.id)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  恢复
                </button>
                <button
                  class="btn-icon danger"
                  title="永久物理删除"
                  @click="store.permanentDeleteFromTrash(item.id)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div v-if="store.trash.length > 0" class="modal-footer">
          <button class="btn btn-danger btn-sm" @click="store.clearTrash">
            清空回收站
          </button>
          <button class="btn btn-secondary btn-sm" @click="$emit('close')">
            完成
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useNotebookStore } from '~/stores/notebook'
import { formatTimestamp, truncate } from '~/utils/helpers'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()

const store = useNotebookStore()
</script>

<style scoped>
.trash-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-text-primary);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.trash-count-badge {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  padding: 1px 8px;
  border-radius: var(--radius-full);
}

.modal-body {
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.empty-trash-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
  gap: var(--space-sm);
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-xs);
}

.empty-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.empty-subtext {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
  max-width: 280px;
}

.trash-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.trash-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--duration-fast) var(--ease-out);
}
.trash-item-card:hover {
  border-color: var(--color-border-hover);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.item-title {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta-commits {
  font-size: 0.6875rem;
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.item-preview {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-date {
  font-size: 0.6875rem;
  color: var(--color-text-placeholder);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}
</style>
