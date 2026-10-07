<!-- ============================================================
  AppHeader.vue — 顶部全局状态栏
  包含：项目名称 / 回收站入口
============================================================ -->
<template>
  <header class="app-header glass">
    <div class="header-left">
      <div class="logo-mark"></div>
      <h1 class="app-title">NoteBook<span class="title-accent">Project</span></h1>
    </div>
    <div class="header-right">
      <button
        id="trash-btn"
        class="btn-icon"
        title="回收站"
        @click="$emit('openTrash')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span v-if="trashCount > 0" class="badge">{{ trashCount }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useNotebookStore } from '~/stores/notebook'
import { computed } from 'vue'

defineEmits<{
  openTrash: []
}>()

const store = useNotebookStore()
const trashCount = computed(() => store.trash.length)
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.logo-mark {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--color-accent), var(--color-merge));
  box-shadow: 0 0 16px var(--color-accent-glow);
}

.app-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}
.title-accent {
  color: var(--color-accent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.btn-icon {
  position: relative;
}
.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
</style>
