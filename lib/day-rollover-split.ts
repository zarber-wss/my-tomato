import type { Task } from "@/components/task-list"

/** 本地自然日 YYYY-MM-DD */
export function localDayKey(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, "0")
  const day = String(x.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function endOfLocalCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/**
 * 是否应在「当前时刻」做跨日拆分：
 * 今日待办（有 createdAt）、未完成、已有完成番茄但未满，
 * 且任务创建日早于「今天」本地自然日（含刚过 0 点、或补跑前一日未处理的情况）。
 */
export function shouldSplitPartialCarryTask(task: Task, now: Date): boolean {
  if (task.completed) return false
  if (task.createdAt == null || task.createdAt === undefined) return false
  if (task.completedPomodoros <= 0) return false
  if (task.completedPomodoros >= task.pomodoroCount) return false
  const createdKey = localDayKey(new Date(task.createdAt))
  const todayKey = localDayKey(now)
  return createdKey < todayKey
}

export function buildPartialDaySplit(
  task: Task,
  now: Date,
  carryTaskId: string
): { closed: Task; carry: Task } {
  const done = task.completedPomodoros
  const createdDay = new Date(task.createdAt!)
  const completedAt = endOfLocalCalendarDay(createdDay)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  const closed: Task = {
    ...task,
    pomodoroCount: done,
    completedPomodoros: done,
    completed: true,
    completedAt,
    is_synced: false,
    updatedAt: new Date(),
  }

  const carry: Task = {
    id: carryTaskId,
    name: task.name,
    notes: task.notes,
    pomodoroCount: task.pomodoroCount - done,
    completedPomodoros: 0,
    completed: false,
    completedAt: undefined,
    createdAt: todayStart,
    is_synced: false,
    updatedAt: new Date(),
    sortOrder: task.sortOrder,
  }

  return { closed, carry }
}

export type RolloverSplitResult = {
  next: Task[]
  changed: boolean
  /** 被拆分的原任务 id → 新「剩余」任务 id（用于切换当前任务） */
  carryTaskIdByOriginalId: Map<string, string>
}

/**
 * 对列表中所有符合条件的任务执行「改原任务为已收口 + 新建剩余」。
 */
export function applyPartialDayRolloverToTaskList(
  tasks: Task[],
  now: Date,
  newId: () => string
): RolloverSplitResult {
  const carryTaskIdByOriginalId = new Map<string, string>()
  let changed = false
  const out: Task[] = []

  for (const task of tasks) {
    if (!shouldSplitPartialCarryTask(task, now)) {
      out.push(task)
      continue
    }
    changed = true
    const carryId = newId()
    carryTaskIdByOriginalId.set(task.id, carryId)
    const { closed, carry } = buildPartialDaySplit(task, now, carryId)
    out.push(closed, carry)
  }

  return {
    next: changed ? out : tasks,
    changed,
    carryTaskIdByOriginalId,
  }
}

/** 距离下一次本地 0 点的毫秒数（至少 1ms，避免 setTimeout(0)） */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 0, 0)
  return Math.max(1, next.getTime() - from.getTime())
}
