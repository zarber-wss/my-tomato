import type { Task } from "@/components/task-list"

export const PENDING_DELETES_STORAGE_KEY = "pomodoro-pending-task-deletes"

export function loadPendingDeleteIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(PENDING_DELETES_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === "string"))
  } catch {
    return new Set()
  }
}

export function savePendingDeleteIds(ids: Set<string>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PENDING_DELETES_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function addPendingDeleteId(id: string) {
  const s = loadPendingDeleteIds()
  s.add(id)
  savePendingDeleteIds(s)
}

export function removePendingDeleteId(id: string) {
  const s = loadPendingDeleteIds()
  s.delete(id)
  savePendingDeleteIds(s)
}

/** 用于与云端版本比对的“逻辑时间” */
export function getTaskVersionTime(task: Task): number {
  const u = task.updatedAt ?? task.completedAt ?? task.createdAt
  return u ? new Date(u).getTime() : 0
}

/**
 * 本地优先：同 ID 取 updatedAt 较晚的一方；时间相同取本地。
 * 已在本地删除且待同步删除的任务：不把云端同 ID 记录拉回。
 */
export function mergeTasksWithRemote(
  localTasks: Task[],
  remoteTasks: Task[],
  pendingDeleteIds: Set<string>
): Task[] {
  const localById = new Map(localTasks.map((t) => [t.id, t]))
  const remoteById = new Map<string, Task>()
  for (const t of remoteTasks) {
    if (pendingDeleteIds.has(t.id) && !localById.has(t.id)) continue
    remoteById.set(t.id, t)
  }

  const allIds = new Set<string>([...localById.keys(), ...remoteById.keys()])
  const mergedById = new Map<string, Task>()

  for (const id of allIds) {
    const L = localById.get(id)
    const R = remoteById.get(id)
    if (pendingDeleteIds.has(id) && !L) continue

    if (L && R) {
      const tL = getTaskVersionTime(L)
      const tR = getTaskVersionTime(R)
      if (tL > tR) mergedById.set(id, { ...L })
      else if (tR > tL) mergedById.set(id, { ...R, is_synced: true })
      else mergedById.set(id, { ...L })
      continue
    }
    if (L) mergedById.set(id, { ...L })
    else if (R) mergedById.set(id, { ...R, is_synced: true })
  }

  return orderMergedTasks(localTasks, remoteTasks, mergedById)
}

function orderMergedTasks(
  localOrder: Task[],
  remoteOrder: Task[],
  mergedById: Map<string, Task>
): Task[] {
  const seen = new Set<string>()
  const out: Task[] = []
  for (const t of localOrder) {
    const m = mergedById.get(t.id)
    if (m) {
      out.push(m)
      seen.add(t.id)
    }
  }
  for (const t of remoteOrder) {
    if (seen.has(t.id)) continue
    const m = mergedById.get(t.id)
    if (m) {
      out.push(m)
      seen.add(t.id)
    }
  }
  return out
}

/** 从 localStorage JSON 恢复一条任务（含兼容旧数据） */
export function hydrateStoredTask(raw: Record<string, unknown>): Task {
  const completedAt = raw.completedAt ? new Date(String(raw.completedAt)) : undefined
  const createdAt =
    raw.createdAt === null || raw.createdAt === undefined
      ? undefined
      : raw.createdAt
        ? new Date(String(raw.createdAt))
        : undefined
  const updatedAt = raw.updatedAt ? new Date(String(raw.updatedAt)) : undefined
  const sortOrder =
    typeof raw.sortOrder === "number"
      ? raw.sortOrder
      : typeof raw.sort_order === "number"
        ? (raw.sort_order as number)
        : undefined

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    notes: raw.notes != null ? String(raw.notes) : undefined,
    pomodoroCount: Number(raw.pomodoroCount ?? 1),
    completedPomodoros: Number(raw.completedPomodoros ?? 0),
    completed: Boolean(raw.completed),
    completedAt,
    createdAt,
    is_synced: raw.is_synced === false ? false : true,
    updatedAt,
    sortOrder,
  }
}
