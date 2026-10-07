<!-- ============================================================
  StagingCard.vue — 左栏待论证卡片
  支持：收起/展开、标题编辑、正文编辑、Change Log、Commit 流转
============================================================ -->
<template>
  <div
    :id="`staging-card-${card.id}`"
    class="card staging-card"
    :class="{ active: isExpanded }"
  >
    <!-- 收起态 -->
    <div class="card-collapsed" @click="toggleExpand">
      <span class="card-title-text">{{ card.draft.title || card.currentTitle }}</span>
      <button
        class="btn-icon danger"
        title="删除"
        @click.stop="handleDelete"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>

    <!-- 展开编辑态 -->
    <Transition name="slide-up">
      <div v-if="isExpanded" class="card-expanded">
        <!-- 标题输入 -->
        <input
          :id="`staging-title-${card.id}`"
          v-model="draftTitle"
          class="input-title"
          placeholder="输入标题..."
          @input="onDraftChange"
        />

        <!-- 论证正文 -->
        <textarea
          :id="`staging-content-${card.id}`"
          v-model="draftContent"
          class="textarea"
          placeholder="输入论证内容..."
          rows="4"
          @input="onDraftChange"
        ></textarea>

        <!-- 分割线 -->
        <hr class="divider" />

        <!-- Change Log (必填) -->
        <div class="changelog-section">
          <label class="changelog-label">
            Change Log <span class="required-star">*</span>
          </label>
          <input
            :id="`staging-changelog-${card.id}`"
            v-model="draftChangeLog"
            class="input"
            placeholder="initial commit (必填)"
            @input="onDraftChange"
          />
        </div>

        <!-- 底部操作栏 -->
        <div class="card-actions">
          <span class="action-hint">标题、正文及 Change Log 均为必填</span>
          <button
            :id="`staging-commit-${card.id}`"
            class="btn btn-primary"
            :disabled="!canCommit"
            @click="handleCommit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <line x1="1.05" y1="12" x2="7" y2="12" />
              <line x1="17.01" y1="12" x2="22.96" y2="12" />
            </svg>
            Commit
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNotebookStore } from '~/stores/notebook'
import type { DiscussionCard } from '~/types/notebook'

const props = defineProps<{
  card: DiscussionCard
}>()

const store = useNotebookStore()
const isExpanded = ref(false)

// 本地草稿响应式
const draftTitle = ref(props.card.draft.title)
const draftContent = ref(props.card.draft.content)
const draftChangeLog = ref(props.card.draft.changeLog || 'initial commit')

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

const canCommit = computed(() => {
  return (
    draftTitle.value.trim().length > 0 &&
    draftContent.value.trim().length > 0 &&
    draftChangeLog.value.trim().length > 0
  )
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function onDraftChange() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.updateDraft(props.card.id, {
      title: draftTitle.value,
      content: draftContent.value,
      changeLog: draftChangeLog.value,
    })
  }, 300)
}

function handleCommit() {
  // 确保最新值同步到 store
  store.updateDraft(props.card.id, {
    title: draftTitle.value,
    content: draftContent.value,
    changeLog: draftChangeLog.value || 'initial commit',
  })
  store.commitCard(props.card.id)
}

function handleDelete() {
  store.deleteStagingCard(props.card.id)
}
</script>

<style scoped>
.staging-card {
  overflow: hidden;
}

.card-collapsed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  cursor: pointer;
  min-height: 48px;
}

.card-title-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-expanded {
  padding: 0 var(--space-lg) var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.changelog-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.changelog-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.required-star {
  color: var(--color-danger);
  margin-left: 2px;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-sm);
}

.action-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
