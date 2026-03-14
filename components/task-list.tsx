"use client"

import React, { useState, useEffect } from "react"
import { MoreVertical, ArrowUpDown, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskActionsSheet } from "@/components/task-actions-sheet"

export interface Task {
  id: string
  name: string
  notes?: string
  pomodoroCount: number
  completedPomodoros: number
  completed: boolean
  completedAt?: Date
}

interface TaskListProps {
  tasks: Task[]
  totalTaskCount?: number
  completedPomodoros?: number
  totalPomodoros?: number
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (tasks: Task[]) => void
  onSelectTask: (task: Task) => void
  onEditTask: (task: Task) => void
  selectedTaskId?: string
}

const CARD_COLORS = [
  { bg: "bg-pink-50", border: "border-pink-300", shadow: "shadow-pink-200/50" },
  { bg: "bg-blue-50", border: "border-blue-300", shadow: "shadow-blue-200/50" },
  { bg: "bg-emerald-50", border: "border-emerald-300", shadow: "shadow-emerald-200/50" },
  { bg: "bg-amber-50", border: "border-amber-300", shadow: "shadow-amber-200/50" },
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
  selectedTaskId,
}: TaskListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSortMode, setIsSortMode] = useState(false)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null)
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

  // Detect new task added
  useEffect(() => {
    const prevIds = new Set(prevTasksRef.current.map(t => t.id))
    const newTask = tasks.find(t => !prevIds.has(t.id) && !t.completed)
    
    if (newTask) {
      setNewTaskId(newTask.id)
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setNewTaskId(null)
      }, 500)
      return () => clearTimeout(timer)
    }
    
    prevTasksRef.current = tasks
  }, [tasks])

  // Get today's date at midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter tasks: uncompleted + completed today
  const activeTasks = tasks.filter((t) => !t.completed)
  const todayCompletedTasks = tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false
    const completedDate = new Date(t.completedAt)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() === today.getTime()
  })

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
      onReorder([...newTasks, ...completedTasks])
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
    setTouchStartY(ty)
    setTouchCurrentY(ty)
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
    setTouchCurrentY(touchY)
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
      onReorder([...newTasks, ...completedTasks])
    }
    setDraggedIndex(null)
    setTouchStartY(null)
    setTouchCurrentY(null)
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
          "rounded-2xl px-4 py-3.5 transition-all duration-200 border-2",
          isCompleted 
            ? "bg-white border-border/30 shadow-sm" 
            : cn(colorConfig.bg, "shadow-md", colorConfig.shadow),
          !isCompleted && (!isSelected || isSortMode) && "border-transparent",
          !isCompleted && !isSortMode && "cursor-pointer",
          isSelected && !isCompleted && !isSortMode && cn(
            colorConfig.border,
            "shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.08),4px_4px_8px_rgba(0,0,0,0.1)]"
          ),
          isDragging && "opacity-0 min-h-[56px]",
          isSortMode && !isCompleted && "cursor-default",
          isNewTask && "animate-in slide-in-from-bottom-4 fade-in duration-300"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Task Info */}
          <div className="flex-1 min-w-0 pr-2 flex items-center">
            <div>
              <p className={cn(
                "font-medium break-words leading-normal",
                isCompleted ? "text-muted-foreground" : "text-foreground"
              )}>
                {task.name}
              </p>
              {hasNotes && (
                <p className={cn(
                  "text-sm mt-1 whitespace-pre-wrap break-words leading-normal",
                  isCompleted ? "text-muted-foreground/60" : "text-foreground/60"
                )}>
                  {task.notes}
                </p>
              )}
            </div>
          </div>

          {/* Pomodoro Count */}
          <div className="flex items-center gap-1 text-sm text-foreground/60 flex-shrink-0">
            <span className="font-medium">
              {task.completedPomodoros}/{task.pomodoroCount}
            </span>
            <span className="text-base">🍅</span>
          </div>

          {/* Sort Mode: 仅把手可拖拽，卡片其余区域可正常滑动 */}
          {isSortMode && !isCompleted && (
            <div
              className="flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing p-1 touch-none"
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
              <GripVertical size={20} className="text-foreground/40" />
            </div>
          )}

          {/* 操作入口 - 点击打开浮层：完成任务 / 修改任务 / 删除任务 */}
          {!isSortMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActionsTaskId(task.id)
              }}
              className="p-2.5 -m-1 rounded-xl hover:bg-foreground/5 transition-colors flex-shrink-0"
            >
              <MoreVertical size={22} className="text-foreground/40" />
            </button>
          )}
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
      />
      <div
        ref={listRef}
        className="flex flex-col gap-3"
        onDragOver={handleDragOver}
      >
      {/* Header: 今日待办 + n个任务 已完成x/y🍅 在左侧，排序在右侧 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">今日待办</h2>
          <span className="text-xs text-muted-foreground">
            {totalTaskCountProp ?? totalTaskCount}个任务 已完成{completedPomodoros}/{totalPomodoros}🍅
          </span>
        </div>
        <button
          onClick={() => setIsSortMode(!isSortMode)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
            isSortMode 
              ? "bg-pink-100 text-pink-600" 
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowUpDown size={14} />
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
                        <p className="text-sm text-foreground/60 mt-1 line-clamp-2">{task.notes}</p>
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
    </div>
    </>
  )
}
