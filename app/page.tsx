"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PomodoroTimer, type PomodoroTimerRef } from "@/components/pomodoro-timer"
import { TaskList, type Task } from "@/components/task-list"
import { HistorySection } from "@/components/history-section"
import { AddTaskModal } from "@/components/add-task-modal"
import { Celebration } from "@/components/celebration"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabaseClient"

type TabType = "timer" | "history"

const STORAGE_KEY = "pomodoro-tasks"
const STATIC_USER_ID = "00000000-0000-0000-0000-000000000001"

// Demo data with some history
const defaultTasks: Task[] = [
  {
    id: "1",
    name: "完成产品设计文档",
    notes: "包括用户流程图和交互说明\n需要和产品经理确认细节",
    pomodoroCount: 4,
    completedPomodoros: 1,
    completed: false,
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "代码评审 - 用户模块",
    pomodoroCount: 2,
    completedPomodoros: 0,
    completed: false,
    createdAt: new Date(),
  },
  {
    id: "3",
    name: "团队周会准备",
    notes: "准备本周工作汇报PPT",
    pomodoroCount: 1,
    completedPomodoros: 0,
    completed: false,
    createdAt: new Date(),
  },
  {
    id: "future-1",
    name: "下周要做的某事",
    pomodoroCount: 2,
    completedPomodoros: 0,
    completed: false,
  },
  {
    id: "10",
    name: "上午站会",
    pomodoroCount: 1,
    completedPomodoros: 1,
    completed: true,
    completedAt: new Date(),
    createdAt: new Date(),
  },
  {
    id: "4",
    name: "学习 React 新特性",
    notes: "重点学习 Server Components 和 Suspense",
    pomodoroCount: 3,
    completedPomodoros: 3,
    completed: true,
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    name: "修复登录页面 Bug",
    pomodoroCount: 2,
    completedPomodoros: 2,
    completed: true,
    completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "6",
    name: "撰写技术博客",
    pomodoroCount: 2,
    completedPomodoros: 2,
    completed: true,
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "7",
    name: "项目部署优化",
    notes: "优化 CI/CD 流程，减少部署时间",
    pomodoroCount: 3,
    completedPomodoros: 3,
    completed: true,
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "8",
    name: "产品调研",
    pomodoroCount: 4,
    completedPomodoros: 4,
    completed: true,
    completedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
  },
  {
    id: "9",
    name: "用户访谈",
    pomodoroCount: 3,
    completedPomodoros: 3,
    completed: true,
    completedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
  },
]

function generateUuid() {
  // 优先用浏览器自带的 randomUUID
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  // 兼容不支持 randomUUID 的环境（比如部分手机端浏览器）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function saveTaskToSupabase(
  task: Task,
  onError?: (message: string) => void
): Promise<boolean> {
  try {
    const { error } = await supabase.from("todos").insert({
      id: task.id,
      user_id: STATIC_USER_ID,
      title: task.name,
      description: task.notes ?? null,
      is_completed: task.completed,
      estimated_pomodoros: task.pomodoroCount,
      completed_pomodoros: task.completedPomodoros ?? 0,
      completed_at: task.completed && task.completedAt ? task.completedAt.toISOString() : null,
      created_at: task.createdAt ? task.createdAt.toISOString() : null,
      sort_order: 999999,
    })

    if (error) {
      console.error("Failed to save task to Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      onError?.(error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("Failed to save task to Supabase:", e)
    onError?.(e instanceof Error ? e.message : "保存失败")
    return false
  }
}

async function updateTaskInSupabase(
  task: Task,
  onError?: (message: string) => void
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("todos")
      .update({
        title: task.name,
        description: task.notes ?? null,
        is_completed: task.completed,
        estimated_pomodoros: task.pomodoroCount,
        completed_pomodoros: task.completedPomodoros ?? 0,
        completed_at: task.completed && task.completedAt ? task.completedAt.toISOString() : null,
        created_at: task.createdAt ? task.createdAt.toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", STATIC_USER_ID)

    if (error) {
      console.error("Failed to update task in Supabase:", error.message)
      onError?.(error.message)
      return false
    }
    return true
  } catch (e) {
    console.error("Failed to update task in Supabase:", e)
    onError?.(e instanceof Error ? e.message : "保存失败")
    return false
  }
}

async function updateTodoCompleteInSupabase(id: string, completed: boolean) {
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("todos")
      .update({
        is_completed: completed,
        updated_at: now,
        completed_at: completed ? now : null,
      })
      .eq("id", id)
      .eq("user_id", STATIC_USER_ID)

    if (error) {
      console.error("Failed to update task in Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    }
  } catch (e) {
    console.error("Failed to update task in Supabase:", e)
  }
}

async function updateTodoPomodorosInSupabase(id: string, completedPomodoros: number) {
  try {
    const { error } = await supabase
      .from("todos")
      .update({ completed_pomodoros: completedPomodoros })
      .eq("id", id)
      .eq("user_id", STATIC_USER_ID)
    if (error) {
      console.error("Failed to update task pomodoros in Supabase:", error.message)
    }
  } catch (e) {
    console.error("Failed to update task pomodoros in Supabase:", e)
  }
}

async function updateTaskCreatedAtInSupabase(id: string, createdAt: Date | null) {
  try {
    const { error } = await supabase
      .from("todos")
      .update({ created_at: createdAt ? createdAt.toISOString() : null })
      .eq("id", id)
      .eq("user_id", STATIC_USER_ID)
    if (error) {
      console.error("Failed to update task created_at in Supabase:", error.message)
    }
  } catch (e) {
    console.error("Failed to update task created_at in Supabase:", e)
  }
}

async function deleteTaskFromSupabase(id: string) {
  try {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", STATIC_USER_ID)

    if (error) {
      console.error("Failed to delete task in Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    }
  } catch (e) {
    console.error("Failed to delete task in Supabase:", e)
  }
}

async function savePomodoroSessionToSupabase(todoId?: string) {
  try {
    const { error } = await supabase.from("pomodoro_sessions").insert({
      user_id: STATIC_USER_ID,
      todo_id: todoId ?? null,
      duration_minutes: 25,
      is_completed: true,
      ended_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Failed to save pomodoro session to Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
    }
  } catch (e) {
    console.error("Failed to save pomodoro session to Supabase:", e)
  }
}

async function updateTaskOrderInSupabase(orderedIds: string[]) {
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("todos")
          .update({ sort_order: index })
          .eq("id", id)
          .eq("user_id", STATIC_USER_ID)
      )
    )
  } catch (e) {
    console.error("Failed to update task order in Supabase:", e)
  }
}

async function saveTimerStateToSupabase(taskId: string | null, endAt: number, mode: string) {
  try {
    await supabase.from("timer_state").upsert(
      {
        user_id: STATIC_USER_ID,
        task_id: taskId,
        end_at: new Date(endAt).toISOString(),
        mode,
      },
      { onConflict: "user_id" }
    )
  } catch (e) {
    console.error("Failed to save timer state to Supabase:", e)
  }
}

async function clearTimerStateInSupabase() {
  try {
    await supabase.from("timer_state").delete().eq("user_id", STATIC_USER_ID)
  } catch (e) {
    console.error("Failed to clear timer state in Supabase:", e)
  }
}

async function loadTimerStateFromSupabase(): Promise<{
  endAt: number
  mode: "pomodoro" | "shortBreak" | "longBreak"
  taskId: string | null
} | null> {
  try {
    const { data, error } = await supabase
      .from("timer_state")
      .select("end_at, mode, task_id")
      .eq("user_id", STATIC_USER_ID)
      .maybeSingle()
    if (error || !data?.end_at) return null
    const endAt = new Date(data.end_at).getTime()
    if (endAt <= Date.now()) return null
    return {
      endAt,
      mode: (data.mode as "pomodoro" | "shortBreak" | "longBreak") || "pomodoro",
      taskId: data.task_id ?? null,
    }
  } catch (e) {
    console.error("Failed to load timer state from Supabase:", e)
    return null
  }
}

async function loadTasksFromSupabase(): Promise<Task[] | null> {
  try {
    const { data, error } = await supabase
      .from("todos")
      .select("id,title,description,is_completed,estimated_pomodoros,completed_pomodoros,created_at,updated_at,completed_at,sort_order")
      .eq("user_id", STATIC_USER_ID)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Failed to load tasks from Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return null
    }

    return (data ?? []).map((row) => {
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
      }
    })
  } catch (e) {
    console.error("Failed to load tasks from Supabase:", e)
    return null
  }
}

// Helper function to load tasks from localStorage
function loadTasks(): Task[] {
  if (typeof window === "undefined") return defaultTasks
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.map((task: Task) => ({
        ...task,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        createdAt: task.createdAt ? new Date(task.createdAt) : undefined,
      }))
    }
  } catch (e) {
    console.error("Failed to load tasks:", e)
  }
  return defaultTasks
}

export default function PomodoroApp() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks)
  const tasksRef = useRef<Task[]>(tasks)
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("timer")
  const [isHydrated, setIsHydrated] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  })
  const [remoteTimer, setRemoteTimer] = useState<{
    endAt: number
    mode: "pomodoro" | "shortBreak" | "longBreak"
    taskId: string | null
  } | null>(null)
  const timerRef = useRef<PomodoroTimerRef>(null)
  const mainRef = useRef<HTMLElement>(null)

  // Load tasks from localStorage on mount (client-side only)
  useEffect(() => {
    let cancelled = false

    async function init() {
      // 先从 Supabase 拉取（多端同步的来源）
      const remoteTasks = await loadTasksFromSupabase()
      const loadedTasks = remoteTasks ?? loadTasks()

      if (cancelled) return
      setTasks(loadedTasks)
      const firstActiveTask = loadedTasks.find((t) => !t.completed && t.createdAt != null)
      if (firstActiveTask) {
        setSelectedTask(firstActiveTask)
      }
      const timerState = await loadTimerStateFromSupabase()
      if (!cancelled && timerState) setRemoteTimer(timerState)
      setIsHydrated(true)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  // Save tasks to localStorage whenever they change (only after hydration)
  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    } catch (e) {
      console.error("Failed to save tasks:", e)
    }
  }, [tasks, isHydrated])

  // 切回本页面时从云端拉取最新任务与计时状态，多端同步（无需刷新）
  useEffect(() => {
    if (!isHydrated) return
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      loadTasksFromSupabase().then((remote) => {
        if (remote && remote.length >= 0) {
          setTasks(remote)
          setSelectedTask((prev) => {
            const stillExists = prev && remote.some((t) => t.id === prev.id)
            if (stillExists) return remote.find((t) => t.id === prev!.id) ?? prev
            return remote.find((t) => !t.completed && t.createdAt != null)
          })
        }
      })
      loadTimerStateFromSupabase().then((state) => setRemoteTimer(state))
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [isHydrated])

  // Supabase Realtime：监听 todos 表变更，多端实时同步（电脑端添加/修改/删除后移动端自动更新）
  useEffect(() => {
    if (!isHydrated) return
    const channel = supabase
      .channel("todos-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${STATIC_USER_ID}`,
        },
        () => {
          loadTasksFromSupabase().then((remote) => {
            if (remote) {
              setTasks(remote)
              setSelectedTask((prev) => {
                const stillExists = prev && remote.some((t) => t.id === prev.id)
                if (stillExists) return remote.find((t) => t.id === prev!.id) ?? prev
                return remote.find((t) => !t.completed && t.createdAt != null)
              })
            }
          })
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isHydrated])

  // Supabase Realtime：监听 timer_state，多端同步番茄计时
  useEffect(() => {
    if (!isHydrated) return
    const channel = supabase
      .channel("timer-state-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "timer_state",
          filter: `user_id=eq.${STATIC_USER_ID}`,
        },
        () => {
          loadTimerStateFromSupabase().then((state) => setRemoteTimer(state))
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isHydrated])

  // Handle tab change with scroll to top
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
    setTimeout(() => {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
      }
    }, 0)
  }, [])

  const handleToggleComplete = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id)
    const willComplete = task && !task.completed
    const newCompleted = task ? !task.completed : false

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: newCompleted,
              completedAt: newCompleted ? new Date() : undefined,
            }
          : task
      )
    )

    // 同步到 Supabase，其他端刷新后能看到
    void updateTodoCompleteInSupabase(id, newCompleted)

    // Show celebration when completing a task
    if (willComplete) {
      setShowCelebration(true)
    }
  }, [tasks])

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id })
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm.taskId) {
      const idToDelete = deleteConfirm.taskId
      setTasks((prev) => prev.filter((task) => task.id !== idToDelete))
      setSelectedTask((prev) => (prev?.id === idToDelete ? undefined : prev))
      void deleteTaskFromSupabase(idToDelete)
      toast({
        description: "已删除",
        className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto min-w-0 bg-foreground/80 text-background text-sm font-medium px-6 py-2.5 rounded-full shadow-lg backdrop-blur-sm border-0",
      })
    }
    setDeleteConfirm({ isOpen: false, taskId: null })
  }, [deleteConfirm.taskId])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm({ isOpen: false, taskId: null })
  }, [])

  const handleReorder = useCallback((newTasks: Task[]) => {
    setTasks(newTasks)
    const orderedIds = newTasks.map((t) => t.id)
    void updateTaskOrderInSupabase(orderedIds)
  }, [])

  const handleSelectTask = useCallback((task: Task) => {
    if (!task.completed) {
      setSelectedTask(task)
    }
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }, [])

  const handleAddTask = useCallback((name: string, pomodoroCount: number, notes?: string, isToday = true) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? { ...task, name, pomodoroCount, notes }
            : task
        )
      )
      setEditingTask(null)
      void updateTaskInSupabase(tasks.find((t) => t.id === editingTask.id)!, (msg) =>
        toast({
          description: `同步到云端失败：${msg}`,
          variant: "destructive",
        })
      )
      return
    }
    const newTask: Task = {
      id: generateUuid(),
      name,
      notes,
      pomodoroCount,
      completedPomodoros: 0,
      completed: false,
      createdAt: isToday ? new Date() : undefined,
    }
    setTasks((prev) => {
      const active = prev.filter((t) => !t.completed && t.createdAt != null)
      const completed = prev.filter((t) => t.completed)
      const future = prev.filter((t) => !t.completed && t.createdAt == null)
      if (isToday) return [...active, newTask, ...completed, ...future]
      return [...active, ...completed, newTask, ...future]
    })
    toast({
      description: "已创建",
      className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto min-w-0 bg-foreground/80 text-background text-sm font-medium px-6 py-2.5 rounded-full shadow-lg backdrop-blur-sm border-0",
    })
    void saveTaskToSupabase(newTask, (msg) =>
      toast({
        description: `任务已保存到本地，但同步到云端失败：${msg}`,
        variant: "destructive",
      })
    )
    if (isToday && !selectedTask) {
      setSelectedTask(newTask)
    }
    if (!isToday && mainRef.current) {
      setTimeout(() => {
        mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: "smooth" })
      }, 150)
    }
  }, [selectedTask, editingTask])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingTask(null)
  }, [])

  const handleMoveToFuture = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, createdAt: undefined } : t)))
    void updateTaskCreatedAtInSupabase(id, null)
  }, [])

  const handleAddToToday = useCallback((id: string) => {
    const now = new Date()
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id)
      if (!task) return prev
      const updated = { ...task, createdAt: now }
      const rest = prev.filter((t) => t.id !== id)
      const active = rest.filter((t) => !t.completed && t.createdAt != null)
      const completed = rest.filter((t) => t.completed)
      const future = rest.filter((t) => !t.completed && t.createdAt == null)
      return [...active, updated, ...completed, ...future]
    })
    void updateTaskCreatedAtInSupabase(id, now)
  }, [])

  const handleAdoptToLocal = useCallback(() => {
    if (!remoteTimer) return
    const { endAt, mode, taskId } = remoteTimer
    clearTimerStateInSupabase()
    setRemoteTimer(null)
    timerRef.current?.adoptRemote(endAt, mode)
    saveTimerStateToSupabase(taskId, endAt, mode)
  }, [remoteTimer])

  const handlePomodoroComplete = useCallback(() => {
    const taskId = selectedTask?.id
    if (taskId) {
      const task = tasksRef.current.find((t) => t.id === taskId)
      if (task) {
        const newCount = task.completedPomodoros + 1
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, completedPomodoros: newCount } : t
          )
        )
        void updateTodoPomodorosInSupabase(taskId, newCount)
        void savePomodoroSessionToSupabase(taskId)
      }
      void clearTimerStateInSupabase()
      timerRef.current?.switchToShortBreak()
    } else {
      void savePomodoroSessionToSupabase(undefined)
      void clearTimerStateInSupabase()
      timerRef.current?.switchToShortBreak()
    }
  }, [selectedTask?.id])

  // Get today's date at midnight for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeTasks = tasks.filter((t) => !t.completed && t.createdAt != null)
  const todayCompletedTasks = tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false
    const completedDate = new Date(t.completedAt)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() === today.getTime()
  })

  const totalPomodoros =
    activeTasks.reduce((sum, t) => sum + t.pomodoroCount, 0) +
    todayCompletedTasks.reduce((sum, t) => sum + t.pomodoroCount, 0)
  const completedPomodoros = activeTasks.reduce((sum, t) => sum + t.completedPomodoros, 0) + 
                            todayCompletedTasks.reduce((sum, t) => sum + t.completedPomodoros, 0)

  return (
    <div className="min-h-[100dvh] relative pt-[env(safe-area-inset-top,0px)]">
      {/* 全屏背景图 - 铺满视口，手机无顶部留白 */}
      <div
        className="fixed left-0 right-0 bottom-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundColor: "#e8eef7",
          backgroundImage: "url(/bg-light.png)",
          top: "calc(-1 * env(safe-area-inset-top, 0px))",
          height: "calc(100dvh + env(safe-area-inset-top, 0px))",
          minHeight: "calc(100dvh + env(safe-area-inset-top, 0px))",
        }}
      />
      {/* Mobile Container - 内容在背景之上 */}
      <div className="relative z-10 max-w-md mx-auto min-h-[100dvh] flex flex-col">
        {/* Main Content */}
        <main ref={mainRef} className="flex-1 px-5 py-4 pb-24 overflow-y-auto">
          {/* Timer Section - Always render but hide when not active to preserve state */}
          <div className={activeTab === "timer" ? "block" : "hidden"}>
            {/* Timer Section */}
            <section className="mb-16">
              <PomodoroTimer
                ref={timerRef}
                currentTask={selectedTask?.name}
                onComplete={handlePomodoroComplete}
                onPomodoroComplete={handlePomodoroComplete}
                remoteEndAt={remoteTimer?.endAt ?? null}
                remoteMode={remoteTimer?.mode ?? null}
                remoteTaskName={
                  remoteTimer?.taskId
                    ? tasks.find((t) => t.id === remoteTimer.taskId)?.name ?? null
                    : null
                }
                onRemoteComplete={() => setRemoteTimer(null)}
                onTimerStart={(endAt, mode) =>
                  saveTimerStateToSupabase(selectedTask?.id ?? null, endAt, mode)
                }
                onTimerStop={() => clearTimerStateInSupabase()}
                onAdoptToLocal={handleAdoptToLocal}
                onRequestSync={async () => {
                  const [timerState, remoteTasks] = await Promise.all([
                    loadTimerStateFromSupabase(),
                    loadTasksFromSupabase(),
                  ])
                  if (remoteTasks) {
                    setTasks(remoteTasks)
                    setSelectedTask((prev) => {
                      const stillExists = prev && remoteTasks.some((t) => t.id === prev.id)
                      if (stillExists) return remoteTasks.find((t) => t.id === prev!.id) ?? prev
                      return remoteTasks.find((t) => !t.completed && t.createdAt != null)
                    })
                  }
                  setRemoteTimer(timerState)
                }}
              />
            </section>

            {/* Tasks Section - 仅在水合后渲染，避免服务端/客户端“今天”不一致导致 Hydration 报错 */}
            <section>
              {isHydrated ? (
                <TaskList
                  tasks={tasks}
                  totalTaskCount={activeTasks.length + todayCompletedTasks.length}
                  completedPomodoros={completedPomodoros}
                  totalPomodoros={totalPomodoros}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteRequest}
                  onReorder={handleReorder}
                  onSelectTask={handleSelectTask}
                  onEditTask={handleEditTask}
                  onMoveToFuture={handleMoveToFuture}
                  onAddToToday={handleAddToToday}
                  selectedTaskId={selectedTask?.id}
                />
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">加载中...</div>
              )}
            </section>
          </div>
          
          {/* History Section - 仅在水合后渲染 */}
          <div className={activeTab === "history" ? "block" : "hidden"}>
            {isHydrated ? (
              <HistorySection tasks={tasks} />
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">加载中...</div>
            )}
          </div>
        </main>

        {/* Floating Bottom Tab Bar - Apple Liquid Glass Style */}
        <div className="fixed bottom-0 left-0 right-0 pb-6 px-4 pointer-events-none z-50">
          <div className="max-w-md mx-auto">
            <div className="pointer-events-auto bg-white/70 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)] p-1.5 grid grid-cols-[2.5fr_1fr_2.5fr] items-center gap-1 h-14">
              {/* Focus Tab */}
              <button
                onClick={() => handleTabChange("timer")}
                className={cn(
                  "h-full flex items-center justify-center rounded-xl transition-all text-sm font-medium",
                  activeTab === "timer"
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                专注
              </button>
              
              {/* Add Task Button - 宽度约 1/6（当前 2/3 的 1/4）、白底阴影拟物风、+ 粉色 */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full h-full min-h-0 bg-white text-emerald-500 rounded-xl font-medium flex items-center justify-center border border-gray-200/90 shadow-[0_4px_0_0_rgba(0,0,0,0.06),0_6px_12px_rgba(0,0,0,0.08)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.06)] active:translate-y-0.5 transition-all"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              
              {/* History Tab */}
              <button
                onClick={() => handleTabChange("history")}
                className={cn(
                  "h-full flex items-center justify-center rounded-xl transition-all text-sm font-medium",
                  activeTab === "history"
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                记录
              </button>
            </div>
          </div>
        </div>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onAdd={handleAddTask}
          editingTask={editingTask}
        />

        {/* Celebration Animation */}
        <Celebration
          isVisible={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="确认删除"
          description="删除后无法恢复，确定要删除这个任务吗？"
        />
      </div>
    </div>
  )
}
