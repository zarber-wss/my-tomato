import type { Task } from "@/components/task-list"
import { supabase } from "@/lib/supabaseClient"

export const STATIC_USER_ID = "00000000-0000-0000-0000-000000000001"

type TodoRow = {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  estimated_pomodoros: number | null
  completed_pomodoros: number | null
  created_at: string | null
  updated_at: string
  completed_at: string | null
  sort_order: number | null
}

export function mapRowToTask(row: TodoRow): Task {
  const completed = !!row.is_completed
  const completedAtRaw = row.completed_at ?? (completed ? row.updated_at : null)
  return {
    id: row.id,
    name: row.title,
    notes: row.description ?? undefined,
    pomodoroCount: row.estimated_pomodoros ?? 1,
    completedPomodoros: row.completed_pomodoros ?? 0,
    completed,
    completedAt: completedAtRaw ? new Date(completedAtRaw) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: new Date(row.updated_at),
    sortOrder: row.sort_order ?? undefined,
    is_synced: true,
  }
}

function taskToUpsertRow(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    user_id: STATIC_USER_ID,
    title: task.name,
    description: task.notes ?? null,
    is_completed: task.completed,
    estimated_pomodoros: task.pomodoroCount,
    completed_pomodoros: task.completedPomodoros ?? 0,
    completed_at: task.completed && task.completedAt ? task.completedAt.toISOString() : null,
    created_at: task.createdAt ? task.createdAt.toISOString() : null,
    sort_order: task.sortOrder ?? 999999,
    updated_at: (task.updatedAt ?? new Date()).toISOString(),
  }
}

/** 整行 upsert：新增或覆盖，成功表示云端已接受当前快照 */
export async function upsertTaskToRemote(task: Task): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("todos")
      .upsert(taskToUpsertRow(task), { onConflict: "id" })
    if (error) {
      console.error("[task-remote] upsert failed:", error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[task-remote] upsert error:", e)
    return false
  }
}

export async function loadTasksFromRemote(): Promise<Task[] | null> {
  try {
    const { data, error } = await supabase
      .from("todos")
      .select(
        "id,title,description,is_completed,estimated_pomodoros,completed_pomodoros,created_at,updated_at,completed_at,sort_order"
      )
      .eq("user_id", STATIC_USER_ID)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[task-remote] load failed:", error.message)
      return null
    }
    return (data as TodoRow[] | null)?.map(mapRowToTask) ?? []
  } catch (e) {
    console.error("[task-remote] load error:", e)
    return null
  }
}

export async function deleteTaskFromRemote(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("todos").delete().eq("id", id).eq("user_id", STATIC_USER_ID)
    if (error) {
      console.error("[task-remote] delete failed:", error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[task-remote] delete error:", e)
    return false
  }
}

export async function updateTodoCompleteOnRemote(
  id: string,
  completed: boolean,
  /** 勾选完成时一并写入的已完成番茄数（与本地补 0 逻辑一致） */
  completedPomodoros?: number
): Promise<boolean> {
  try {
    const now = new Date().toISOString()
    const payload: Record<string, unknown> = {
      is_completed: completed,
      updated_at: now,
      completed_at: completed ? now : null,
    }
    if (completed && completedPomodoros !== undefined) {
      payload.completed_pomodoros = completedPomodoros
    }
    const { error } = await supabase.from("todos").update(payload).eq("id", id).eq("user_id", STATIC_USER_ID)
    if (error) {
      console.error("[task-remote] complete update failed:", error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[task-remote] complete update error:", e)
    return false
  }
}

export async function updateTodoPomodorosOnRemote(id: string, completedPomodoros: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("todos")
      .update({ completed_pomodoros: completedPomodoros, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", STATIC_USER_ID)
    if (error) {
      console.error("[task-remote] pomodoros update failed:", error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[task-remote] pomodoros update error:", e)
    return false
  }
}

export async function updateTodoCreatedAtOnRemote(id: string, createdAt: Date | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("todos")
      .update({
        created_at: createdAt ? createdAt.toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", STATIC_USER_ID)
    if (error) {
      console.error("[task-remote] created_at update failed:", error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[task-remote] created_at update error:", e)
    return false
  }
}

export async function updateTaskOrderOnRemote(orderedIds: string[]): Promise<boolean> {
  try {
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("todos")
          .update({ sort_order: index, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", STATIC_USER_ID)
      )
    )
    const failed = results.some((r) => r.error)
    if (failed) {
      console.error("[task-remote] order update: one or more failed")
      return false
    }
    return true
  } catch (e) {
    console.error("[task-remote] order update error:", e)
    return false
  }
}
