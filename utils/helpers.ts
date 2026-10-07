// ============================================================
// NoteBookProject — UUID 工具与通用辅助函数
// ============================================================

/**
 * 生成一个 v4 UUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * 生成下一个 Case 名称（Case A, Case B, ..., Case Z, Case AA, ...）
 */
export function generateCaseName(existingNames: string[]): string {
  const prefix = 'Case '
  let index = 0

  // 找到不冲突的下一个名称
  while (true) {
    const name = prefix + indexToLetter(index)
    if (!existingNames.includes(name)) {
      return name
    }
    index++
  }
}

/**
 * 将数字索引转换为字母标识（0=A, 1=B, ..., 25=Z, 26=AA, ...）
 */
function indexToLetter(index: number): string {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * 格式化时间戳为可读日期
 */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 截断文本，超出部分显示省略号
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}
