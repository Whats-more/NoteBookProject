// ============================================================
// NoteBookProject — Keyboard & Shortcut Composable
// 支持快捷键监听：Escape 取消选择、检测 Ctrl/Cmd 键按下
// ============================================================

import { ref, onMounted, onUnmounted } from 'vue'

export function useKeyboard() {
  const isModifierPressed = ref(false)

  function handleKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey) {
      isModifierPressed.value = true
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (!e.metaKey && !e.ctrlKey) {
      isModifierPressed.value = false
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return {
    isModifierPressed,
  }
}
