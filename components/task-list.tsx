"use client"

import React, { useState, useEffect } from "react"
import { MoreVertical, ArrowUpDown, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskActionsSheet } from "@/components/task-actions-sheet"
import { LinkifiedText } from "@/components/linkified-text"

export interface Task {
  id: string
  name: string
  notes?: string
  pomodoroCount: number
  completedPomodoros: number
  completed: boolean
  completedAt?: Date
  /** 有值表示今日待办，null/undefined 表示未来待办 */
  createdAt?: Date | null
  /** 本地修改后未成功写入 Supabase 时为 false；云端拉取或 upsert 成功为 true */
  is_synced?: boolean
  /** 用于与云端 updated_at 比对合并；本地编辑时应更新 */
  updatedAt?: Date
  /** 与 Supabase sort_order 对应，用于合并后排序 */
  sortOrder?: number
}

interface TaskListProps {
  /** 所有任务（今日+未来），组件内按 createdAt 拆成今日待办 / 未来待办 */
  tasks: Task[]
  totalTaskCount?: number
  completedPomodoros?: number
  totalPomodoros?: number
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (tasks: Task[]) => void
  onSelectTask: (task: Task) => void
  onEditTask: (task: Task) => void
  /** 今日待办 → 调整到未来待办 */
  onMoveToFuture?: (id: string) => void
  /** 未来待办 → 添加到今日待办（追加到今日最后） */
  onAddToToday?: (id: string) => void
  selectedTaskId?: string
}

const CARD_COLORS = [
  { bg: "bg-white", border: "border-violet-200/60", shadow: "neumorphic-convex" },
  { bg: "bg-white", border: "border-sky-200/60", shadow: "neumorphic-convex" },
  { bg: "bg-white", border: "border-emerald-200/60", shadow: "neumorphic-convex" },
  { bg: "bg-white", border: "border-amber-200/60", shadow: "neumorphic-convex" },
]

export function TaskList({
  tasks,
  totalTaskCount: totalTaskCountProp,
  completedPomodoros = 0,
  totalPomodoros = 0,
  onToggleComplete,
  onDelete,
  onReorder,
  onSelectTask,
  onEditTask,
  onMoveToFuture,
  onAddToToday,
  selectedTaskId,
}: TaskListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSortMode, setIsSortMode] = useState(false)
  const [newTaskId, setNewTaskId] = useState<string | null>(null)
  const [actionsTaskId, setActionsTaskId] = useState<string | null>(null)
  /** 仅用于浮动卡首次渲染位置，拖拽中通过 ref 直接改 DOM 避免卡顿 */
  const [initialDragPosition, setInitialDragPosition] = useState<{ x: number; y: number } | null>(null)
  const prevTasksRef = React.useRef<Task[]>(tasks)
  const listRef = React.useRef<HTMLDivElement>(null)
  const floatingCardRef = React.useRef<HTMLDivElement>(null)
  const dropIndicatorRef = React.useRef<HTMLDivElement>(null)
  /** 落点索引仅存 ref，拖拽过程不 setState 避免卡顿 */
  const dragOverIndexRef = React.useRef<number | null>(null)
  /** 用于隐藏原生拖拽图（仅显示自定义浮动卡） */
  const dragImageRef = React.useRef<HTMLDivElement>(null)
  const actionsTask = tasks.find((t) => t.id === actionsTaskId) ?? null

  // Detect new task added：仅当确实新增了 1 个任务时才播放入场动画，避免完成番茄/休息时误触发闪烁
  useEffect(() => {
    const prev = prevTasksRef.current
    const prevIds = new Set(prev.map(t => t.id))
    const added = tasks.filter(t => !prevIds.has(t.id))
    const newTask = added.length === 1 ? added[0] : null
    
    if (newTask && !newTask.completed) {
      setNewTaskId(newTask.id)
      const timer = setTimeout(() => setNewTaskId(null), 500)
      prevTasksRef.current = tasks
      return () => clearTimeout(timer)
    }
    
    prevTasksRef.current = tasks
  }, [tasks])

  // Get today's date at midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 今日待办：未完成且存在 createdAt
  const activeTasks = tasks.filter((t) => !t.completed && t.createdAt != null)
  // 今日已完成：已完成且完成日是今天
  const todayCompletedTasks = tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false
    const completedDate = new Date(t.completedAt)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() === today.getTime()
  })
  // 未来待办：未完成且无 createdAt
  const futureTasks = tasks.filter((t) => !t.completed && (t.createdAt == null || t.createdAt === undefined))

  const updateDropIndicator = (clientY: number, draggedIdx: number | null) => {
    if (!listRef.current || !dropIndicatorRef.current) return
    const items = listRef.current.querySelectorAll('[data-task-item]')
    if (items.length === 0) return
    let dropIndex = items.length
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      const mid = r.top + r.height / 2
      if (clientY < mid) {
        dropIndex = i
        break
      }
      if (clientY <= r.bottom) {
        dropIndex = i + 1
        break
      }
    }
    dragOverIndexRef.current = dropIndex
    if (dropIndex === draggedIdx) {
      dropIndicatorRef.current.style.display = "none"
      return
    }
    const listRect = listRef.current.getBoundingClientRect()
    if (dropIndex < items.length) {
      const r = items[dropIndex].getBoundingClientRect()
      dropIndicatorRef.current.style.display = "block"
      dropIndicatorRef.current.style.top = `${r.top - 2}px`
      dropIndicatorRef.current.style.left = `${listRect.left}px`
      dropIndicatorRef.current.style.width = `${listRect.width}px`
    } else {
      const r = items[items.length - 1].getBoundingClientRect()
      dropIndicatorRef.current.style.display = "block"
      dropIndicatorRef.current.style.top = `${r.bottom - 2}px`
      dropIndicatorRef.current.style.left = `${listRect.left}px`
      dropIndicatorRef.current.style.width = `${listRect.width}px`
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (dragImageRef.current) e.dataTransfer.setDragImage(dragImageRef.current, 0, 0)
    setDraggedIndex(index)
    setInitialDragPosition({ x: e.clientX, y: e.clientY })
    dragOverIndexRef.current = null
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", "")
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    if (floatingCardRef.current) {
      floatingCardRef.current.style.left = `${e.clientX}px`
      floatingCardRef.current.style.top = `${e.clientY}px`
    }
    updateDropIndicator(e.clientY, draggedIndex)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnd = () => {
    const dropIndex = dragOverIndexRef.current
    if (draggedIndex !== null && dropIndex !== null && draggedIndex !== dropIndex) {
      const newTasks = [...activeTasks]
      const [draggedItem] = newTasks.splice(draggedIndex, 1)
      const insertAt = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
      newTasks.splice(insertAt, 0, draggedItem)
      const completedTasks = tasks.filter((t) => t.completed)
      onReorder([...newTasks, ...completedTasks, ...futureTasks])
    }
    setDraggedIndex(null)
    setInitialDragPosition(null)
    dragOverIndexRef.current = null
    if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none"
  }

  const handleDragLeave = () => {
    dragOverIndexRef.current = null
    if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none"
  }

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isSortMode) return
    setDraggedIndex(index)
    const ty = e.touches[0].clientY
    const tx = e.touches[0].clientX
    const x = listRef.current
      ? listRef.current.getBoundingClientRect().left + listRef.current.getBoundingClientRect().width / 2
      : tx
    setInitialDragPosition({ x, y: ty })
    lastDragOverIndexRef.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || !isSortMode) return
    e.preventDefault()
    const touchY = e.touches[0].clientY
    const touchX = e.touches[0].clientX
    if (floatingCardRef.current) {
      const x = listRef.current ? listRef.current.getBoundingClientRect().left + listRef.current.getBoundingClientRect().width / 2 : touchX
      floatingCardRef.current.style.left = `${x}px`
      floatingCardRef.current.style.top = `${touchY}px`
    }
    updateDropIndicator(touchY, draggedIndex)
  }

  const handleTouchEnd = () => {
    const dropIndex = dragOverIndexRef.current
    if (draggedIndex !== null && dropIndex !== null && draggedIndex !== dropIndex) {
      const newTasks = [...activeTasks]
      const [draggedItem] = newTasks.splice(draggedIndex, 1)
      const insertAt = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
      newTasks.splice(insertAt, 0, draggedItem)
      const completedTasks = tasks.filter((t) => t.completed)
      onReorder([...newTasks, ...completedTasks, ...futureTasks])
    }
    setDraggedIndex(null)
    setInitialDragPosition(null)
    dragOverIndexRef.current = null
    if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none"
  }

  // 排序模式下不再锁定 body 滚动，仅从把手拖拽时才改顺序，其余区域可正常滑动

  const renderTaskCard = (task: Task, index: number, isCompleted: boolean) => {
    const colorConfig = CARD_COLORS[index % CARD_COLORS.length]
    const isSelected = selectedTaskId === task.id
    const isDragging = draggedIndex === index
    const hasNotes = task.notes && task.notes.trim().length > 0
    const isNewTask = task.id === newTaskId

    return (
      <div
        key={task.id}
        data-task-item
        onClick={() => !isCompleted && !isSortMode && onSelectTask(task)}
        className={cn(
          "rounded-2xl pl-4 pr-2 py-3.5 transition-all duration-200 shadow-sm shadow-stone-200/50",
          isCompleted 
            ? "bg-amber-50/90 border border-amber-200/60" 
            : cn(colorConfig.bg, "border-2", isSelected && !isSortMode ? colorConfig.border : "border-stone-200/70"),
          !isCompleted && !isSortMode && "cursor-pointer",
          isDragging && "opacity-0 min-h-[56px]",
          isSortMode && !isCompleted && "cursor-default",
          isNewTask && "animate-in slide-in-from-bottom-4 fade-in duration-300"
        )}
      >
        <div className="flex items-center gap-1 min-h-[2.5rem]">
          <div className="flex min-w-0 flex-1 items-center pr-0.5">
            <div className="min-w-0 max-w-full">
              <p className={cn(
                "font-medium break-words leading-normal",
                isCompleted ? "text-black" : "text-stone-800"
              )}>
                {task.name}
              </p>
              {hasNotes && (
                <p className={cn(
                  "mt-1 max-w-full text-sm leading-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                  isCompleted ? "text-stone-600" : "text-stone-500"
                )}>
                  <LinkifiedText text={task.notes!} />
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-stone-500 flex-shrink-0 w-[3.5rem] justify-end">
            <span className="font-medium">
              {task.completedPomodoros}/{task.pomodoroCount}
            </span>
            <span className="text-base">🍅</span>
          </div>

          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            {isSortMode && !isCompleted ? (
              <div
                className="flex items-center justify-center cursor-grab active:cursor-grabbing p-1 touch-none"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onTouchStart={(e) => {
                  e.preventDefault()
                  handleTouchStart(e, index)
                }}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <GripVertical size={20} className="text-stone-400" />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActionsTaskId(task.id)
                }}
                className="p-2 rounded-xl hover:bg-stone-100/80 transition-colors min-h-[2.25rem] flex items-center justify-center"
              >
                <MoreVertical size={22} className="text-stone-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const totalTaskCount = activeTasks.length + todayCompletedTasks.length

  if (totalTaskCount === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🍅</div>
        <p className="text-foreground font-medium">还没有任务</p>
        <p className="text-sm text-muted-foreground mt-1">点击下方按钮添加任务</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={dragImageRef}
        className="absolute w-px h-px opacity-0 pointer-events-none -left-[9999px]"
        aria-hidden
      />
      <TaskActionsSheet
        isOpen={!!actionsTaskId}
        onClose={() => setActionsTaskId(null)}
        task={actionsTask}
        onComplete={onToggleComplete}
        onEdit={onEditTask}
        onDelete={onDelete}
        onMoveToFuture={onMoveToFuture}
        onAddToToday={onAddToToday}
      />
      <div
        ref={listRef}
        className="flex flex-col gap-3"
        onDragOver={handleDragOver}
      >
      {/* Header: 今日待办 - 新拟态柔和色 */}
      <div className="flex items-center justify-between my-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-stone-800">今日待办</h2>
          <span className="text-xs text-stone-500">
            {totalTaskCountProp ?? totalTaskCount}个任务 已完成{completedPomodoros}/{totalPomodoros}🍅
          </span>
        </div>
        <button
          onClick={() => setIsSortMode(!isSortMode)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            isSortMode 
              ? "bg-emerald-100 text-emerald-600" 
              : "bg-stone-100 text-stone-500 hover:text-stone-600"
          )}
        >
          <ArrowUpDown size={14} className="text-stone-500" />
          {isSortMode ? "完成" : "排序"}
        </button>
      </div>

      {/* Active tasks - 始终用原列表渲染，拖拽时仅用 ref 更新浮动卡与落点线，不重建 DOM 避免卡顿 */}
      {activeTasks.map((task, index) => renderTaskCard(task, index, false))}

      {/* 拖拽中：浮动卡 + 落点指示线，均通过 ref 更新位置，不触发重渲染 */}
      {isSortMode && draggedIndex !== null && initialDragPosition && (
        <>
          <div
            ref={floatingCardRef}
            className="fixed z-50 pointer-events-none w-[calc(100vw-2.5rem)] max-w-[calc(theme(maxWidth.md)-2rem)]"
            style={{
              left: initialDragPosition.x,
              top: initialDragPosition.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            {(() => {
              const task = activeTasks[draggedIndex]
              if (!task) return null
              const colorConfig = CARD_COLORS[draggedIndex % CARD_COLORS.length]
              return (
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3.5 border-2 shadow-lg",
                    colorConfig.bg,
                    "shadow-md",
                    colorConfig.shadow
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium break-words text-foreground">{task.name}</p>
                      {task.notes?.trim() && (
                        <p className="mt-1 max-w-full line-clamp-2 text-sm text-foreground/60 break-words [overflow-wrap:anywhere]">
                          <LinkifiedText text={task.notes} />
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-foreground/60 flex-shrink-0">
                      {task.completedPomodoros}/{task.pomodoroCount} 🍅
                    </div>
                    <div className="flex-shrink-0 p-1">
                      <GripVertical size={20} className="text-foreground/40" />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          <div
            ref={dropIndicatorRef}
            className="fixed z-40 h-0.5 bg-primary/80 rounded-full pointer-events-none"
            style={{ display: "none" }}
          />
        </>
      )}
      
      {/* Today's completed tasks - Hidden in sort mode */}
      {!isSortMode && todayCompletedTasks.length > 0 && (
        <>
          {activeTasks.length > 0 && (
            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">今日已完成</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {todayCompletedTasks.map((task, index) => renderTaskCard(task, index, true))}
        </>
      )}

      {/* 未来待办 - 未完成且无 createdAt，标题与今日待办一致：居左、黑色；卡片统一浅蓝，仅右侧「…」打开浮层 */}
      {!isSortMode && futureTasks.length > 0 && (
        <>
          <div className="flex items-center gap-2 my-1.5 mt-4">
            <h2 className="text-xl font-semibold text-foreground">未来待办</h2>
            <span className="text-xs text-muted-foreground">{futureTasks.length}个任务</span>
          </div>
          <div className="flex flex-col gap-3">
            {futureTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl px-4 py-3.5 border-2 border-blue-200/60 bg-blue-50 shadow-md shadow-blue-200/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium break-words text-foreground">{task.name}</p>
                    {task.notes?.trim() && (
                      <p className="mt-1 max-w-full line-clamp-2 overflow-hidden text-ellipsis whitespace-pre-wrap break-words text-sm text-foreground/60 [overflow-wrap:anywhere]">
                        <LinkifiedText text={task.notes} />
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setActionsTaskId(task.id)}
                    className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-blue-100/80 hover:text-foreground transition-colors"
                    aria-label="更多操作"
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </>
  )
}
