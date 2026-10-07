<!-- ============================================================
  VersionTree.vue — 横向 Git-like 版本控制树 (SVG DAG)
  支持：实节点/虚节点绘制、多分支平行轨道与多合一 Merge 汇聚、
       点击热区扩大、工作区草稿呼吸指示灯、节点 Tooltip
============================================================ -->
<template>
  <div class="version-tree-wrapper">
    <div class="tree-header-bar">
      <div class="tree-meta-info">
        <span class="tree-title">版本演进树</span>
        <span class="tree-count">{{ commits.length }} 个提交</span>
        <span v-if="branchNames.length > 1" class="branch-badge">
          {{ branchNames.length }} 个活跃分支
        </span>
      </div>

      <!-- 状态指示灯与图例 -->
      <div class="tree-legend">
        <span
          class="legend-item"
          :class="{ 'legend-dimmed': isDraftMode }"
          title="点击查看历史提交快照"
        >
          <span class="dot solid"></span> 历史提交
        </span>
        <span
          class="legend-item legend-draft"
          :class="{ 'legend-active': isDraftMode }"
          title="当前处于未提交的工作区草稿阶段"
          @click="$emit('selectGhost')"
        >
          <span class="dot ghost" :class="{ pulse: isDraftMode }"></span>
          <span class="legend-text">工作区草稿</span>
          <span v-if="isDraftMode" class="badge-draft-glow">编辑中</span>
        </span>
      </div>
    </div>

    <div
      ref="containerRef"
      class="version-tree-container"
      @wheel="onWheel"
    >
      <svg
        :width="svgWidth"
        :height="svgHeight"
        class="version-tree-svg"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- 分支背景指示轨道 -->
        <g class="lanes-guide">
          <line
            v-for="(lane, idx) in laneGuides"
            :key="idx"
            :x1="10"
            :y1="lane.y"
            :x2="svgWidth - 10"
            :y2="lane.y"
            class="lane-guide-line"
          />
        </g>

        <!-- 贝塞尔连线 (Edges) -->
        <path
          v-for="edge in allEdges"
          :key="edge.id"
          :d="edge.d"
          class="edge-line"
          :class="{ 'edge-ghost': edge.isGhost }"
          :stroke="edge.color"
        />

        <!-- 实节点 (Solid Commits) -->
        <g
          v-for="node in solidNodes"
          :key="node.commitId"
          class="node-group"
          :class="{ 'node-active': !isDraftMode && node.commitId === activeCommitId }"
          @click.stop="$emit('selectCommit', node.commitId)"
        >
          <title>{{ getNodeTooltip(node.commitId) }}</title>

          <!-- 扩大点击热区 (半径 18px，保证鼠标精确选取) -->
          <circle
            :cx="node.x"
            :cy="node.y"
            r="18"
            fill="transparent"
            style="cursor: pointer"
          />

          <!-- 选中光晕 -->
          <circle
            v-if="!isDraftMode && node.commitId === activeCommitId"
            :cx="node.x"
            :cy="node.y"
            r="14"
            class="active-halo"
            :style="{ stroke: getBranchColor(node.branchName) }"
          />

          <!-- 外圈 -->
          <circle
            :cx="node.x"
            :cy="node.y"
            r="8"
            class="node-circle"
            :style="{
              stroke: getBranchColor(node.branchName),
              fill: (!isDraftMode && node.commitId === activeCommitId) ? getBranchColor(node.branchName) : 'var(--color-bg-secondary)'
            }"
          />

          <!-- 内芯 -->
          <circle
            :cx="node.x"
            :cy="node.y"
            r="3.5"
            class="node-inner"
            :style="{
              fill: (!isDraftMode && node.commitId === activeCommitId) ? '#ffffff' : getBranchColor(node.branchName)
            }"
          />

          <!-- Commit ID 标签 -->
          <text
            :x="node.x"
            :y="node.y + 20"
            class="node-label"
            text-anchor="middle"
          >
            {{ node.commitId.slice(0, 6) }}
          </text>

          <!-- 分支名轻量标注 -->
          <text
            v-if="isBranchTip(node)"
            :x="node.x"
            :y="node.y - 12"
            class="branch-tag-text"
            text-anchor="middle"
            :style="{ fill: getBranchColor(node.branchName) }"
          >
            {{ node.branchName }}
          </text>
        </g>

        <!-- 虚节点 (Draft Ghost Node) -->
        <g
          v-if="ghostNode"
          class="node-group node-ghost"
          :class="{ 'node-active': isDraftMode }"
          @click.stop="$emit('selectGhost')"
        >
          <title>未提交的工作区草稿 (点击切换回此节点)</title>

          <!-- 扩大点击热区 -->
          <circle
            :cx="ghostNode.x"
            :cy="ghostNode.y"
            r="18"
            fill="transparent"
            style="cursor: pointer"
          />

          <!-- 草稿激活光晕 -->
          <circle
            v-if="isDraftMode"
            :cx="ghostNode.x"
            :cy="ghostNode.y"
            r="14"
            class="active-halo draft-active-halo"
            :style="{ stroke: ghostNodeColor }"
          />

          <!-- 虚线外圆 -->
          <circle
            :cx="ghostNode.x"
            :cy="ghostNode.y"
            r="8"
            class="ghost-circle"
            :style="{ stroke: ghostNodeColor }"
          />

          <!-- 虚节点中心脉冲小点 -->
          <circle
            :cx="ghostNode.x"
            :cy="ghostNode.y"
            r="3.5"
            class="ghost-inner"
            :style="{ fill: ghostNodeColor }"
          />

          <text
            :x="ghostNode.x"
            :y="ghostNode.y + 20"
            class="node-label ghost-label"
            text-anchor="middle"
          >
            draft
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CommitNode, GraphNodePosition } from '~/types/notebook'

interface ExtendedNodePosition extends GraphNodePosition {
  branchName: string
  parentIds: string[]
}

const props = withDefaults(
  defineProps<{
    commits: CommitNode[]
    activeCommitId: string
    showGhost?: boolean
    mergeParentIds?: string[]
    isDraftActive?: boolean
  }>(),
  {
    showGhost: true,
    mergeParentIds: () => [],
    isDraftActive: false,
  }
)

defineEmits<{
  selectCommit: [commitId: string]
  selectGhost: []
}>()

const containerRef = ref<HTMLElement | null>(null)

// --- 常量与间距 ---
const NODE_GAP_X = 72
const NODE_GAP_Y = 46
const PADDING_X = 40
const PADDING_Y = 32

// 分支颜色调色板
const BRANCH_PALETTE = [
  '#7882ff', // 主分支 (indigo)
  '#38bdf8', // 分支 1 (sky blue)
  '#c084fc', // 分支 2 (purple)
  '#3ecf8e', // 分支 3 (emerald green)
  '#f5a623', // 分支 4 (amber)
  '#ec4899', // 分支 5 (pink)
]

function getBranchColor(branchName: string): string {
  if (branchName === 'main') return BRANCH_PALETTE[0]
  let hash = 0
  for (let i = 0; i < branchName.length; i++) {
    hash = (hash << 5) - hash + branchName.charCodeAt(i)
  }
  const idx = Math.abs(hash) % (BRANCH_PALETTE.length - 1) + 1
  return BRANCH_PALETTE[idx]
}

// 所有不重复的分支名
const branchNames = computed(() => {
  return Array.from(new Set(props.commits.map((c) => c.branchName || 'main')))
})

// 分支轨道映射
const branchLaneMap = computed(() => {
  const map: Record<string, number> = {}
  let lane = 0
  for (const b of branchNames.value) {
    map[b] = lane++
  }
  return map
})

// 拓扑节点与位置计算
const solidNodes = computed<ExtendedNodePosition[]>(() => {
  if (props.commits.length === 0) return []

  const sorted = [...props.commits].sort((a, b) => a.timestamp - b.timestamp)

  return sorted.map((c, idx) => {
    const lane = branchLaneMap.value[c.branchName || 'main'] ?? 0
    return {
      commitId: c.id,
      isGhost: false,
      col: idx,
      lane,
      x: PADDING_X + idx * NODE_GAP_X,
      y: PADDING_Y + lane * NODE_GAP_Y,
      branchName: c.branchName || 'main',
      parentIds: c.parentIds || [],
    }
  })
})

const nodeMap = computed(() => {
  return new Map(solidNodes.value.map((n) => [n.commitId, n]))
})

function isBranchTip(node: ExtendedNodePosition): boolean {
  const commitsInBranch = props.commits.filter((c) => (c.branchName || 'main') === node.branchName)
  if (commitsInBranch.length === 0) return false
  const latestInBranch = [...commitsInBranch].sort((a, b) => b.timestamp - a.timestamp)[0]
  return latestInBranch?.id === node.commitId
}

// 是否处于草稿模式
const isDraftMode = computed(() => {
  return (
    props.isDraftActive ||
    !props.activeCommitId ||
    props.activeCommitId === 'draft' ||
    props.activeCommitId === ''
  )
})

// 虚节点（草稿）计算：支持多合一 Merge 汇聚
const ghostNode = computed<ExtendedNodePosition | null>(() => {
  if (!props.showGhost) return null

  if (solidNodes.value.length === 0) {
    return {
      commitId: 'draft',
      isGhost: true,
      col: 0,
      lane: 0,
      x: PADDING_X,
      y: PADDING_Y,
      branchName: 'main',
      parentIds: [],
    }
  }

  const maxCol = Math.max(...solidNodes.value.map((n) => n.col))

  // 如果是 Merge 模式（多个源父节点汇聚）
  if (props.mergeParentIds && props.mergeParentIds.length > 1) {
    return {
      commitId: 'draft',
      isGhost: true,
      col: maxCol + 1,
      lane: 0, // 合并至主轨道
      x: PADDING_X + (maxCol + 1) * NODE_GAP_X,
      y: PADDING_Y + 0 * NODE_GAP_Y,
      branchName: 'main',
      parentIds: props.mergeParentIds,
    }
  }

  // 常规情况：查看当前选中的节点
  const activeNode = solidNodes.value.find((n) => n.commitId === props.activeCommitId)
  const baseNode = activeNode || solidNodes.value[solidNodes.value.length - 1]

  const hasChildren = solidNodes.value.some((n) => n.parentIds.includes(baseNode.commitId))

  if (hasChildren) {
    // 基于历史节点修改 -> 分叉新轨道
    const maxLane = Math.max(...solidNodes.value.map((n) => n.lane))
    const ghostLane = maxLane + 1
    return {
      commitId: 'draft',
      isGhost: true,
      col: maxCol + 1,
      lane: ghostLane,
      x: PADDING_X + (maxCol + 1) * NODE_GAP_X,
      y: PADDING_Y + ghostLane * NODE_GAP_Y,
      branchName: 'new-branch',
      parentIds: [baseNode.commitId],
    }
  } else {
    // 顺延当前分支
    return {
      commitId: 'draft',
      isGhost: true,
      col: maxCol + 1,
      lane: baseNode.lane,
      x: PADDING_X + (maxCol + 1) * NODE_GAP_X,
      y: PADDING_Y + baseNode.lane * NODE_GAP_Y,
      branchName: baseNode.branchName,
      parentIds: [baseNode.commitId],
    }
  }
})

const ghostNodeColor = computed(() => {
  if (!ghostNode.value) return 'var(--color-node-ghost)'
  return getBranchColor(ghostNode.value.branchName)
})

// 连线计算：支持常规线性连线与多父节点汇聚连线
const allEdges = computed(() => {
  const edges: { id: string; d: string; isGhost: boolean; color: string }[] = []

  // 实节点之间的连线（含多父节点 Merge 提交）
  for (const node of solidNodes.value) {
    for (const parentId of node.parentIds) {
      const fromNode = nodeMap.value.get(parentId)
      if (!fromNode) continue

      const dx = Math.max((node.x - fromNode.x) / 2, 20)
      const d = `M${fromNode.x},${fromNode.y} C${fromNode.x + dx},${fromNode.y} ${node.x - dx},${node.y} ${node.x},${node.y}`

      edges.push({
        id: `${parentId}-${node.commitId}`,
        d,
        isGhost: false,
        color: getBranchColor(node.branchName),
      })
    }
  }

  // 虚节点（草稿）连线：若是多父节点合并，同时绘制多条汇聚虚线
  if (ghostNode.value && ghostNode.value.parentIds.length > 0) {
    const gn = ghostNode.value
    for (const parentId of gn.parentIds) {
      const fromNode = nodeMap.value.get(parentId)
      if (!fromNode) continue

      const dx = Math.max((gn.x - fromNode.x) / 2, 20)
      const d = `M${fromNode.x},${fromNode.y} C${fromNode.x + dx},${fromNode.y} ${gn.x - dx},${gn.y} ${gn.x},${gn.y}`

      edges.push({
        id: `ghost-${parentId}`,
        d,
        isGhost: true,
        color: ghostNodeColor.value,
      })
    }
  }

  return edges
})

const laneGuides = computed(() => {
  const maxLane = Math.max(
    ...solidNodes.value.map((n) => n.lane),
    ghostNode.value?.lane ?? 0,
    0
  )
  const result: { y: number }[] = []
  for (let l = 0; l <= maxLane; l++) {
    result.push({ y: PADDING_Y + l * NODE_GAP_Y })
  }
  return result
})

const svgWidth = computed(() => {
  const totalCols = ghostNode.value
    ? ghostNode.value.col + 1
    : solidNodes.value.length
  return Math.max(PADDING_X * 2 + totalCols * NODE_GAP_X, 360)
})

const svgHeight = computed(() => {
  const maxLane = Math.max(
    ...solidNodes.value.map((n) => n.lane),
    ghostNode.value?.lane ?? 0,
    0
  )
  return PADDING_Y * 2 + maxLane * NODE_GAP_Y + 28
})

function onWheel(e: WheelEvent) {
  if (containerRef.value) {
    containerRef.value.scrollLeft += (e.deltaX || e.deltaY)
  }
}

function getNodeTooltip(commitId: string): string {
  const commit = props.commits.find((c) => c.id === commitId)
  if (!commit) return commitId
  const d = new Date(commit.timestamp)
  return `Commit: ${commit.id.slice(0, 8)}\nBranch: ${commit.branchName}\nLog: ${commit.changeLog}\nTime: ${d.toLocaleString()}`
}
</script>

<style scoped>
.version-tree-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}

.tree-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-xs);
  font-size: 0.75rem;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.tree-meta-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.tree-title {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.tree-count {
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.branch-badge {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 500;
}

.tree-legend {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--color-text-tertiary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}
.legend-dimmed {
  opacity: 0.5;
}

.legend-draft.legend-active {
  color: var(--color-accent);
  font-weight: 600;
}

.badge-draft-glow {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 0.625rem;
  font-weight: 700;
  box-shadow: 0 0 8px var(--color-accent-glow);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  transition: all var(--duration-fast) var(--ease-out);
}
.dot.solid {
  background: var(--color-accent);
}
.dot.ghost {
  border: 1.5px dashed var(--color-node-ghost);
}
.dot.ghost.pulse {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: 0 0 10px 2px var(--color-accent-glow);
  animation: dot-pulse 1.8s infinite;
}

.version-tree-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  position: relative;
  scrollbar-width: thin;
}

.version-tree-svg {
  display: block;
}

.lane-guide-line {
  stroke: rgba(255, 255, 255, 0.03);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.edge-line {
  fill: none;
  stroke-width: 2.2;
  transition: all var(--duration-fast) var(--ease-out);
}
.edge-ghost {
  stroke-dasharray: 5 4;
  opacity: 0.75;
}

.node-group {
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring);
}
.node-group:hover {
  transform: scale(1.15);
}

.active-halo {
  fill: none;
  stroke-width: 2.5;
  stroke-dasharray: 3 3;
  animation: rotateHalo 8s linear infinite;
  opacity: 0.9;
}

.draft-active-halo {
  filter: drop-shadow(0 0 6px var(--color-accent-glow));
}

@keyframes rotateHalo {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: 40;
  }
}

.node-circle {
  stroke-width: 2.5;
  transition: all var(--duration-fast) var(--ease-out);
}
.node-inner {
  transition: fill var(--duration-fast) var(--ease-out);
}

.ghost-circle {
  fill: transparent;
  stroke-width: 2;
  stroke-dasharray: 4 3;
  animation: breathe 2.5s ease-in-out infinite;
}
.ghost-inner {
  animation: breathe 2.5s ease-in-out infinite;
}

.node-label {
  fill: var(--color-text-tertiary);
  font-size: 9px;
  font-family: var(--font-mono);
  font-weight: 500;
  pointer-events: none;
}
.ghost-label {
  font-style: italic;
  opacity: 0.8;
}

.branch-tag-text {
  font-size: 8px;
  font-family: var(--font-mono);
  font-weight: 600;
  letter-spacing: -0.02em;
  pointer-events: none;
}
</style>
